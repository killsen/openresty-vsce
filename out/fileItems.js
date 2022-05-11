"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFileItems = void 0;
const ngx = require("./lua/ngx");
const vscode_1 = require("vscode");
const path_1 = require("path");
const fs = require("fs");
const filelink_1 = require("./filelink");
const modLoader_1 = require("./lua/modLoader");
const completion_1 = require("./completion");
/** 文件加载补全 */
function loadFileItems(doc, pos, tok) {
    // 取得nginx路径
    let path = ngx.getPath(doc.fileName);
    if (!path.appPath)
        return;
    // "%dd."
    let r0 = /['"]\S+['"]/;
    let r1 = /[$%#@][\w\.]*/;
    let r2 = /[$%#@\w\.]/;
    let text = filelink_1.getLinkText(doc, pos, r1, r2, r0);
    // -- @order : $pos_bi_order
    if (!text) {
        let r0 = /\s*--\s*\@\w*\s*\:\s*[$@]\w*/;
        let r1 = /[$@]\w*/;
        let r2 = /[$@\w]/;
        text = filelink_1.getLinkText(doc, pos, r1, r2, r0);
    }
    let modType, modPath;
    if (text) {
        modType = text.substr(0, 1);
        modPath = text.substr(1).replace(/\./g, "\\");
    }
    else {
        // _load "%dd.load_data"
        let r0 = /\b(_load|require)\s*\,?\s*\(?\s*["']\S+["']\s*\)?/;
        let text = getText(r0);
        if (!text)
            return;
        if (text.startsWith("_load")) {
            modType = "_load";
        }
        else {
            modType = "require";
        }
        let r1 = /[\w\-\.]*["']/;
        let r2 = /[\w\-\.]/;
        text = filelink_1.getLinkText(doc, pos, r1, r2, r0);
        if (!text || text.startsWith("."))
            return;
        if (text.startsWith("lua"))
            return;
        modPath = text.replace(/\./g, "\\");
    }
    let items = [];
    let modLoaded = {};
    switch (modType) {
        case "$":
            loadItems(path.daoPath, modPath);
            break;
        case "%":
            loadItems(path.comPath, modPath);
            loadItems(path.libPath, modPath);
            break;
        case "#":
            loadItems(path.utiPath, modPath);
            break;
        case "@":
            let mod = modLoader_1.loadModuleByCode(path, doc.getText());
            let types = mod && mod["$types"];
            if (types) {
                completion_1.loadKeys(items, types, "", 0);
            }
            break;
        case "_load":
            loadItems(path.appPath, modPath);
            break;
        case "require":
            loadItems(path.ngxPath, modPath);
            loadItems(path.ngxPath, "lualib", modPath);
            break;
    }
    return items;
    function getText(regx) {
        let range = doc.getWordRangeAtPosition(pos, regx);
        return range && doc.getText(range);
    }
    function loadItems(...path) {
        let pPath = path_1.join(...path);
        let files;
        try {
            files = fs.readdirSync(pPath);
        }
        catch (e) {
            return;
        }
        files.forEach(name => {
            if (name === "_bk" || name.startsWith("."))
                return;
            let fPath = path_1.join(pPath, name);
            let fStat = fs.statSync(fPath);
            // 含有 lua 文件的目录
            if (fStat.isDirectory() && hasLuaFile(fPath)) {
                if (modLoaded[name])
                    return;
                modLoaded[name] = true;
                items.push({
                    label: name,
                    detail: fPath,
                    kind: vscode_1.CompletionItemKind.Folder,
                    commitCharacters: ["."],
                });
                // lua 文件
            }
            else if (fStat.isFile() && name.endsWith(".lua")) {
                name = name.substr(0, name.length - 4);
                if (modLoaded[name])
                    return;
                modLoaded[name] = true;
                items.push({
                    label: name,
                    detail: fPath,
                    kind: vscode_1.CompletionItemKind.Module
                });
            }
        });
    }
}
exports.loadFileItems = loadFileItems;
/** 检查目录中是否含有 lua 文件 */
function hasLuaFile(pPath) {
    try {
        let files = fs.readdirSync(pPath);
        for (const name of files) {
            let fPath = path_1.join(pPath, name);
            let fStat = fs.statSync(fPath);
            if (fStat.isFile() && name.endsWith(".lua")) {
                return true;
            }
        }
    }
    catch (e) { }
}
//# sourceMappingURL=fileItems.js.map