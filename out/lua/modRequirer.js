"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireModule = void 0;
const ngx_1 = require("./ngx");
const apiDoc_1 = require("./apiDoc");
const modCache_1 = require("./modCache");
/** 通过API文件加载接口声明 */
function requireModule(path, name, dao) {
    // 检查路径是否存在
    let fileName = ngx_1.getApiFile(path, name);
    if (!fileName) {
        return;
    }
    let apis = apiDoc_1.loadApiDoc(path, name);
    if (!apis) {
        return;
    }
    let mod = {};
    let requireName = "";
    let daoDoc = "";
    if (dao) {
        daoDoc = dao.doc;
        let daoRow = { ".": dao.row, doc: "## $" + dao.name + "\ndao 类型单行数据\n" + daoDoc };
        mod["row"] = daoRow;
        mod["row[]"] = { "[]": daoRow, doc: "## $" + dao.name + "[]\ndao 类型多行数据\n" + daoDoc };
    }
    function genNode(api) {
        // console.log(api.name);
        let a = [];
        if (api.name === "require") {
            requireName = api.res;
            a = [api.res];
        }
        else if (api.parent) {
            a = api.parent.split(".");
            if (api.indexer === ".") {
                a.push(api.child);
            }
        }
        else {
            a = api.name.split(".");
        }
        let p;
        a.forEach(k => {
            k = k.trim();
            if (!k) {
                return;
            }
            if (!requireName) {
                requireName = k;
            }
            if (p) {
                p["."] = p["."] || {};
                p["."][k] = p["."][k] || {};
                p = p["."][k];
            }
            else {
                p = mod[k] = mod[k] || {};
            }
        });
        if (p && api.parent && api.indexer === ":" && api.child) {
            let k = api.child;
            p[":"] = p[":"] || {};
            p[":"][k] = p[":"][k] || {};
            p = p[":"][k];
        }
        if (p) {
            p.doc = api.doc + daoDoc;
            p.$file = api.file;
            p.$loc = api.loc;
        }
        return p;
    }
    // 生成命名空间
    apis.forEach(api => {
        genNode(api);
    });
    function genValue(name) {
        let m = mod[name];
        if (m) {
            return m;
        }
        let s = name.split("[");
        name = s[0].trim();
        if (s[1]) {
            m = mod[name];
            if (!m) {
                return;
            }
            m = { "[]": m, doc: m.doc };
            name = name + "[]";
            mod[name] = m;
            return m;
        }
    }
    apis.forEach(api => {
        if (api.name === "require") {
            return;
        }
        let p = genNode(api);
        if (!p) {
            return;
        }
        if (api.args) {
            let arr = api.res.split(",");
            p["()"] = arr.map(genValue);
            p.args = api.args;
            p.doc = api.doc + daoDoc;
            p.$file = api.file;
            p.$loc = api.loc;
            if (p.args && p.args !== "()" && dao) {
                p.$dao = dao; // 用于 dao 补全
            }
        }
        else {
            let t = genValue(api.res);
            if (t) {
                p["."] = t["."];
                p[":"] = t[":"];
                p["()"] = t["()"];
                p["[]"] = t["[]"];
                p.args = t.args;
                p.doc = t.doc || p.doc;
                p.type = t.type;
                p.$loc = t.$loc;
                p.$file = t.$file;
            }
        }
    });
    if (!requireName) {
        return;
    }
    let t = mod[requireName];
    if (!t) {
        return;
    }
    if (t instanceof Object && dao) {
        if (dao["$file"]) {
            modCache_1.setDepend(dao["$file"], fileName);
        }
        t["$file"] = dao["$file"];
        t["$dao"] = dao;
    }
    else if (t instanceof Object) {
        t["$file"] = fileName;
    }
    return t;
}
exports.requireModule = requireModule;
//# sourceMappingURL=modRequirer.js.map