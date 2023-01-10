import { isObject } from "./utils";

export const TableLib = {
    type        : "lib",
    doc         : "## table 库",
    $file       : "buildin",
    readonly    : true,

    "." : {
        new : {
            "()": _new,
            args: '(narray, nhash)',
            doc: "## new(narray, nhash)\n用来预分配 table 空间",
        },
        clear : {
            "()": _clear,
            args: '(t)',
            doc: "## clear(t)\n用来高效的释放 table 空间",
        },
        clone : {
            "()": _clone,
            args: '(t)',
            doc: "## clone(t)\n克隆 table 对象",
        },
        concat : {
            "()": _concat,
            args: '(t, sep, start?, end?)',
            doc: "## concat(t, sep, start?, end?)\n连接 table 元素, 以指定的分隔符(sep)隔开",
        },
        insert : {
            "()": _insert,
            args: '(t, [pos,] value)',
            doc: "## insert(t, [pos,] value)\n插入 table 元素",
        },
        getn : {
            "()": _getn,
            args: '(t)',
            doc: "## getn(t)\n返回 table 连续的数字索引最大值, 等价于 #table",
        },
        maxn : {
            "()": _maxn,
            args: '(t)',
            doc: "## maxn(t)\n取得 table 数字索引最大值",
        },
        nkeys : {
            "()": _nkeys,
            args: '(t)',
            doc: "## nkeys(t)\n返回 table 所有元素个数",
        },
        move : {
            "()": _move,
            args: '(t, i, j, k, t2?)',
            doc: "## move(t, i, j, k, t2?)\n移动 table 元素",
        },
        remove : {
            "()": _remove,
            args: '(t, pos?)',
            doc: "## remove(t, pos?)\n删除 table 元素",
        },
        sort : {
            "()": [],
            args: '(t, func?)',
            doc: "## sort(t, func?)\n排序 table 元素",
        },
        pack : {
            "()": _pack,
            args: '(...)',
            doc: "## pack(...)\n传入多个元素创建 table",
        },
        unpack : {
            "()": _unpack,
            args: '(t)',
            doc: "## unpack(t)\n返回 table 所有元素",
        },
        foreach : {
            "()": [],
            args: '(t, function(k, v) ... end)',
            doc: "## foreach(t, function(k, v) ... end)\n遍历 table 所有元素",
        },
        foreachi : {
            "()": [],
            args: '(t, function(i, v) ... end)',
            doc: "## foreachi(t, function(i, v) ... end)\n遍历 table 数组元素",
        },

    }
};

// 创建表
function _new () {
    return {
        ".": {}
    };
}

// 清空表
function _clear (t: any) {
    if (!isObject(t)) {return;}
    t["."] = {};
    delete t["$$mt"];
    delete t["()"];
    delete t[":"];
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

    let n = 0;
    for (let i=1; i<=keys.length; i++) {
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

    if (!isObject(t)) {return;}
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
function _unpack(t: any, i?: number, j?: number) {

    let arr : any[] = [];

    if (!isObject(t)) {return arr;}
    let ti = t["."];
    if (!isObject(ti)) {return arr;}

    let n = ti["n"];

    i = typeof i === "number" ? i : 1;
    j = typeof j === "number" ? j :
        typeof n === "number" ? n : _getn(t);

    for (let k = i; k <= j; k++) {
        let v = ti[k];
        arr.push(v);
    }

    return arr;

}

// 传入多个元素创建表
function _pack(...args: any[]) {

    let t = { ".": {} };
    let ti = t["."] as any;

    args.forEach((v, i) => {
        ti[i+1] = v;
    });

    ti["n"] = args.length;

    return t;

}

// 合并字符串
function _concat(t: any, sep: string, i?:number, j?:number) {

    let arr : any[] = [];

    if (!isObject(t)) {return arr;}
    let ti = t["."];
    if (!isObject(ti)) {return arr;}

    let n = ti["n"];

    i = typeof i === "number" ? i : 1;
    j = typeof j === "number" ? j :
        typeof n === "number" ? n : _getn(t);

    for (let k = i; k <= j; k++) {
        let v = ti[k];
        if (typeof v === "string" || typeof v === "number") {
            arr.push(v);
        }
    }

    sep = typeof sep === "string" ? sep : "";

    return arr.join(sep);

}
