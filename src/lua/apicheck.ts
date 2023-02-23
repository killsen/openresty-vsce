import * as vscode from 'vscode';

import * as ngx from './ngx';
import { loadModuleByCode } from './modLoader';
import { callFunc } from './modFunc';

// 类型检查缓存
const CACHE = new Map<string, vscode.Diagnostic[]>();

/** 清除类型检查缓存 */
export function cleanLints(fileName: string) {
    CACHE.delete(fileName);
}

/** 注册 ApiCheck */
export function registerApiCheck(context: vscode.ExtensionContext) {

    const collection = vscode.languages.createDiagnosticCollection('lua');
    const selector = { language: 'lua', scheme: 'file' };
    const subscriptions = context.subscriptions;

    function onDidClose (document: vscode.TextDocument) {
        if (!vscode.languages.match(selector, document)) {return;}
        collection.set(document.uri, []);
    }

    function onDidChange (document: vscode.TextDocument) {
        if (!vscode.languages.match(selector, document)) {return;}
        CACHE.delete(document.fileName);
        collection.set(document.uri, []);
    }

    function lint (document: vscode.TextDocument) {
        if (!vscode.languages.match(selector, document)) {return;}

        const { uri, fileName } = document;

        let ctx = ngx.getPath(fileName);
        ctx.fileName = fileName + ".editing";  // 正在编辑中的文件

        if (CACHE.has(fileName)) {
            collection.set(uri, CACHE.get(fileName));
            return;
        }

        let $lints: any[] = [];
        let $funcs: any[] = [];
        let docText = document.getText();

        loadModuleByCode(ctx, docText, "", $lints, $funcs);

        $funcs.forEach(f => {
            if (!f["$runned"]) {
                f["$runned"] = true;
                callFunc(f);
            }
        });

        CACHE.set(fileName, $lints);
        collection.set(uri, $lints);
    }

    vscode.workspace.onDidOpenTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidSaveTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidCloseTextDocument(document => onDidClose(document), null, subscriptions);
    vscode.workspace.onDidChangeTextDocument(change => onDidChange(change.document), null, subscriptions);
    vscode.window.onDidChangeActiveTextEditor(editor => editor && lint(editor.document), null, subscriptions);

    if (vscode.window.activeTextEditor) {
        lint(vscode.window.activeTextEditor.document);
    }

}
