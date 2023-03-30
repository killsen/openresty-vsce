

import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import * as http from 'http';
import { join } from 'path';

// # 请在 nginx.conf 配置文件中加入调试路径:
// location = /debug {
//     content_by_lua "loadfile(ngx.var.http_debugger)()";
// }

const DEBUGGER_FILE = join(__dirname, "..", "lua_types", "debugger.lua");

const PRINT_LOCAL = ' do ( _G._PRINT_LOCAL_ or require "app.comm.debuger".debug ) (                      ) end ';
const PRINT_VALUE = ' do ( _G._PRINT_VALUE_ or require "app.comm.debuger".watch ) ([===[word]===], {word}) end ';

/* eslint-disable no-undef */
let LAST_TIMER      : NodeJS.Timer       | undefined;
let LAST_REQUEST    : http.ClientRequest | undefined;
let LAST_SUBMIT     = 0;

/** 执行 action */
export function openrestyAction () {
    LAST_TIMER && clearTimeout(LAST_TIMER);
    LAST_TIMER = setTimeout(() => openrestyRun(true), 300);
}

/** 执行 debug */
export function openrestyDebug () {
    LAST_TIMER && clearTimeout(LAST_TIMER);
    LAST_TIMER = setTimeout(() => openrestyRun(false), 300);
}

/** 上传代码并执行 */
async function openrestyRun(isAction: boolean) {

    let editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    let doc = editor.document;
    let codes = doc.getText();
    if (!codes.trim()) {return;}

    let path = '';
    let fileName = doc.fileName;

    let { appName, modName } = ngx.getPath(fileName);
    if ( appName && modName.startsWith("act.")) {
        modName = modName.substring(4);
        path = `/${appName}/${modName}.jsony`;  // 改变请求路径
    }

    if (isAction) {
        await editor.document.save();  // 自动保存
        httpRequest(path, "", appName, modName, fileName, "");
        return;
    }

    let text = doc.getText(editor.selection);
    let line = doc.lineAt(editor.selection.end.line);
    let startOffset = doc.offsetAt(line.range.end);
    let endOffset = doc.offsetAt(line.range.end);

    if (text) {
        text = PRINT_VALUE.replace(/(word)/g, text);
    } else {
        text = PRINT_LOCAL;
    }

    codes = [
        codes.substring(0, startOffset), text,
        codes.substring(endOffset)
    ].join("\n");

    httpRequest(path, codes, appName, modName, fileName, "lua");

}

/** 请求服务器 */
async function httpRequest(path: string, codes: string,
    appName: string, modName: string, fileName: string, languageId: string){

    if (LAST_REQUEST && !LAST_REQUEST.destroyed) {
        const confirm = await vscode.window.showWarningMessage(
            "上个请求尚未完成，确定要撤销并继续？",
            { modal: true },
            "继续"
        );
        if (confirm !== "继续") {return;}

        LAST_REQUEST.destroy();
        LAST_REQUEST = undefined;
        vscode.window.showInformationMessage("上个请求已撤销");
    }

    const conf = vscode.workspace.getConfiguration("openresty");
    const uri = conf.get<string>("debug.url") || "http://127.0.0.1/debug";
    const url = new URL(uri);

    if (path) {
        url.pathname = path;  // 修改请求路径，不再使用默认路径
        url.search   = "";
        url.hash     = "";
    }

    let opt: http.RequestOptions = {
        protocol: url.protocol,
        host    : url.host,
        hostname: url.hostname,
        port    : url.port,
        path    : `${ url.pathname }${ url.search }${ url.hash }`,
        method  : codes ? "POST" : "GET",
        headers : {
            "user-agent" : "sublime",  // 历史遗留问题，后续将改为 vscode
            "app-name"   : appName,
            "mod-name"   : modName,
            "file-name"  : fileName,
            "debugger"   : DEBUGGER_FILE,
        }
    };

    let currSubmit = LAST_SUBMIT = LAST_SUBMIT + 1;
    let contents: string[] = [];
    let chunkSize = 0;

    let doc = await openDocument();
    if (!doc) {return;}

    // 延时输出
    let timer: NodeJS.Timer | undefined;
    function showDocument() {
        timer && clearTimeout(timer);
        timer = setTimeout(() => {
            if (!doc || doc.isClosed) { return; }
            const content = contents.join("");
            insertDocument(doc, content, languageId);
        }, 50);
    }

    function showMsg(msg: string) {
        vscode.window.setStatusBarMessage(`请求: ${ url.toString() }  ( ${ msg } )`);
    }

    showMsg("连接中");
    showDocument();

    const beginTime = (new Date()).getTime();

    const req = LAST_REQUEST = http.request(opt, async (res) => {

        if ( isClosed() ) { return; }

        showMsg(res.statusMessage || "接收中");

        res.setEncoding('utf8');

        languageId = languageId || getlanguageId(res.headers);
        showDocument();

        res.on('data', async (chunk: string) => {
            if ( isClosed() ) { return; }
            chunkSize += chunk.length;
            showMsg(`已接收 ${ chunkSize }`);
            contents.push(chunk);
            showDocument();
        });

        res.on('end', () => {
            if ( isClosed() ) { return; }
            const endTime = (new Date()).getTime();
            showMsg(`用时 ${ endTime - beginTime } ms, 共 ${ chunkSize } byte`);
            if (!chunkSize) {
                contents.push("Response Body       : None\n");
                contents.push("Request  Begin      : ", (beginTime/1000).toString(), "\n");
                contents.push("Response End        : ", (endTime/1000).toString(), "\n");
                contents.push("Request  Time       : ", (endTime - beginTime).toString(), " ms\n\n");
                contents.push("Response Headers    :\n");
                contents.push("---------------------------------------------------\n");
                res.rawHeaders.forEach((s, i) => {
                    contents.push(s);
                    if (i % 2 === 0) {
                        if (s.length<20) {
                            contents.push(" ".repeat(20-s.length));
                        }
                        contents.push(": ");
                    } else {
                        contents.push("\n");
                    }
                });
                showDocument();
            }
        });
    });

    req.on('error', (e) => {
        if ( isClosed() ) { return; }
        vscode.window.showInformationMessage(e.message);
        showMsg(`出错啦`);
    });

    function isClosed() {
        if (currSubmit !== LAST_SUBMIT) {
            req.destroy();
            return true;
        }else if (!doc || doc.isClosed) {
            req.destroy();
            vscode.window.showInformationMessage("本次请求已撤销");
            showMsg("已撤销");
            return true;
        } else {
            return false;
        }
    }

    req.write(codes);
    req.end();

}

/** 取得语言编码 */
function getlanguageId(headers: http.IncomingHttpHeaders) {

    let language = headers["language"];

    if (language instanceof Array) {
        return language[0];

    } else if (typeof language === "string") {
        return language;

    } else {
        let type = headers["content-type"] || "";
              if (type.includes("javascript")) { return "javascript";
        }else if (type.includes("json")) { return "json";
        }else if (type.includes("html")) { return "html";
        }else if (type.includes("xml")) { return "xml";
        }else{ return "plaintext"; }
    }

}

/** 打开文档 */
async function openDocument(content?: string, language?: string) {

    try {
        let editor = vscode.window.visibleTextEditors.find(editor=>{
            return editor.viewColumn === 2 &&
                editor.document.isUntitled;
        });

        if (editor) {return editor.document;}

        let doc = await vscode.workspace.openTextDocument({
            language,
            content,
        });

        editor = await vscode.window.showTextDocument(doc, {
            viewColumn : vscode.ViewColumn.Two,
            preserveFocus : true,
            preview : true,
        });

        return doc;

    } catch (e) {
        console.log(e);
    }

}

/** 输出文档 */
async function insertDocument(doc: vscode.TextDocument ,content: string, languageId: string) {

    try {
        if (languageId && doc.languageId !== languageId) {
            vscode.languages.setTextDocumentLanguage(doc, languageId);
        }

        let editor = await vscode.window.showTextDocument(doc, {
            viewColumn : vscode.ViewColumn.Two,
            preserveFocus : true,
            preview : true,
        });

        await editor.edit(edit=>{
            let start = new vscode.Position(0, 0);
            let line = doc.lineAt(doc.lineCount-1);
            let end = new vscode.Position(line.range.end.line, line.range.end.character);
            edit.delete(new vscode.Range(start, end));
            edit.insert(start, content);
        });
    } catch (e) {
        console.log(e);
    }

}
