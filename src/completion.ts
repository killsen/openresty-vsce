
import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import { LuaTable } from './lua/types';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { loadFileItems } from './fileItems';
import { importFiles } from './importFiles';
import { getUpValues } from './lua/upValues';
import { getContents } from "./hover";

/** 代码补全 */
export function loadItems(doc: vscode.TextDocument, pos: vscode.Position, tok: vscode.CancellationToken) {

    // 取得nginx路径
    let path = ngx.getPath(doc.fileName);
    if (!path.ngxPath) { return; }

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
export function loadKeys(items: CompletionItem[], t: LuaTable, pkey: string, level = 0) {
    if (!t) { return; }

    Object.keys(t).forEach(k => {

        // 以数字或 $ * 开头的不显示
        if (k.match(/^(\d|\$|\*)/)) { return; }

        let c = t[k];

        let docs = getContents(pkey + k, c).join("\n------\n");
        let documentation = new vscode.MarkdownString(docs);

        if (!(c instanceof Object)) {
            return items.push({
                label: pkey + k,
                documentation,
                kind: CompletionItemKind.Value // 变量
            });
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

