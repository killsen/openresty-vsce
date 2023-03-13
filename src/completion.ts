
import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import { LuaObject } from './lua/types';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { loadFileItems } from './fileItems';
import { importFiles } from './importFiles';
import { getUpValues } from './lua/upValues';
import { getHoverText } from "./hover";

/** 代码补全 */
export function loadItems(doc: vscode.TextDocument, pos: vscode.Position, tok: vscode.CancellationToken) {

    // 取得nginx路径
    let ctx = ngx.getPath(doc.fileName);
    if (!ctx.ngxPath) { return; }

    // 导入文件
    let files = importFiles(doc, pos, tok);
    if (files) { return files; }

    // 加载模块文件
    let fileItems = loadFileItems(doc, pos, tok);
    if (fileItems) { return fileItems; }

    // 取得上量或成员变量
    let _g = getUpValues(doc, pos);
    if (!_g) { return; }

    let items: CompletionItem[] = [];
    loadKeys(items, _g, "", 0);
    return items;

}

/** 生成补全项目 */
export function loadKeys(items: CompletionItem[], t: LuaObject, pkey: string, level = 0, isTypes = false) {
    if (!t) { return; }

    Object.keys(t).forEach(k => {

        // 不以字母或下划线开头的不输出
        if (!k.match(/^[a-zA-Z_]/)) {
            return;
        }

        let c = t[k];

        // 自定义类型声明补全
        if (isTypes && c) {
            const doc = c.doc || "```lua\n(type) " + k + "\n```\n自定义类型";
            return items.push({
                label: pkey + k,
                documentation: new vscode.MarkdownString(doc),
                kind: CompletionItemKind.Interface
            });
        }

        let documentation = getHoverText(k, t);

        if (!(c instanceof Object)) {
            return items.push({
                label: pkey + k,
                documentation,
                kind: CompletionItemKind.Value // 变量
            });
        }

        if (c.type === "keyword") {
            items.push({
                label: pkey + k,
                kind: CompletionItemKind.Keyword, // 关键字
                documentation,
            });
            return;
        }

        if (c.type === "lib" || c.type === "api") {
            items.push({
                label: pkey + k,
                kind: CompletionItemKind.Module, // 模块
                documentation,
            });
            return;
        }

        let hasProp = c["."] instanceof Object && Object.keys(c["."]).length>0;
        let hasFunc = c[":"] instanceof Object && Object.keys(c[":"]).length>0;
        let hasArgs = c.args || typeof c["()"] === "function" || c["()"] instanceof Array;

        if (hasProp || hasFunc) {
            items.push({
                label: pkey + k,
                kind: CompletionItemKind.Module, // 模块
                commitCharacters: [".", ":"],
                documentation,
            });
        }

        if (hasArgs) {
            items.push({
                filterText: pkey + k,
                label: pkey + k + (c.args || "()"),
                insertText: pkey + k,
                kind: CompletionItemKind.Method, // 函数
                commitCharacters: ["(", "{"],
                documentation,
            });
        }

        if (!hasProp && !hasFunc && !hasArgs) {
            items.push({
                label: pkey + k,
                kind: CompletionItemKind.Variable, // 变量
                documentation,
            });
        }
    });
}

