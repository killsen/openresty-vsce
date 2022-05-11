"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const completion_1 = require("./completion");
const filelink_1 = require("./filelink");
const hover_1 = require("./hover");
const docSymbos_1 = require("./docSymbos");
const signature_1 = require("./signature");
const command_1 = require("./command");
const selector = [{ scheme: 'file', language: "lua", pattern: '**/nginx/**' }];
function activate(context) {
    /** 文件跳转 */
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, { provideDefinition: filelink_1.getFileLink }));
    /** 悬停提示 */
    context.subscriptions.push(vscode.languages.registerHoverProvider(selector, { provideHover: hover_1.getHover }));
    /** 参数提示 */
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(selector, { provideSignatureHelp: signature_1.getSignature }, "(", ",", "{"));
    /** 代码补全 */
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, { provideCompletionItems: completion_1.loadItems }, '.', ':', "$", "#", "%", "@"));
    /** 文档大纲 */
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, { provideDocumentSymbols: docSymbos_1.loadDocSymbols }));
    /** 注册命令 */
    context.subscriptions.push(vscode.commands.registerCommand('openresty.debug', command_1.openrestyDebug));
    context.subscriptions.push(vscode.commands.registerCommand('openresty.action', command_1.openrestyAction));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map