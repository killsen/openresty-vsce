"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDocs = void 0;
const fs = require("fs");
const path_1 = require("path");
const modCache_1 = require("./modCache");
// 以 === --- 作为标题
function loadMarkDown(lines, file) {
    let docs = {};
    /* Title
     * =====
     *
     * SubTitle
     * --------
     *
     * **环境:**
     * [返回目录]
     *
     * **context:**
     * [Back to TOC]
     */
    let loc;
    let name = "";
    let doc = [];
    function saveDoc() {
        if (name && loc && doc.length > 3) {
            doc.pop();
            docs[name] = { file, loc, doc: doc.join("\n") };
            name = "";
            doc = [];
        }
    }
    lines.forEach((s, i) => {
        // 大标题
        if (/^=+$/.test(s)) {
            saveDoc();
            // 小标题
        }
        else if (/^-+$/.test(s)) {
            saveDoc();
            name = lines[i - 1];
            doc = [name, s];
            loc = {
                start: { line: i, column: 0 },
                end: { line: i, column: s.length },
            };
        }
        if (!s.startsWith('[返回目录]') &&
            !s.startsWith('**环境:**') &&
            !s.startsWith('**context:**') &&
            !s.startsWith('[Back to TOC]') && name) {
            doc.push(s);
        }
    });
    saveDoc();
    return docs;
}
// 以 # ## 作为标题
function loadMD(lines, file) {
    let docs = {};
    let loc;
    let name = "";
    let doc = [];
    lines.forEach((s, i) => {
        if (name && loc && s.startsWith("#")) {
            docs[name] = { file, loc, doc: doc.join("\n") };
            name = "";
            doc = [];
        }
        if (s.startsWith("## ")) {
            name = s.substr(3).split("(")[0].trim();
            loc = {
                start: { line: i + 1, column: 3 },
                end: { line: i + 1, column: s.length },
            };
        }
        if (name) {
            doc.push(s);
        }
    });
    if (name && loc) {
        docs[name] = { file, loc, doc: doc.join("\n") };
    }
    return docs;
}
function loadDoc(fileMdDoc) {
    try {
        let data = fs.readFileSync(fileMdDoc).toString();
        let lines = data.toString().split(/\r?\n/);
        if (data.startsWith("#")) {
            return loadMD(lines, fileMdDoc);
        }
        else {
            return loadMarkDown(lines, fileMdDoc);
        }
    }
    catch (e) {
        return;
    }
}
function loadDocs(path, name) {
    // 检查路径是否存在
    if (!path.apiPath || !name) {
        return;
    }
    let apiFile = path_1.join(path.apiPath, name + ".api");
    let fileMD = path_1.join(path.apiPath, name + ".md");
    let fileEN = path_1.join(path.apiPath, name + "_en.md");
    /** 设置模块引用关系 */
    modCache_1.setDepend(apiFile, fileMD);
    modCache_1.setDepend(apiFile, fileEN);
    let docs = loadDoc(fileMD);
    if (!docs) {
        return;
    }
    let enDocs = loadDoc(fileEN) || {};
    Object.keys(enDocs).forEach(k => {
        if (docs) {
            docs[k] = docs && docs[k] || enDocs[k];
        }
    });
    return docs;
}
exports.loadDocs = loadDocs;
//# sourceMappingURL=markdown.js.map