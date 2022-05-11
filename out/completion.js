"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadKeys = exports.loadItems = void 0;
const vscode = require("vscode");
const ngx = require("./lua/ngx");
const vscode_1 = require("vscode");
const fileItems_1 = require("./fileItems");
const importFiles_1 = require("./importFiles");
const upValues_1 = require("./lua/upValues");
const hover_1 = require("./hover");
/** 代码补全 */
function loadItems(doc, pos, tok) {
    // 取得nginx路径
    let path = ngx.getPath(doc.fileName);
    if (!path.ngxPath) {
        return;
    }
    // 导入文件
    let files = importFiles_1.importFiles(doc, pos, tok);
    if (files) {
        return files;
    }
    // 加载模块文件
    let fileItems = fileItems_1.loadFileItems(doc, pos, tok);
    if (fileItems) {
        return fileItems;
    }
    // 取得上量或成员变量
    let _g = upValues_1.getUpValues(doc, pos);
    if (!_g) {
        return;
    }
    let items = [];
    loadKeys(items, _g, "", 0);
    return items;
}
exports.loadItems = loadItems;
/** 生成补全项目 */
function loadKeys(items, t, pkey, level = 0) {
    if (!t) {
        return;
    }
    Object.keys(t).forEach(k => {
        // 以数字或 $ * 开头的不显示
        if (k.match(/^(\d|\$|\*)/)) {
            return;
        }
        let c = t[k];
        let docs = hover_1.getContents(pkey + k, c).join("\n------\n");
        let documentation = new vscode.MarkdownString(docs);
        if (!(c instanceof Object)) {
            return items.push({
                label: pkey + k,
                documentation,
                kind: vscode_1.CompletionItemKind.Value // 变量
            });
        }
        if (c.type === "lib" || c.type === "api") {
            items.push({
                label: pkey + k,
                kind: vscode_1.CompletionItemKind.Module,
                documentation,
            });
            return;
        }
        let hasProp = c["."] instanceof Object && Object.keys(c["."]).length > 0;
        let hasFunc = c[":"] instanceof Object && Object.keys(c[":"]).length > 0;
        let hasArgs = c.args || typeof c["()"] === "function" || c["()"] instanceof Array;
        if (hasProp || hasFunc) {
            items.push({
                label: pkey + k,
                kind: vscode_1.CompletionItemKind.Module,
                commitCharacters: [".", ":"],
                documentation,
            });
        }
        if (hasArgs) {
            items.push({
                filterText: pkey + k,
                label: pkey + k + (c.args || "()"),
                insertText: pkey + k,
                kind: vscode_1.CompletionItemKind.Method,
                commitCharacters: ["(", "{"],
                documentation,
            });
        }
        if (!hasProp && !hasFunc && !hasArgs) {
            items.push({
                label: pkey + k,
                kind: vscode_1.CompletionItemKind.Variable,
                documentation,
            });
        }
    });
}
exports.loadKeys = loadKeys;
//# sourceMappingURL=completion.js.map