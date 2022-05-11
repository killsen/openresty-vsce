"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContents = exports.getHover = void 0;
const upValues_1 = require("./lua/upValues");
/** 取得悬停提示 */
function getHover(doc, pos) {
    let regx = /[a-zA-Z_]\w*/;
    let range = doc.getWordRangeAtPosition(pos, regx);
    if (!range)
        return;
    let name = doc.getText(range);
    if (!name)
        return;
    let scope = upValues_1.getUpValues(doc, pos);
    if (!scope)
        return;
    let t = scope[name];
    if (t === undefined)
        t = scope["*"];
    if (t === undefined)
        return;
    let contents = getContents(name, t);
    let hover = { contents };
    return hover;
}
exports.getHover = getHover;
/** 取得提示内容 */
function getContents(name, t) {
    let contents = [];
    if (t instanceof Object) {
        if (t.type === "lib" || t.type === "api")
            return [t.doc];
        let doc = t.doc;
        if (typeof doc === "string" && doc) {
            doc = doc.replace("{{name}}", name); // 替换函数名
            contents.push(doc);
            if (doc.split("\n").length > 1)
                return contents;
        }
        doc = funcToDoc(name, t);
        if (doc) {
            contents.push(doc);
        }
        else {
            contents.push("## " + name);
        }
        doc = objectToDoc(name + " . ", t["."]);
        doc && contents.push(doc);
        doc = objectToDoc(name + " : ", t[":"]);
        doc && contents.push(doc);
    }
    else {
        let type = typeof (t);
        if (t === null) {
            type = "nil";
            t = "nil";
        }
        let doc = "## " + name + "\n";
        doc += "`< " + type + " >`\n";
        doc += "### " + t;
        contents.push(doc);
    }
    return contents;
}
exports.getContents = getContents;
function funcToDoc(name, t) {
    if (!(t instanceof Object))
        return;
    let docs = [];
    if (t.args || typeof t["()"] === "function") {
        let args = t.args || "()";
        let doc = "### " + name + " " + args;
        docs.push(doc);
        let resArgs = t.resArgs;
        if (typeof resArgs === "string" && resArgs) {
            docs.push("返回值：");
            resArgs.split("\n").forEach(s => {
                s = "* " + s;
                if (!docs.includes(s))
                    docs.push(s);
            });
        }
    }
    return docs.join("\n");
}
function objectToDoc(name, t) {
    if (!(t instanceof Object))
        return;
    let docs = [];
    Object.keys(t).forEach(k => {
        if (k.startsWith("$"))
            return;
        let v = t[k];
        if (v instanceof Object) {
            if (v.args || typeof v["()"] === "function") {
                let args = v.args || "()";
                return docs.push("* " + name + k + " " + args);
            }
        }
        docs.push("* " + name + k);
    });
    return docs.join("\n");
}
//# sourceMappingURL=hover.js.map