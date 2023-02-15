
import { LuaFunction, LuaNumber, LuaString } from '../types';
import { getItem, isObject } from "../utils";

export const TableLib = {
    new  : _new,
    clear : _clear,
    clone : _clone,
    concat : _concat,
    insert :  _insert,
    getn : _getn,
    maxn : _maxn,
    nkeys : _nkeys,
    move : _move,
    remove : _remove,
    sort : [],
    pack : _pack,
    unpack :_unpack,
    foreach : [],
    foreachi : [],
};

/** 封装数组接口 */
export function wrapArray(T: any) {

    if (!isObject(T)) { return; }

    const I = T["[]"];
    if (!isObject(I)) { return; }

    const S = LuaString;
    const N = LuaNumber;
    const F = LuaFunction;

    let name: string = typeof I.type === "string" ? I.type : "";
    name = name.replace(/:\s*\w+/g, "");
    if (name && name.length < 25) {
        name = `v: ${ name }`;
    } else {
        name = "v";
    }

    {return {
        clear   : { doc: "清空数组", "()" : [   ], args: "()", },
        clone   : { doc: "克隆数组", "()" : [ T ], args: "()",  },
        concat  : { doc: "连接元素", "()" : [ S ], args: "(sep, start?, end?)", $args: [ S, N, N ] },
        insert  : { doc: "插入元素", "()" : [   ], args: `(${ name })`, $args: [ I ] },

        getn    : { doc: "连续数字索引最大值"   , "()" : [ N ], args: "()", },
        maxn    : { doc: "所有数字索引最大值"   , "()" : [ N ], args: "()", },
        nkeys   : { doc: "所有元素的个数"       , "()" : [ N ], args: "()", },

        move    : { doc: "移动元素", "()" : [ I ], args: "(i, j, k, t2?)", $args: [ N, N, N, I ]  },
        remove  : { doc: "删除元素", "()" : [ I ], args: "(i?)", $args: [ N ] },
        sort    : { doc: "数组排序", "()" : [   ], args: "( function(t1, t2) ... end )", $args: [ F ] },
        foreachi: { doc: "数组遍历", "()" : [   ], args: "( function(i, v) ... end )"  , $args: [ F ],  },
    };}

}

// 创建表
function _new () {
    return {
        ".": {}
    };
}

// 清空表
function _clear (t: any) {
    if (!isObject(t)) {return;}
    if (t.readonly) {return;}
    for (let k in t) {
        if (k !== "#") {
            delete t[k];
        }
    }
    t["."] = {};
}

// 克隆表
function _clone (t: any) {
    if (!isObject(t)) {return {};}
    return {
        ...t,
        ["."] : { ... isObject(t["."]) ? t["."] : {} }
    };
}

// 取得最大的连续数字索引
export function _getn (t: any) {

    if (!isObject(t)) {return 0;}
    let ti = t["."];
    if (!isObject(ti)) {return 0;}

    let keys = Object.keys(ti);

    let n = typeof t["#"] === "number" ? t["#"] : 0;
    if (n > 0) {
        let v = ti[n];
        if (v === null || v === undefined) {
            n = 0;
        }
    }

    for (let i=n+1; i<=keys.length; i++) {
        let v = ti[i];
        if (v !== null && v !== undefined) {
            n = i;
        } else {
            break;
        }
    }

    return n;

}

// 取得最大的数字索引
function _maxn (t: any) {

    if (!isObject(t)) {return 0;}
    let ti = t["."];
    if (!isObject(ti)) {return 0;}

    let n = 0;
    for (let k in ti) {
        let v = ti[k];
        if (v !== null && v !== undefined) {
            let kn = Number(k);
            if (kn && kn > n) {
                n = kn;
            }
        }
    }
    return n;

}

// 取得全部key的个数
function _nkeys (t: any) {

    if (!isObject(t)) {return 0;}
    let ti = t["."];
    if (!isObject(ti)) {return 0;}

    let n = 0;
    for (let k in ti) {
        if (!`${ k }`.startsWith("$")) {
            let v = ti[k];
            if (v !== null && v !== undefined) {
                n ++;
            }
        }
    }
    return n;

}

// 移动元素
function _move (t: any, i: number, j:number, k:number, t2?: any) {

    if (arguments.length < 4) { return; }

    if (!isObject(t)) {return;}
    if (t.readonly) {return getItem(t, ["[]"]) ;}
    let ti = t["."];
    if (!isObject(ti)) {return;}

    if (typeof i !== "number") { return; }
    if (typeof j !== "number") { return; }
    if (typeof k !== "number") { return; }

    let to: any = {};

    for (let x=i; x<=j; x++) {
        let y = k + x - i;
        to[y] = ti[x];
        to['$'+y+'$'] = ti['$'+x+'$'];
    }

    if (arguments.length === 4) {
        t2 = t;
    }

    t2 = isObject(t2) ? t2 : {};
    t2["."] = { ...isObject(t2["."]) ? t2["."] : {}, ...to };

    return t2;

}

// 移除元素
function _remove (t: any, pos?: number) {

    if (!isObject(t)) {return;}
    if (t.readonly) {return;}
    let ti = t["."];
    if (!isObject(ti)) {return;}

    let n = _getn(t);
    if (n === 0) {return;}

    pos = typeof pos === "number" ? pos : n;

    for (let k = pos; k <= n; k++) {
        if (k+1 in ti) {
            ti[k] = ti[k+1];
            ti['$'+k+'$'] = ti['$'+(k+1)+'$'];
        } else {
            delete ti[k];
            delete ti['$'+k+'$'];
            break;
        }
    }

}

// 插入元素
function _insert (t: any, pos?: number, value?: any) {

    if (value === null || value === undefined) {return;}

    if (!isObject(t)) {return;}
    if (t.readonly) {return;}
    if (arguments.length < 2) {return;}

    let ti = t["."] = isObject(t["."]) ? t["."] : {};

    let n = _getn(t);

    if (arguments.length === 2) {
        value = pos;
        pos = n + 1;
    }

    pos = typeof pos === "number" ? pos : n + 1;

    for (let k = n+1; k >= pos; k--) {
        ti[k] = ti[k-1];
        ti['$'+k+'$'] = ti['$'+(k-1)+'$'];
    }

    ti[pos] = value;
    delete ti['$'+pos+'$'];

}

// 返回元素
export function _unpack(t: any, i?: number, j?: number) {

    let arr : any[] = [];

    if (!isObject(t)) {return arr;}
    let ti = t["."];
    if (!isObject(ti)) {return arr;}

    i = typeof i === "number" ? i : 1;
    j = typeof j === "number" ? j : _getn(t);

    for (let k = i; k <= j; k++) {
        let v = ti[k];
        arr.push(v);
    }

    return arr;

}

// 传入多个元素创建表
function _pack(...args: any[]) {

    let n  = args.length;
    let ti = { n } as any;

    args.forEach((v, i) => {
        ti[i+1] = v;
    });

    return {
        "." : ti,
        "#" : n,
    };

}

// 合并字符串
function _concat(t: any, sep: string, i?:number, j?:number) {

    let arr : any[] = [];

    if (!isObject(t)) {return LuaString;}
    let ti = t["."];
    if (!isObject(ti)) {return LuaString;}

    i = typeof i === "number" ? i : 1;
    j = typeof j === "number" ? j : _getn(t);

    for (let k = i; k <= j; k++) {
        let v = ti[k];
        if (typeof v === "string" || typeof v === "number") {
            arr.push(v);
        } else {
            return LuaString;
        }
    }

    sep = typeof sep === "string" ? sep : "";

    return arr.join(sep);

}

