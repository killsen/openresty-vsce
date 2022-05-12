
import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { join } from 'path';
import * as fs from 'fs';
import { getLinkText } from './filelink';
import { loadModuleByCode } from "./lua/modLoader";
import { loadKeys } from './completion';

/** 文件加载补全 */
export function loadFileItems(doc: vscode.TextDocument, pos: vscode.Position, tok: vscode.CancellationToken) {

    // 取得nginx路径
    let path = ngx.getPath(doc.fileName);
    if (!path.appPath) {return;}

    // "%dd."
    let r0 = /['"]\S+['"]/;
    let r1 = /[$%#@][\w\.]*/;
    let r2 = /[$%#@\w\.]/;
    let text = getLinkText(doc, pos, r1, r2, r0);

    // -- @order : $pos_bi_order
    if (!text) {
        let r0 = /\s*--\s*\@\w*\s*\:\s*[$@]\w*/;
        let r1 = /[$@]\w*/;
        let r2 = /[$@\w]/;
        text = getLinkText(doc, pos, r1, r2, r0);
    }

    let modType, modPath;

    if (text) {
        modType = text.substr(0, 1);
        modPath = text.substr(1).replace(/\./g, "\\");

    } else {
        // _load "%dd.load_data"
        let r0 = /\b(_load|require)\s*\,?\s*\(?\s*["']\S+["']\s*\)?/;
        let text = getText(r0);
        if (!text) {return;}

        if (text.startsWith("_load")) {
            modType = "_load";
        } else {
            modType = "require";
        }

        let r1 = /[\w\-\.]*["']/;
        let r2 = /[\w\-\.]/;
        text = getLinkText(doc, pos, r1, r2, r0);
        if (!text || text.startsWith(".")) {return;}
        if (text.startsWith("lua")) {return;}

        modPath = text.replace(/\./g, "\\");
    }

    let items: CompletionItem[] = [];
    let modLoaded: { [key: string]: boolean } = {};

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
            let mod = loadModuleByCode(path, doc.getText());
            let types = mod && mod["$types"] as any;
            if (types) {
                loadKeys(items, types, "", 0);
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

    function getText(regx: RegExp) {
        let range = doc.getWordRangeAtPosition(pos, regx);
        return range && doc.getText(range);
    }

    function loadItems(...path: string[]) {

        let pPath = join(...path);
        let files;

        try {
            files = fs.readdirSync(pPath);
        } catch (e) {
            return;
        }

        files.forEach(name => {
            if (name === "_bk" || name.startsWith(".")) {return;}

            let fPath = join(pPath, name);
            let fStat = fs.statSync(fPath);

            // 含有 lua 文件的目录
            if (fStat.isDirectory() && hasLuaFile(fPath)) {
                if (modLoaded[name]) {return;}
                    modLoaded[name] = true;

                items.push({
                    label: name,
                    detail: fPath,
                    kind : CompletionItemKind.Folder,
                    commitCharacters: ["."],
                });

            // lua 文件
            } else if (fStat.isFile() && name.endsWith(".lua")) {

                name = name.substr(0, name.length - 4);

                if (modLoaded[name]) {return;}
                    modLoaded[name] = true;

                items.push({
                    label: name,
                    detail: fPath,
                    kind : CompletionItemKind.Module
                });

            }

        });

    }

}

/** 检查目录中是否含有 lua 文件 */
function hasLuaFile(pPath: string) {

    try {
        let files = fs.readdirSync(pPath);

        for (const name of files) {
            let fPath = join(pPath, name);
            let fStat = fs.statSync(fPath);
            if (fStat.isFile() && name.endsWith(".lua")) {
                return true;
            }
        }

    } catch (e) {}

}
