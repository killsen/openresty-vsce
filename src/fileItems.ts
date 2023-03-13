
import * as vscode from 'vscode';
import * as ngx from './lua/ngx';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { join as _join, basename as _basename, extname as _extname, parse as _parse } from 'path';
import * as fs from 'fs';
import { getLinkText } from './filelink';
import { loadModuleByCode } from "./lua/modLoader";
import { loadKeys } from './completion';

function requireFiles(ngxPath: string, doc: vscode.TextDocument, pos: vscode.Position) {

    // require   "resty.http"
    // require ( "resty.http" )
    // pcall ( require, "resty.http" )

    let regex1 = /\b(require)\s*,?\s*\(?\s*["']\S+["']\s*\)?/;
    let regex2 = /\w[\w.]*/;

    let range1 = doc.getWordRangeAtPosition(pos, regex1);
    if (!range1) {return;}

    let range2 = doc.getWordRangeAtPosition(pos, regex2);
    if (!range2) {return;}

    let rang = new vscode.Range(range2.start, pos);
    let name = doc.getText(rang);

    name = name.trim().toLowerCase().replace(/\./g,"\\");
    name = _parse(`${ name }.lua`).dir;

    console.log("name -----------------> ", name);

    let items = [] as CompletionItem[];
    let paths = [] as string[];

    function addPath(path = "") {
        paths.push(_join(ngxPath, path, name));
        paths.push(_join(ngxPath, "..", "lua_modules", path, name));
    }

    if (name === "resty" || name.startsWith("resty\\")) {
        console.log("name!!!!!!!!", name);
        addPath();
    }

    if (name === "app" || name.startsWith("app\\")) {
        addPath();
    }

    addPath("clib"  );
    addPath("lua"   );
    addPath("lualib");

    paths.forEach(pPath => {
        try {
            let files = fs.readdirSync(pPath, { withFileTypes: true });
            files.forEach(f => {
                if (f.isFile()) {
                    let p = _parse(f.name);
                    if (![".lua", ".dll", ".so"].includes(p.ext)) {return;}
                    if (p.name === "init") {return;}
                    items.push({
                        label: p.name,
                        detail: p.base,
                        kind : CompletionItemKind.File,
                    });
                } else {
                    items.push({
                        label: f.name,
                        kind : CompletionItemKind.Folder,
                        commitCharacters: ["."],
                    });
                }

            });
        } catch (error) {
            //
        }
    });

    return items;

}

/** 文件加载补全 */
export function loadFileItems(doc: vscode.TextDocument, pos: vscode.Position, tok: vscode.CancellationToken) {

    // 取得nginx路径
    let ctx = ngx.getPath(doc.fileName);
    if (!ctx.ngxPath) {return;}

    let files = requireFiles(ctx.ngxPath, doc, pos);
    if (files) {return files;}

    // if (!ctx.appPath) {return;}

    // "%dd."
    let r0 = /['"]\S+['"]/;
    let r1 = /[$%#@][\w.]*/;
    let r2 = /[$%#@\w.]/;
    let text = getLinkText(doc, pos, r1, r2, r0);

    /** 类型注解
     *  -- @t : $pos_bi_order
     *  --- t : $pos_bi_order
     *  -->     $pos_bi_order
     */
    if (!text) {
        let r0 = /(--.*:|---|-->).*[$@]\w*/;
        let r1 = /[$@]\w*/;
        let r2 = /[$@\w]/;
        text = getLinkText(doc, pos, r1, r2, r0);
    }

    let modType, modPath;

    if (text) {
        modType = text.substring(0, 1);
        modPath = text.substring(1).replace(/\./g, "\\");

    } else {
        // _load "%dd.load_data"
        let r0 = /\b(_load)\s*,?\s*\(?\s*["']\S+["']\s*\)?/;
        let text = getText(r0);
        if (!text) {return;}

        modType = "_load";

        let r1 = /[\w\-.]*["']/;
        let r2 = /[\w\-.]/;
        text = getLinkText(doc, pos, r1, r2, r0);
        if (!text || text.startsWith(".")) {return;}
        if (text.startsWith("lua")) {return;}

        modPath = text.replace(/\./g, "\\");
    }

    let items: CompletionItem[] = [];
    let modLoaded: { [key: string]: boolean } = {};

    switch (modType) {
        case "$":
            ctx.appPath && loadItems(ctx.daoPath, modPath);
            break;

        case "%":
            ctx.appPath && loadItems(ctx.comPath, modPath);
            ctx.appPath && loadItems(ctx.libPath, modPath);
            ctx.appPath && loadItems(ctx.libPathX, modPath);
            break;

        case "#":
            ctx.appPath && loadItems(ctx.utiPath, modPath);
            ctx.appPath && loadItems(ctx.utiPathX, modPath);
            break;

        case "@":
        {
            let mod = loadModuleByCode(ctx, doc.getText());
            let types = mod && mod["$types"];
            if (types) {
                loadKeys(items, types, "", 0, true);  // 自定义类型声明补全
            }
            break;
        }

        case "_load":
            ctx.appPath && loadItems(ctx.appPath, modPath);
            break;
    }

    return items;

    function getText(regx: RegExp) {
        let range = doc.getWordRangeAtPosition(pos, regx);
        return range && doc.getText(range);
    }

    function loadItems(...path: string[]) {

        let pPath = _join(...path);
        let files;

        try {
            files = fs.readdirSync(pPath);
        } catch (e) {
            return;
        }

        files.forEach(name => {
            if (name === "_bk" || name.startsWith(".") || name === "init.lua") {return;}

            let fPath = _join(pPath, name);
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

                name = name.substring(0, name.length - 4);

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
            let fPath = _join(pPath, name);
            let fStat = fs.statSync(fPath);
            if (fStat.isFile() && name.endsWith(".lua")) {
                return true;
            }
        }

    } catch (e) {
        // console.log(e);
    }

}
