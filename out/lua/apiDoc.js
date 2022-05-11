"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApiDoc = void 0;
const vscode_1 = require("vscode");
const fs = require("fs");
const markdown_1 = require("./markdown");
const ngx_1 = require("./ngx");
// mysql:new() -> db, err -- 创建mysql客户端
function genApi(s) {
    s = s.trim();
    if (!s) {
        return;
    }
    let a = s.split('--');
    let desc = (a[1] || '').trim();
    a = a[0].split('->');
    let res = (a[1] || '').trim();
    let text = (a[0] || '').trim();
    a = a[0].split('(');
    let name = (a[0] || '').trim();
    let args = (a[1] || '').trim();
    if (args) {
        args = '(' + args;
    }
    if (!name) {
        return;
    }
    let parent = "";
    let indexer = "";
    let child = "";
    if (name.indexOf(':') > 0) {
        indexer = ':';
        parent = name.substr(0, name.indexOf(':'));
        child = name.substr(name.indexOf(':') + 1);
    }
    else if (name.indexOf('[') > 0) {
        indexer = '.';
        parent = name.substr(0, name.indexOf('['));
    }
    else if (name.indexOf('.') > 0) {
        indexer = '.';
        a = name.split('.');
        child = a.pop() || '';
        parent = a.join('.');
    }
    if (res) {
        desc = "-- " + desc + "\n" +
            "local " + res + " = " + text;
    }
    let kind = vscode_1.CompletionItemKind.Value;
    if (args) {
        kind = vscode_1.CompletionItemKind.Function;
    }
    else if (desc.indexOf("库") >= 0) {
        kind = vscode_1.CompletionItemKind.Module;
    }
    else if (desc.indexOf("关键字") >= 0) {
        kind = vscode_1.CompletionItemKind.Keyword;
    }
    else if (desc.indexOf("=") >= 0) {
        kind = vscode_1.CompletionItemKind.EnumMember;
    }
    return {
        text, name, args, res, desc, kind,
        parent, indexer, child, doc: ""
    };
}
function loadApiDoc(path, name) {
    // 检查路径是否存在
    let fileName = ngx_1.getApiFile(path, name);
    if (!fileName) {
        return;
    }
    let docs = markdown_1.loadDocs(path, name);
    let lines = [];
    try {
        let data = fs.readFileSync(fileName);
        lines = data.toString().split("\n");
    }
    catch (e) {
        return;
    }
    let apis = [];
    let map = {};
    lines.forEach(line => {
        let api = genApi(line);
        if (!api) {
            return;
        }
        // 接口文档
        let doc = docs && (docs[api.name] || docs[api.child] || docs[api.desc]);
        api.doc = doc && doc.doc || "";
        api.loc = doc && doc.loc;
        api.file = doc && doc.file;
        apis.push(api);
        map[api.name] = api;
    });
    apis.forEach(api => {
        let p = map[api.parent];
        if (p) {
            p.kind = vscode_1.CompletionItemKind.Module;
        }
    });
    return apis;
}
exports.loadApiDoc = loadApiDoc;
//# sourceMappingURL=apiDoc.js.map