
import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import { CompletionItem, CompletionItemKind, Position, Range } from 'vscode';
import { join } from 'path';
import * as fs from 'fs';
const MIN_LEN = 17;

/** 导入文件 */
export function importFiles(doc: vscode.TextDocument, pos: Position, tok: vscode.CancellationToken) {

    // 取得nginx路径
    let path = ngx.getPath(doc.fileName);
    if (!path.ngxPath) { return; }

    let textLine = doc.lineAt(pos.line);
    let textRang = textLine.range;
    let items: CompletionItem[] = [];
    let itemsLoaded: { [key: string] : boolean } = {};

    switch (textLine.text) {
        case "#":
            path.appPath && loadFiles ("# ", path.utiPath, `_load "#`);
            break;
        case "$":
            path.appPath && loadFiles ("$ ", path.daoPath, `_load "$`);
            break;
        case "%":
            path.appPath && loadFiles ("% ", path.comPath, `_load "%`);
            path.appPath && loadFiles ("% ", path.libPath, `_load "%`);
            break;

        case ".":
            if (path.appPath) {
                loadFiles (". dao   $ "  , path.daoPath, `_load "$`);
                loadFiles (". com   % "  , path.comPath, `_load "%`);
                loadFiles (". lib   % "  , path.libPath, `_load "%`);
                loadFiles (". utils # "  , path.utiPath, `_load "#`);
                loadFiles (". api   . "  , path.appPath + "/api/", `_load "api.`);
            }

                loadFiles (". resty . "  , path.ngxPath + "/resty/", `require "resty.`);
                loadFiles (". resty . "  , path.ngxPath + "/lualib/resty/", `require "resty.`);

                addClibItem("lfs");
                addClibItem("cjson");
                addClibItem("cjson", "cjson.safe");

            break;
        default:
            return;
    }

    return items;

    function addClibItem(name: string, modName: string = name) {

        let item = new CompletionItem(". clib  . " + modName);

        if (name.length < MIN_LEN) {
            name = name + " ".repeat(MIN_LEN-name.length);
        }

        item.insertText = `local ${name} = require "${modName}"\n`;
        item.kind = CompletionItemKind.File;
        item.range = textRang;

        items.push(item);
    }

    function loadFiles (pName: string, pPath: string, pLoader: string) {

        let files;

        try {
            files = fs.readdirSync(pPath);
        } catch (e) {
            return;
        }

        files.forEach(name => {
            if (name === "_bk" || name.startsWith(".")) { return; }

            let fPath = join(pPath, name);
            let fStat = fs.statSync(fPath);

            if (fStat.isFile() && name.endsWith(".lua")) {
                name = name.substr(0, name.length - 4);

                if (itemsLoaded[pName + name]) return;
                    itemsLoaded[pName + name] = true;

                let item = new CompletionItem(pName + name);

                let modName = name;
                if (name.length < MIN_LEN) {
                    name = name + " ".repeat(MIN_LEN-name.length);
                }

                item.insertText = `local ${name} = ${pLoader}${modName}"\n`;
                item.kind = CompletionItemKind.File;
                item.range = textRang;

                items.push(item);
            }

        })

    }

}
