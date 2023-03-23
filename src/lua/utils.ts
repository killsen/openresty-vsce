
import { Node, Comment } from 'luaparse';
import { getLuaTypeName } from './types';

/** 是否为假: nil 或者 false */
export function isFalse(t: any) {
    return t === false || isNil(t);
}

/** 是否为真: 非 nil 且非 false */
export function isTrue(t: any) {
    return !isFalse(t);
}

/** 是否为空: nil */
export function isNil(t: any) {
    if (isObject(t)) {
        return !t["type"] && !t["."] && !t[":"] && !t["()"] &&
                Object.keys(t).length === 0;
    } else {
        return t === undefined || t === null;
    }
}

/** 是否数组 */
export function isArray(t: any) {
    return typeof t !== "function"
        && t instanceof Array;
}

/** 是否对象 */
export function isObject(t: any) {
    return typeof t !== "function"
        && !(t instanceof Array)
        && (t instanceof Object);
}

/** 是否表 */
export function isModule(t: any) {
    return typeof t !== "function"
        && !(t instanceof Array)
        && (t instanceof Object)
        && (t["."] instanceof Object);
}

export function getItem(t: any, keys: string[]) {

    if (!isObject(t)) { return; }

    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        t = t[k];

        if (i === keys.length - 1) {
            return t;
        } else if (!isObject(t)) {
            return;
        }
    }

}

export function setItem(t: any, keys: string[], val: any) {

    if (!isObject(t)) { return; }

    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (i === keys.length - 1) {
            t[k] = val;
        } else {
            if (!isObject(t[k])) {
                t = t[k] = {};
            }else{
                t = t[k];
            }
        }
    }

}

export function delItem(t: any, keys: string[]) {

    if (!isObject(t)) { return; }

    for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        if (i === keys.length - 1) {
            delete t[k];
        } else {
            t = t[k];
            if (!isObject(t)) { return; }
        }
    }

}

/** 复制对象 */
export function copyItems(from: any, to: any) {

    if (!isObject(from) || !isObject(to)) { return; }

    Object.keys(from).forEach(k=>{
        to[k] = from[k];
    });

}

// { ".": { key: val } } -->> { key: val }
export function toTable(mod: any, level = 0) {

    // 避免互相引用或自己引用自己造成死循环
    if (level > 10) { return; }

    const ti = getItem(mod, ["."]);
    if (!isObject(ti)) { return; }

    const obj: any = {};

    Object.keys(ti).forEach(k => {
        let v = ti[k];
        if (v === undefined || v === null) { return; }
        if (typeof v === "function" || isArray(v)) { return; }

        if (k.startsWith("$") || !isObject(v)) {
            obj[k] = v;
            return;
        }

        let type = getLuaTypeName(v);
        if (type === "table") {
            obj[k] = toTable(v, level + 1) || "table";
        } else {
            obj[k] = type;
        }

    });

    return obj;

}

type NodeX = { loc?: Node["loc"] };

/** 是否在作用域内 */
export function isInScope(node: NodeX, $$node: NodeX) {

    let loc = node?.loc;
    let $$loc = $$node?.loc;

    if (!loc || !$$loc) { return false; }

    if (loc.start.line > $$loc.start.line) {return false;}
    if (loc.end.line < $$loc.end.line) {return false;}

    if (loc.start.line === $$loc.start.line && loc.start.column > $$loc.start.column) {return false;}
    if (loc.end.line === $$loc.end.line && loc.end.column < $$loc.end.column) {return false;}

    return true;

}

/** 检查作用域是否下面 */
export function isDownScope(node: NodeX, $$node: NodeX) {

    let loc = node?.loc;
    let $$loc = $$node?.loc;

    if (!loc || !$$loc) { return false; }

    return loc.start.line > $$loc.end.line;

}

/** 解析注释中的类型定义 */
export function parseComments(comments: Comment[] | undefined) {

    if (!comments) { return; }

    let $$comm: { [key: number]: { name: string, value: string, desc: string } } = {};

    comments.forEach(c => {
        // 单行注释
        if (!c.loc || c.loc.start.line !== c.loc.end.line) { return; }

        const line = c.loc.start.line;
        const text = c.raw.trim();

        // -- @@@ : %wx -- 外部构造函数
        let m = text.match(/^--\s*(?<name>@@@)\s*:\s*(?<value>\S+)\s*(--\s*(?<desc>.*))?/);
        if (m && m.groups) {
            $$comm[line] = {
                name  : m.groups.name,
                value : m.groups.value,
                desc  : m.groups.desc || "",
            };
            return;
        }

        // -- @@ <Constructor> -- 内部构造器
        m = text.match(/^--\s*(?<name>@@)\s*/);
        if (m && m.groups) {
            $$comm[line] = {
                name  : m.groups.name,
                value : "<Constructor>",
                desc  : "",
            };
            return;
        }

        // -- @req : $pos_dd_store  // 参数类型声明
        m = text.match(/^--\s*@(?<name>\w+)\s*:\s*(?<value>.+)/);
        if (m && m.groups) {
            let name  = m.groups.name;
            let value = m.groups.value.trim();
            let desc  = "";

            let pos = value.indexOf("//");
            if (pos !== -1) {
                desc = value.substring(pos+2).trim();
                value = value.substring(0, pos).trim();
            }

            $$comm[line] = { name, value, desc };
            return;
        }

    });

    return $$comm;

}

/** 查找模块某个值所在的完整keys */
export function findKeys(mod: any, key: string, val: any) {

    let keys: string[] = [];

    if (!(mod instanceof Object)) {return;}

    if (findNode(mod)) {return keys.reverse();}

    function findNode(t: any) {
        if (!(t instanceof Object)) {return;}

        let ti = t["."];
        if (!(ti instanceof Object)) {return;}

        let isFound = false;

        Object.keys(ti).forEach(k=>{
            if (isFound) {return;}
            if (k.startsWith("$")) {return;}

            let v = ti[k];
            if (/\d+/.test(k) && v instanceof Object && v[key] === val) {
                keys.push(".");
                isFound = true;

            } else if (findNode(v)) {
                if (/\d+/.test(k)) {
                    keys.push("[]");

                } else {
                    keys.push(k);
                    keys.push(".");
                }

                isFound = true;
            }
        });

        return isFound;
    }

}
