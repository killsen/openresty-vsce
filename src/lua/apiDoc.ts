
import { CompletionItemKind } from "vscode";
import * as fs from 'fs';
import { loadDocs } from './markdown';
import { NgxPath, getApiFile } from './ngx';
import { LuaApi } from "./types";

/** 加载 api 接口声明文件及文档 */
function genApi(name: string): LuaApi | undefined {

    // mysql:new() -> db, err -- 创建mysql客户端

    name = name.trim();
    if (!name) {return;}

    let desc = "";
    let idx = name.indexOf("--");
    if (idx !== -1) {
        desc = name.substring(idx + 2).trim();
        name = name.substring(0, idx).trim();
    }

    let text = name;  // 不含注释

    let res  = "";
    idx = name.indexOf("->");
    if (idx !== -1) {
        res  = name.substring(idx + 2).trim();
        name = name.substring(0, idx).trim();
    }

    let args = "";
    idx = name.indexOf("(");
    if (idx !== -1) {
        args = name.substring(idx).trim();
        name = name.substring(0, idx).trim();
    }

    if (!name) {return;}

    let indexer = "";
    let parent  = "";
    let child   = "";

    let i = name.indexOf(":");
    let j = name.indexOf("[");
    let k = name.lastIndexOf(".");

    if (i !== -1){
        indexer = ':';
        parent  = name.substring(0, i);
        child   = name.substring(i + 1);

    } else if (j !== -1) {
        indexer = '.';
        parent  = name.substring(0, j);

    }else if (k !== -1){
        indexer = '.';
        parent  = name.substring(0, k);
        child   = name.substring(k + 1);
    }

    let kind = args ? CompletionItemKind.Function
         : desc === "保留字" ? CompletionItemKind.Keyword
         : CompletionItemKind.Value;

    if (desc === "保留字") {desc = "";}

    return {
        text, name, args, res, desc, kind,
        parent, indexer, child, doc: "## " + text + "\n" + desc,
        readonly: true,
    };

}

/** 加载 api 接口声明文件及文档 */
export function loadApiDoc(ctx: NgxPath, name: string){

    // api 接口声明文件
    let apiFile = getApiFile(ctx, name);
    if (!apiFile) { return; }

    let lines: string[];
    try {
        let data = fs.readFileSync(apiFile);
        lines = data.toString().split("\n");
        if (lines.length === 0) {return;}
    } catch (e) {
        return;
    }

    let docs = loadDocs(apiFile, name);
    let apis = new Array<LuaApi>();
    let map  = new Map<string, LuaApi>();

    lines.forEach((line, index)=>{
        let api = genApi(line);
        if (!api) {return;}

        // 接口声明文件及位置
        api.file = apiFile;
        api.loc = {
            start : { line: index+1, column: 0 },
            end   : { line: index+1, column: line.length},
        };

        apis.push(api);
        map.set(api.name, api);

        // 接口文档
        if (!docs) {return;}
        let doc = docs[api.name] || docs[api.child] || docs[api.desc];
        if (doc?.doc) {
            api.doc = doc.doc;
        }
    });

    apis.forEach(api=>{
        let p = map.get(api.parent);
        if (p) {p.kind = CompletionItemKind.Module;}
    });

    return apis;

}
