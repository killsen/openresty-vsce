
import { Node, Comment } from 'luaparse';

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
export function toTable(obj: any, level = 0) {

    let t = getItem(obj, ["."]);
    if (!isObject(t)) { return obj; }

    // 避免互相引用或自己引用自己造成死循环
    if (level++ > 10) {return;}

    let r: any = {};

    Object.keys(t).forEach(k => {
        r[k] = toTable(t[k], level);
    });

    return r;

}


/** 是否在作用域内 */
export function isInScope(node: Node, $$node: Node) {

    let loc = node.loc;
    let $$loc = $$node.loc;

    if (!loc || !$$loc) { return false; }

    if (loc.start.line > $$loc.start.line) {return false;}
    if (loc.end.line < $$loc.end.line) {return false;}

    if (loc.start.line === $$loc.start.line && loc.start.column > $$loc.start.column) {return false;}
    if (loc.end.line === $$loc.end.line && loc.end.column < $$loc.end.column) {return false;}

    return true;

}

/** 检查作用域是否下面 */
export function isDownScope(node: Node, $$node: Node) {

    let loc = node.loc;
    let $$loc = $$node.loc;

    if (!loc || !$$loc) { return false; }

    return loc.start.line > $$loc.end.line;

}

/** 解析注释中的类型定义 */
export function parseComments(comments: Comment[] | undefined) {

    if (!comments) {return;}

    let $$comm: { [key: number]: { name: string, value: string, desc: string } } = {};

    comments.forEach(c => {
        let loc = c.loc;
        if (!loc) {return;}
        if (loc.start.line !== loc.end.line) {return;}

        let str = c.value.trim();
        let desc = "";

        // 外部构造器 @@@
        if (str.startsWith("@@@") && str.indexOf(":") !== -1 ) {
            let arr = str.split(":");
            arr = arr[1].split("--");
            let value = arr[0].trim();
            $$comm[loc.start.line] = { name: "@@@",  value, desc };
            return;
        }

        // 构造器 @@ <Constructor>
        if (str.startsWith("@@")) {
            $$comm[loc.start.line] = { name: "@@",  value: "<Constructor>", desc };
            return;
        }

        if (!str.startsWith("@")) {
            desc = str.trim();
            $$comm[loc.start.line] = { name: "", value: "", desc };
            return;
        }

        // @req : $pos_dd_store  // 后面是注释
        let arr = str.split(":");
        if (arr.length !== 2) {return;}

        let name = arr[0].replace(/[@\s]/g, "");
        arr = arr[1].split("//");
        let value = arr[0].trim();
        desc = (arr[1] || "").trim();

        if (!name || !value) {return;}

        $$comm[loc.start.line] = { name, value, desc };
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
