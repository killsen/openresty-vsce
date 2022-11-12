
import * as fs from 'fs';
import { NgxPath } from './ngx';
import { LuaLoc, LuaApiDocs } from './types';
import { join as _join, dirname as _dirname } from 'path';
import { setDepend } from "./modCache";

// 以 === --- 作为标题
function loadMarkDown(lines: string[], file: string){

    let docs: LuaApiDocs = {};

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

    let loc: LuaLoc | undefined;
    let name: string = "";
    let doc: string[] = [];

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
        } else if (/^-+$/.test(s)) {
            saveDoc();
            name = lines[i-1];
            doc = [ name, s ];
            loc = {
                start: { line: i, column: 0},
                end: {line: i, column: s.length},
            };
        }

        if (!s.startsWith('[返回目录]') &&
            !s.startsWith('**环境:**') &&
            !s.startsWith('**context:**') &&
            !s.startsWith('[Back to TOC]') && name){
            doc.push(s);
        }

    });

    saveDoc();
    return docs;

}

// 以 # ## 作为标题
function loadMD(lines: string[], file: string){

    let docs: LuaApiDocs = {};

    let loc: LuaLoc | undefined;
    let name: string = "";
    let doc: string[] = [];

    lines.forEach((s, i) => {
        if (name && loc && s.startsWith("#")) {
            docs[name] = { file, loc, doc: doc.join("\n") };
            name = "";
            doc = [];
        }
        if (s.startsWith("## ")){
            name = s.substring(3).split("(")[0].trim();
            loc = {
                start: { line: i+1, column: 3},
                end: {line: i+1, column: s.length},
            };
        }
        if (name) { doc.push(s); }
    });

    if (name && loc) {
        docs[name] = { file, loc, doc: doc.join("\n") };
    }

    return docs;

}


function loadDoc(fileMdDoc: string) {

    try {
        let data = fs.readFileSync(fileMdDoc).toString();
        let lines = data.toString().split(/\r?\n/);

        if (data.startsWith("#")) {
            return loadMD(lines, fileMdDoc);
        } else {
            return loadMarkDown(lines, fileMdDoc);
        }

    } catch (e) {
        return;
    }

}

export function loadDocs(apiFile: string, name: string) {

	// 检查路径是否存在
    if (!apiFile || !name) { return; }

    let apiPath = _dirname(apiFile);
    let fileMD  = _join(apiPath, `${ name }.md`);
    let fileEN  = _join(apiPath, `${ name }._en.md`);

    /** 设置模块引用关系 */
    setDepend(apiFile, fileMD);
    setDepend(apiFile, fileEN);

    let docs = loadDoc(fileMD);
    if (!docs) { return; }

    let enDocs = loadDoc(fileEN) || {};
    Object.keys(enDocs).forEach(k => {
        if (docs) {
            docs[k] = docs && docs[k] || enDocs[k];
        }
    });

    return docs;

}
