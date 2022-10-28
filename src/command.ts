
import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import * as http from 'http';

const DEBUG_CODE = 'require "app.comm.debuger".debug();';
const WATCH_CODE = 'require "app.comm.debuger".watch(' +
                   '[=========[word]=========], {word});';

let LAST_SUBMIT = 0;

/** 执行 action */
export function openrestyAction () {
    openrestyRun(true);
}

/** 执行 debug */
export function openrestyDebug () {
    openrestyRun(false);
}

/** 上传代码并执行 */
function openrestyRun(isAction: boolean) {

    let editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    let doc = editor.document;
    let codes = doc.getText();
    if (!codes.trim()) {return;}

    let path = '/debug';

    let { appName, modName } = ngx.getPath(doc.fileName);
    if ( appName && modName.startsWith("act.")) {
        modName = modName.substr(4);
        path = `/${appName}/${modName}.jsony`;
    }

    if (isAction) {
        httpRequest(path, codes, appName, modName);
        return;
    }

    let text = doc.getText(editor.selection);
    let line = doc.lineAt(editor.selection.end.line);
    let startOffset = doc.offsetAt(line.range.end);
    let endOffset = doc.offsetAt(line.range.end);

    if (text) {
        text = WATCH_CODE.replace(/(word)/g, text);
    } else {
        text = DEBUG_CODE;
    }

    codes = [
        codes.substring(0, startOffset), text,
        codes.substring(endOffset)
    ].join("\n");

    httpRequest(path, codes, appName, modName, "lua");

}

/** 请求服务器 */
function httpRequest(path: string, codes: string, appName="", modName="", languageId?: string){

    let currSubmit = LAST_SUBMIT = LAST_SUBMIT + 1;

    let opt = {
        host: "127.0.0.1",
        path,
        method: "POST",
        headers: {
            "user-agent" : "sublime",
            "app-name"   : appName,
            "mod-name"   : modName,
        }
    };

    const req = http.request(opt, async (res) => {
        if (currSubmit !== LAST_SUBMIT) { req.destroy(); return; }

        res.setEncoding('utf8');
        let contents: string[] = [];

        res.on('data', async (chunk) => {
            if (currSubmit !== LAST_SUBMIT) { req.destroy(); return; }
            contents.push(chunk);
        });

        res.on('end', () => {
            if (currSubmit !== LAST_SUBMIT) { req.destroy(); return; }
            languageId = languageId || getlanguageId(res.headers);
            openDocument(contents.join(""), languageId);
        });
    });

    req.on('error', (e) => {
        vscode.window.showInformationMessage(e.message);
    });

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

/** 打开文档：输出返回结果 */
async function openDocument(content: string, languageId: string) {

    for (let editor of vscode.window.visibleTextEditors) {
        if (editor.viewColumn === 2){
            editor.edit(editorEdit=>{

                let doc = editor.document;
                let start = new vscode.Position(0, 0);
                let line = doc.lineAt(doc.lineCount-1);
                let end = new vscode.Position(line.range.end.line, line.range.end.character);

                editorEdit.delete(new vscode.Range(start, end));
                editorEdit.insert(start, content);

                vscode.languages.setTextDocumentLanguage(doc, languageId);

            });
            return;
        }
    }

    let doc = await vscode.workspace.openTextDocument({
        language: languageId,
        content,
    });

    vscode.window.showTextDocument(doc, {
        viewColumn : vscode.ViewColumn.Two,
        preserveFocus : true,
        preview : true,
    });

}
