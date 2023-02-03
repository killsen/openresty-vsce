
import { callFunc } from '../modFunc';
import { LuaAny, LuaBoolean, LuaNil, LuaNumber, LuaString, LuaTable } from '../types';
import { getItem, isArray, isObject, setItem } from "../utils";
import { _unpack } from "./TableLib";

export const GlobalLib = {
    tonumber: _tonumber,
    tostring: _tostring,
    unpack  : _unpack,
    print : _print,
    type : _type,
    ipairs : _ipairs,
    pairs :  _pairs,
    pcall : _pcall,
    xpcall : _xpcall,
    setmetatable : _setmetatable,
    getmetatable : _getmetatable,
    rawget : _rawget,
    rawset : _rawset,
};

// 转数字
function _tonumber(v: any) {
    let t = typeof v;
    let num = Number(v);
    return v === null        ? LuaNil
        :  t === "string"    ? ( isNaN(num) ? LuaNil : num )
        :  t === "number"    ? v
        :  t === "boolean"   ? LuaNil
        :  LuaNumber;
}

// 转字符串
function _tostring(v: any) {
    let t = typeof v;
    return v === null       ? "nil"
        :  t === "string"   ? String(v)
        :  t === "number"   ? String(v)
        :  t === "boolean"  ? String(v)
        :  LuaString;
}

// 打印输出
function _print(...args: any[]) {
    console.log(...args);
}

// 返回变量类型
function _type(v: any) {

    if (!isObject(v)) {
        let t = typeof v;
        return v === null       ? "nil"
            :  v === undefined  ? LuaString
            :  t === "string"   ? "string"
            :  t === "number"   ? "number"
            :  t === "boolean"  ? "boolean"
            :  t === "function" ? "function"
            :  LuaString;
    } else {
        let t = v.type;
        return t === "string"   ? "string"
            :  t === "number"   ? "number"
            :  t === "boolean"  ? "boolean"
            :  t === "thread"   ? "thread"
            :  v["$$mt"]        ? "table"
            :  v["()"]          ? "function"
            :  v["."]           ? "table"
            :  v[":"]           ? "table"
            :  v["[]"]          ? "table"
            :  LuaString;
    }

}

/** ipairs 迭代 */
function _ipairs(t: any) {

    const ti = getItem(t, ["."]);
    const ta = getItem(t, ["[]"]);

    let i = 0;

    const iter = {
        "()" : () => {
            i++;
            if (ta) {
                return i===1 ? [ LuaNumber, ta ] : undefined;
            } else {
                const val = isObject(ti) && ti[i];
                return val   ? [ i, val ]
                    :  i===1 ? [ LuaNumber, LuaAny ]
                    :  undefined;
            }
        },
        type : "lib",
        doc  : "## iter(table, index) \n ipairs 迭代函数",
        args : "(table, index)",
        readonly: true,
    };

    return [ iter, t, 0 ];

}

/** pairs 迭代 */
function _pairs(t: any) {

    const arr = [] as [any, any][];

    let ti = getItem(t, ["."]);
    if (isObject(ti)) {
        for (let k in ti) {
            k !== "*" && !k.startsWith("$") && arr.push([ Number(k) || k, ti[k] ]);
        }
        for (let k in ti) {
            // $ 字段信息放后面
            k !== "*" && k.startsWith("$") && arr.push([ k, ti[k] ]);
        }
        if (ti["*"]) {
            arr.push([ LuaAny, ti["*"] ]);
        }
    }

    ti = getItem(t, [":"]);
    if (isObject(ti)) {
        for (let k in ti) {
            k !== "*" && !k.startsWith("$") && arr.push([ ":" + k, ti[k] ]);
        }
        for (let k in ti) {
            // $ 字段信息放后面
            k !== "*" && k.startsWith("$") && arr.push([ ":" + k, ti[k] ]);
        }
    }

    ti = getItem(t, ["[]"]);
    if (ti) {
        arr.push([ LuaNumber, ti ]);
    }

    if (arr.length === 0) {
        arr.push([LuaAny, LuaAny]);
    }

    let i = 0;
    const iter = {
        "()" : () => arr[i++],
        doc  : "## iter(table, key) \n pairs 迭代函数",
        args : "(table, key)",
        type : "lib",
        readonly: true,
    };

    return [ iter, t, null ];

}

/** 执行函数 */
function _pcall(fun: any, ...args: any) {

    const res = callFunc(fun, ...args);

    if (isArray(res)) {
        return [LuaBoolean, ...res];
    } else {
        return [LuaBoolean, res];
    }

}

/** 执行函数 */
function _xpcall(fun: any) {
    return _pcall(fun);
}

/** 设置元表 */
function _setmetatable(t: any, mt: any) {

    if (isObject(t) && isObject(mt)) {
        t["$$mt"] = mt;
    }

    return t;

}

/** 获取元表 */
function _getmetatable(t: any) {
    return getItem(t, ["$$mt"]);
}

/** 获取表对应key的值(不触发元表__index) */
function _rawget(t: LuaTable, k: string) {
    return getItem(t, [".", k]);
}

/** 设置表对应key的值(不触发元表__newindex) */
function _rawset(t: LuaTable, k: string, v: any) {
    setItem(t, [".", k], v);
}
