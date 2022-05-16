
import { CompletionItemKind } from "vscode";
import * as fs from 'fs';
import { loadDocs } from './markdown';
import { NgxPath, getApiFile } from './ngx';
import { LuaApi } from "./types";

// mysql:new() -> db, err -- 创建mysql客户端
function genApi(s: string): LuaApi | undefined {

    s = s.trim();
    if (!s) {return;}

    let a = s.split('--');
    let desc = (a[1] || '').trim();

    a = a[0].split('->');
    let res = (a[1] || '').trim();

    let text = (a[0] || '').trim();

    a = a[0].split('(');
    let name = (a[0] || '').trim();
    let args = (a[1] || '').trim();
    if (args) { args = '(' + args; }

    if (!name) {return;}

    let parent = "";
    let indexer = "";
    let child = "";
    if (name.indexOf(':')>0){
        indexer = ':';
        parent = name.substr(0, name.indexOf(':'));
        child = name.substr(name.indexOf(':')+1);

    } else if (name.indexOf('[') > 0) {
        indexer = '.';
        parent = name.substr(0, name.indexOf('['));

    }else if (name.indexOf('.')>0){
        indexer = '.';
        a = name.split('.');
        child = a.pop() || '';
        parent = a.join('.');
    }

    if (res) {
        desc =  "-- " + desc + "\n" +
                "local " + res + " = " + text;
    }

    let kind = CompletionItemKind.Value;

    if (args) {
        kind = CompletionItemKind.Function;

    }else if(desc.indexOf("库")>=0){
        kind = CompletionItemKind.Module;

    }else if(desc.indexOf("关键字")>=0){
        kind = CompletionItemKind.Keyword;

    }else if(desc.indexOf("=")>=0){
        kind = CompletionItemKind.EnumMember;
    }

    return {
        text, name, args, res, desc, kind,
        parent, indexer, child, doc: ""
    };

}

export function loadApiDoc(path: NgxPath, name: string){

    // 检查路径是否存在
    let fileName = getApiFile(path, name);
    if (!fileName) { return; }

    let docs = loadDocs(path, name);
    let lines: string[] = [];

    try {
        let data = fs.readFileSync(fileName);
        lines = data.toString().split("\n");
    } catch (e) {
        return;
    }

    let apis : LuaApi[] = [];
    let map : { [key: string] : LuaApi } = {};

    lines.forEach(line=>{
        let api = genApi(line);
        if (!api) {return;}

        // 接口文档
        let doc = docs && (docs[api.name] || docs[api.child] || docs[api.desc]);
        api.doc = doc && doc.doc || "";
        api.loc = doc && doc.loc;
        api.file = doc && doc.file;

        apis.push(api);
        map[api.name] = api;
    });

    apis.forEach(api=>{
        let p = map[api.parent];
        if (p) {p.kind = CompletionItemKind.Module;}
    });

    return apis;

}
