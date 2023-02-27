
import { Node } from 'luaparse';
import { callFunc } from '../modFunc';
import { loadNode } from '../parser';
import { LuaScope } from '../scope';
import { getLuaTypeName, LuaAny, LuaAnyArray, LuaBoolean, LuaFunction, LuaNil, LuaNumber, LuaTable, LuaString } from '../types';
import { getItem, isArray, isObject, setItem } from "../utils";
import { get_arg_vtype } from '../vtype';
import { _unpack } from "./TableLib";

_ipairs         ["$args"] = [ LuaAnyArray               ];
_pairs          ["$args"] = [ LuaTable                 ];
_xpcall         ["$args"] = [ LuaFunction               ];
_setmetatable   ["$args"] = [ LuaTable, LuaTable      ];
_getmetatable   ["$args"] = [ LuaTable                 ];
_rawget         ["$args"] = [ LuaTable, LuaAny         ];
_rawset         ["$args"] = [ LuaTable, LuaAny, LuaAny ];

export const GlobalLib : { [key: string] : Function } = {
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

    let t = getLuaTypeName(v);
    if (t === "any" || t === "never") {
        return LuaString;
    } else {
        return t;
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
            if (k !== "*" && !k.startsWith("$")) {
                if (isNaN(Number(k))) {
                    arr.push([ k, ti[k] ]);
                    k = "$" + k + "$";
                    if (k in ti) {
                        arr.push([ k, ti[k] ]);
                    }
                } else {
                    arr.push([ Number(k), ti[k] ]);
                }
            }
        }
        if (ti["*"]) {
            arr.push([ LuaAny, ti["*"] ]);
        }
    }

    ti = getItem(t, [":"]);
    if (isObject(ti)) {
        for (let k in ti) {
            if (k !== "*" && !k.startsWith("$")) {
                arr.push([ ":" + k, ti[k] ]);
                k = "$" + k + "$";
                if (k in ti) {
                    arr.push([ ":" + k, ti[k] ]);
                }
            }
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

_pcall.$args = function (i: number, args: Node[] = [], _g: LuaScope) {

    if (i === 0) {
        return LuaFunction;
    } else if (i > 0) {
        let funt = loadNode(args[0], _g);   // 第 1 个参数为函数
        let argt = args.slice(1);           // 去掉前 1 个参数
        return get_arg_vtype(funt, i-1, argt, _g);
    }

};


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
function _rawget(t: any, k: string) {
    return getItem(t, [".", k]);
}

/** 设置表对应key的值(不触发元表__newindex) */
function _rawset(t: any, k: string, v: any) {
    setItem(t, [".", k], v);
}
