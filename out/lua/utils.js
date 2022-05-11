"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findKeys = exports.parseComments = exports.isDownScope = exports.isInScope = exports.toTable = exports.copyItems = exports.delItem = exports.setItem = exports.getItem = exports.isModule = exports.isObject = exports.isArray = void 0;
/** 是否数组 */
function isArray(t) {
    return typeof t !== "function"
        && t instanceof Array;
}
exports.isArray = isArray;
/** 是否对象 */
function isObject(t) {
    return typeof t !== "function"
        && !(t instanceof Array)
        && (t instanceof Object);
}
exports.isObject = isObject;
/** 是否表 */
function isModule(t) {
    return typeof t !== "function"
        && !(t instanceof Array)
        && (t instanceof Object)
        && (t["."] instanceof Object);
}
exports.isModule = isModule;
function getItem(t, keys) {
    if (!isObject(t)) {
        return;
    }
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        t = t[k];
        if (i === keys.length - 1) {
            return t;
        }
        else if (!isObject(t)) {
            return;
        }
    }
}
exports.getItem = getItem;
function setItem(t, keys, val) {
    if (!isObject(t)) {
        return;
    }
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (i === keys.length - 1) {
            t[k] = val;
        }
        else {
            if (!isObject(t[k])) {
                t = t[k] = {};
            }
            else {
                t = t[k];
            }
        }
    }
}
exports.setItem = setItem;
function delItem(t, keys) {
    if (!isObject(t)) {
        return;
    }
    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (i === keys.length - 1) {
            delete t[k];
        }
        else {
            t = t[k];
            if (!isObject(t)) {
                return;
            }
        }
    }
}
exports.delItem = delItem;
/** 复制对象 */
function copyItems(from, to) {
    if (!isObject(from) || !isObject(to)) {
        return;
    }
    Object.keys(from).forEach(k => {
        to[k] = from[k];
    });
}
exports.copyItems = copyItems;
// { ".": { key: val } } -->> { key: val }
function toTable(obj) {
    let t = getItem(obj, ["."]);
    if (!isObject(t)) {
        return obj;
    }
    let r = {};
    Object.keys(t).forEach(k => {
        r[k] = toTable(t[k]);
    });
    return r;
}
exports.toTable = toTable;
/** 是否在作用域内 */
function isInScope(node, $$node) {
    let loc = node.loc;
    let $$loc = $$node.loc;
    if (!loc || !$$loc) {
        return false;
    }
    if (loc.start.line > $$loc.start.line)
        return false;
    if (loc.end.line < $$loc.end.line)
        return false;
    if (loc.start.line === $$loc.start.line && loc.start.column > $$loc.start.column)
        return false;
    if (loc.end.line === $$loc.end.line && loc.end.column < $$loc.end.column)
        return false;
    return true;
}
exports.isInScope = isInScope;
/** 检查作用域是否下面 */
function isDownScope(node, $$node) {
    let loc = node.loc;
    let $$loc = $$node.loc;
    if (!loc || !$$loc) {
        return false;
    }
    return loc.start.line > $$loc.end.line;
}
exports.isDownScope = isDownScope;
/** 解析注释中的类型定义 */
function parseComments(comments) {
    if (!comments)
        return;
    let $$comm = {};
    comments.forEach(c => {
        let loc = c.loc;
        if (!loc)
            return;
        if (loc.start.line !== loc.end.line)
            return;
        let str = c.value.trim();
        let desc = "";
        // 外部构造器 @@@
        if (str.startsWith("@@@") && str.indexOf(":") !== -1) {
            let arr = str.split(":");
            arr = arr[1].split("--");
            let value = arr[0].trim();
            $$comm[loc.start.line] = { name: "@@@", value, desc };
            return;
        }
        // 构造器 @@ <Constructor>
        if (str.startsWith("@@")) {
            $$comm[loc.start.line] = { name: "@@", value: "<Constructor>", desc };
            return;
        }
        if (!str.startsWith("@")) {
            desc = str.trim();
            $$comm[loc.start.line] = { name: "", value: "", desc };
            return;
        }
        // @req : $pos_dd_store  // 后面是注释
        let arr = str.split(":");
        if (arr.length !== 2)
            return;
        let name = arr[0].replace(/[\@\s]/g, "");
        arr = arr[1].split("//");
        let value = arr[0].trim();
        desc = (arr[1] || "").trim();
        if (!name || !value)
            return;
        $$comm[loc.start.line] = { name, value, desc };
    });
    return $$comm;
}
exports.parseComments = parseComments;
/** 查找模块某个值所在的完整keys */
function findKeys(mod, key, val) {
    let keys = [];
    if (!(mod instanceof Object))
        return;
    if (findNode(mod))
        return keys.reverse();
    function findNode(t) {
        if (!(t instanceof Object))
            return;
        let ti = t["."];
        if (!(ti instanceof Object))
            return;
        let isFound = false;
        Object.keys(ti).forEach(k => {
            if (isFound)
                return;
            if (k.startsWith("$"))
                return;
            let v = ti[k];
            if (/\d+/.test(k) && v instanceof Object && v[key] === val) {
                keys.push(".");
                isFound = true;
            }
            else if (findNode(v)) {
                if (/\d+/.test(k)) {
                    keys.push("[]");
                }
                else {
                    keys.push(k);
                    keys.push(".");
                }
                isFound = true;
            }
        });
        return isFound;
    }
}
exports.findKeys = findKeys;
//# sourceMappingURL=utils.js.map