
import * as vscode from 'vscode';
import { loadItems } from './completion';
import { getFileLink } from './filelink';
import { getHover } from './hover';
import { loadDocSymbols } from "./docSymbos";
import { getSignature } from './signature';
import { openrestyDebug, openrestyAction } from './command';
import { registerDebuggers } from './debugger';
import { GitHubRepoLink } from './provider/GitHubRepoLink';
import { registerLuaCheck } from './luacheck';
import { registerApiCheck } from "./lua/apicheck";

const selector = [{ scheme: 'file', language: "lua" }];

export function activate(context: vscode.ExtensionContext) {

	/** 文件跳转 */
	context.subscriptions.push(vscode.languages.registerDefinitionProvider(
		selector, { provideDefinition: getFileLink }
	));

	/** 悬停提示 */
	context.subscriptions.push(vscode.languages.registerHoverProvider(
		selector, { provideHover: getHover }
	));

	/** 参数提示 */
	context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(
		selector, { provideSignatureHelp: getSignature }, "(", ",", "{"
	));

	/** 代码补全 */
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
		selector, { provideCompletionItems: loadItems }, '.', ':', "$", "#", "%", "@"
	));

	/** 文档大纲 */
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
		selector, { provideDocumentSymbols: loadDocSymbols }
	));

	/** 注册命令 */
	context.subscriptions.push(vscode.commands.registerCommand('openresty.debug', openrestyDebug));
	context.subscriptions.push(vscode.commands.registerCommand('openresty.action', openrestyAction));

    /** 注册调试器 */
    registerDebuggers(context);

    /** 注册LuaCheck */
    registerLuaCheck(context);

    /** 注册ApiCheck */
    registerApiCheck(context);

    new GitHubRepoLink(context);

}

export function deactivate() {}
