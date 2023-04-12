import * as vscode from 'vscode';

import * as ngx from './ngx';
import { loadModuleByCode } from './modLoader';
import { callFunc } from './modFunc';

import * as fs from 'fs';
import { join } from 'path';

// 类型检查缓存
const CACHE = new Map<string, vscode.Diagnostic[]>();

/** 清除类型检查缓存 */
export function cleanLints(fileName: string) {
    CACHE.delete(fileName);
}

const TIMER = {} as { [key: string]: ReturnType<typeof setTimeout> };

const collection = vscode.languages.createDiagnosticCollection('lua');
const selector = { language: 'lua', scheme: 'file' };

function onDidClose (document: vscode.TextDocument) {
    if (!vscode.languages.match(selector, document)) {return;}
    const { uri, fileName } = document;
    TIMER[fileName] && clearTimeout(TIMER[fileName]);
    collection.set(uri, []);
}

function onDidChange (document: vscode.TextDocument) {
    if (!vscode.languages.match(selector, document)) {return;}
    const { uri, fileName } = document;
    TIMER[fileName] && clearTimeout(TIMER[fileName]);
    CACHE.delete(fileName);
    collection.set(uri, []);
}

function lint (document: vscode.TextDocument) {
    if (!vscode.languages.match(selector, document)) {return;}

    const { uri, fileName } = document;

    if (CACHE.has(fileName)) {
        collection.set(uri, CACHE.get(fileName));
        return;
    }

    TIMER[fileName] && clearTimeout(TIMER[fileName]);
    TIMER[fileName] = setTimeout(() => {
        delete TIMER[fileName];
        lintDelay(document);
    }, 50);  //延时50毫秒进行类型检查
}

function lintDelay (document: vscode.TextDocument) {
    if (!vscode.languages.match(selector, document)) {return;}

    const { uri, fileName } = document;

    if (CACHE.has(fileName)) {
        collection.set(uri, CACHE.get(fileName));
        return;
    }

    let ctx = ngx.getPath(fileName);

    let $lints: any[] = [];
    let $funcs: any[] = [];
    let docText = document.getText();

    loadModuleByCode(ctx, docText, "", $lints, $funcs);

    while ($funcs.length > 0) {
        let f = $funcs.shift();
        if (!f) { break; }
        if (!f["$runned"]) {
            f["$runned"] = true;
            callFunc(f);
        }
    }

    CACHE.set(fileName, $lints);
    collection.set(uri, $lints);
}

/** 注册 ApiCheck */
export function registerApiCheck(context: vscode.ExtensionContext) {

    const subscriptions = context.subscriptions;

    vscode.workspace.onDidOpenTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidSaveTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidCloseTextDocument(document => onDidClose(document), null, subscriptions);
    vscode.workspace.onDidChangeTextDocument(change => onDidChange(change.document), null, subscriptions);
    vscode.window.onDidChangeActiveTextEditor(editor => editor && lint(editor.document), null, subscriptions);

    if (vscode.window.activeTextEditor) {
        lint(vscode.window.activeTextEditor.document);
    }

}

let lintIndex = 0;

/** 类型检查 */
export async function openrestyLint (uri: vscode.Uri) {
    lintIndex = 0;
    lintPath(uri.fsPath, false);
}

/** 清除类型检查 */
export async function openrestyClean (uri: vscode.Uri) {
    lintIndex = 0;
    lintPath(uri.fsPath, true);
}

async function lintPath(pPath: string, cleanLints: boolean) {

    const files = await readdir(pPath);

    for (let name of files) {
        let fPath = join(pPath, name);
        let fStat = fs.statSync(fPath);
        if (fStat.isDirectory()) {
            await lintPath(fPath, cleanLints);
        } else if (fStat.isFile() && name.endsWith(".lua")) {

            const time1 = new Date().getTime();
            await lintFile(fPath, cleanLints);
            const time2 = new Date().getTime();

            if (!cleanLints) {
                lintIndex++;
                const text = `类型检查 #${ lintIndex } - ${ time2 - time1 }ms ：${ fPath }`;
                vscode.window.setStatusBarMessage(text);
            }
        }
    }

}

async function lintFile(fileName: string, cleanLints: boolean) {

    let ctx = ngx.getPath(fileName);
    let uri = vscode.Uri.file(fileName);

    if (cleanLints) {
        CACHE.delete(fileName);
        collection.set(uri, []);
        return;
    }

    let $lints: any[] = [];
    let $funcs: any[] = [];
    let codes = await readFile(fileName);

    loadModuleByCode(ctx, codes, "", $lints, $funcs);

    while ($funcs.length > 0) {
        let f = $funcs.shift();
        if (!f) { break; }
        if (!f["$runned"]) {
            f["$runned"] = true;
            callFunc(f);
        }
    }

    CACHE.set(fileName, $lints);
    collection.set(uri, $lints);
}

async function readdir(pPath: string) : Promise<string[]> {

    return new Promise( (resolve) => {
        try {
            fs.readdir(pPath, (err, files) => {
                resolve(files);
            });
        } catch (e) {
            resolve([]);
        }
    });

}

async function readFile(fileName: string) : Promise<string> {

    return new Promise( (resolve) => {
        try {
            fs.readFile(fileName, (err, data) => {
                resolve(data.toString());
            });
        } catch (e) {
            resolve("");
        }
    });

}
