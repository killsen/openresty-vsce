import * as vscode from 'vscode';
import * as luacheck from './luacheck';
import { DiagnosticProvider } from './diagnostic';

/** 注册LuaCheck */
export function registerLuaCheck(context: vscode.ExtensionContext) {

    luacheck.setExtensionPath(context.extensionPath);

    const collection = vscode.languages.createDiagnosticCollection('lua');
    const selector = { language: 'lua', scheme: 'file' };
    const subscriptions = context.subscriptions;
    const provider = new DiagnosticProvider;

    function clear (document: vscode.TextDocument) {
        if (vscode.languages.match(selector, document)) {
            const uri = document.uri;
            collection.set(uri, []);
        }
    }

    function lint (document: vscode.TextDocument) {
        if (vscode.languages.match(selector, document)) {
            const uri = document.uri;
            provider.provideDiagnostic(document).then((diagnostics) => {
                collection.set(uri, diagnostics);
            });
        }
    }

    vscode.workspace.onDidOpenTextDocument(document => lint(document), null, subscriptions);
    // vscode.workspace.onDidSaveTextDocument(document => lint(document), null, subscriptions);
    vscode.workspace.onDidCloseTextDocument(document => clear(document), null, subscriptions);
    vscode.workspace.onDidChangeTextDocument(change => lint(change.document), null, subscriptions);
    vscode.window.onDidChangeActiveTextEditor(editor => editor && lint(editor.document), null, subscriptions);

    vscode.workspace.onDidChangeConfiguration(() => {
        if (vscode.window.activeTextEditor) {
            lint(vscode.window.activeTextEditor.document);
        }
    }, null, subscriptions);

    if (vscode.window.activeTextEditor) {
        lint(vscode.window.activeTextEditor.document);
    }

}
