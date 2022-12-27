import * as vscode from 'vscode';

import * as ngx from './ngx';
import { loadModuleByCode } from './modLoader';
import { callFunc } from './modFunc';


/** 注册 ApiCheck */
export function registerApiCheck(context: vscode.ExtensionContext) {

    const collection = vscode.languages.createDiagnosticCollection('lua');
    const selector = { language: 'lua', scheme: 'file' };
    const subscriptions = context.subscriptions;

    function clear (document: vscode.TextDocument) {
        if (vscode.languages.match(selector, document)) {
            const uri = document.uri;
            collection.set(uri, []);
        }
    }

    function lint (doc: vscode.TextDocument) {
        if (!vscode.languages.match(selector, doc)) {return;}

        const uri = doc.uri;
        const diagnostics: vscode.Diagnostic[] = [];

        let ctx = ngx.getPath(doc.fileName);
        ctx.fileName = doc.fileName + ".editing";  // 正在编辑中的文件

        let $lints: any[] = [];
        let $funcs: any[] = [];
        let docText = doc.getText();

        loadModuleByCode(ctx, docText, "", $lints, $funcs);

        $funcs.forEach(f => {
            if (!f["$runned"]) {
                f["$runned"] = true;
                callFunc(f);
            }
        });

        collection.set(uri, $lints);
    }

    vscode.workspace.onDidOpenTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidSaveTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidCloseTextDocument(document => clear(document), null, subscriptions);
    vscode.workspace.onDidChangeTextDocument(change => clear(change.document), null, subscriptions);
    vscode.window.onDidChangeActiveTextEditor(editor => editor && lint(editor.document), null, subscriptions);

    if (vscode.window.activeTextEditor) {
        lint(vscode.window.activeTextEditor.document);
    }

}
