"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genGlobal = void 0;
const lua = require("./index");
/** 生成全局变量环境 */
function genGlobal(path) {
    const _G = {
        ["$local"]: {},
        ["$scope"]: undefined,
        ["$file"]: path.fileName,
    };
    // 加载全局变量或关键字
    let apis = lua.loadApiDoc(path, "_G");
    if (apis) {
        apis.forEach(api => {
            _G[api.name] = {
                name: api.name,
                args: api.args,
                doc: api.doc,
                "()": api.args && [] || undefined,
                kind: api.kind,
            };
        });
    }
    // 加载全局库
    let libs = ["io", "os", "string", "table", "math",
        "package", "debug", "coroutine", "ngx", "ndk"];
    libs.forEach(name => {
        _G[name] = lua.load(path, name);
    });
    _G["ipairs"] = {
        "()": ipairs,
        args: '(t)',
        doc: "## ipairs(t)\n迭代器"
    };
    _G["pairs"] = {
        "()": pairs,
        args: '(t)',
        doc: "## pairs(t)\n迭代器"
    };
    _G["pcall"] = {
        "()": pcall,
        args: '(fun, ...)',
        doc: "## pcall(fun, ...)\n执行函数"
    };
    _G["_load"] = {
        "()": _load,
        args: '(mod)',
        text: ' "${1}"',
        doc: "## _load(mod)\n加载模块"
    };
    _G["require"] = {
        "()": require,
        args: '(mod)',
        text: ' "${1}"',
        doc: "## require(mod)\n加载模块"
    };
    _G["setmetatable"] = {
        "()": setmetatable,
        args: '(t, mt)',
        doc: "## setmetatable(t, mt)\n设置元表"
    };
    return _G;
    /** 加载模块 */
    function require(name) {
        if (name === "cjson.safe") {
            name = "cjson";
        }
        if (typeof name === "string") {
            return lua.load(path, name);
        }
    }
    /** 加载模块 */
    function _load(name) {
        if (typeof name === "string") {
            return lua.load(path, name);
        }
    }
}
exports.genGlobal = genGlobal;
function getChild(obj, child) {
    if (!(obj instanceof Object)) {
        return;
    }
    let names = splitName(child);
    let t = obj;
    for (let i = 0; i < names.length; i++) {
        t = t[names[i]];
        if (!(obj instanceof Object)) {
            return;
        }
    }
    return t;
}
function splitName(name) {
    let names = [];
    // 按冒号分割字符串
    let arrI = name.trim().split(":");
    for (let i = 0; i < arrI.length; i++) {
        // 按点号分割字符串
        let arrJ = arrI[i].trim().split(".");
        for (let j = 0; j < arrJ.length; j++) {
            let s = arrJ[j].trim();
            s && names.push(s);
            j < arrJ.length - 1 && names.push(".");
        }
        i < arrI.length - 1 && names.push(":");
    }
    return names;
}
/** ipairs 迭代 */
function ipairs(t) {
    if (!(t instanceof Object))
        return;
    let ti = t["."];
    let ta = t["[]"];
    if (!(ti instanceof Object))
        ti = null;
    if (!(ta instanceof Object))
        ta = null;
    if (!ti && !ta)
        return;
    let i = 0;
    // 生成迭代函数
    return function () {
        i = i + 1;
        if (ta) {
            return i === 1 && [i, ta] || null;
        }
        else if (ti) {
            let v = ti[i];
            return v && [i, v] || null;
        }
    };
}
/** pairs 迭代 */
function pairs(t) {
    if (!(t instanceof Object))
        return;
    let arr = [];
    let ti = t["."];
    if (ti instanceof Object) {
        Object.keys(ti).forEach(k => {
            // if (!k.startsWith("$")) {
            arr.push(["." + k, ti[k]]);
            // }
        });
    }
    let ta = t[":"];
    if (ta instanceof Object) {
        Object.keys(ta).forEach(k => {
            // if (!k.startsWith("$")) {
            arr.push([":" + k, ta[k]]);
            // }
        });
    }
    let i = -1;
    // 生成迭代函数
    return function () {
        i = i + 1;
        return arr[i];
    };
}
/** 执行函数 */
function pcall(fun, ...args) {
    let res;
    if (typeof fun === "function") {
        res = fun(...args);
    }
    else if (fun instanceof Object) {
        fun = fun["()"];
        if (typeof fun === "function") {
            res = fun(...args);
        }
        else {
            res = fun["()"];
        }
    }
    if (res instanceof Array) {
        return [true, ...res];
    }
    else {
        return [true, res];
    }
}
/** 设置元表 */
function setmetatable(t, mt) {
    if (!(t instanceof Object)) {
        return t;
    }
    if (!(mt instanceof Object)) {
        return t;
    }
    let _index = getChild(mt, ".__index");
    if (_index instanceof Object) {
        // console.log("__index", _index);
        _index["mt"] = true;
        _index[":"] = _index[":"] || {};
        t[":"] = _index[":"];
    }
    let _call = getChild(mt, ".__call");
    if (_call instanceof Object) {
        // console.log("__call", _call);
        // _call["()"] = _call["()"] || [];
        if (_call["()"]) {
            t["()"] = _call["()"];
            t.args = _call.selfArgs || _call.args || "()";
        }
    }
    return t;
}
//# sourceMappingURL=global.js.map