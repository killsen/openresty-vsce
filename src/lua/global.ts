
import * as lua from './index';
import { NgxPath } from "./ngx";
import { LuaScope, newScope, setValue } from "./scope";
import { getItem, setItem } from "./utils";
import { LuaString, LuaObject } from "./types";
import { _unpack } from "./libs/TableLib";
import { GlobalLib } from "./libs/GlobalLib";

// Lua的关键字
const KeyWords = [
    "and", "break", "do", "else", "elseif", "end", "false", "for",
    "function", "if", "in", "local", "nil", "not", "or", "repeat",
    "return", "then", "true", "until", "while", "goto",
];

// 内置全局库
const BuildInLibs = [
    "io", "os", "string", "math", "table",
    "package", "debug", "coroutine",
    "ngx", "ndk",
];

/** 加载全局库 */
function loadGlobal(ctx: NgxPath) {

    let mod = lua.load(ctx, "_G");

    let _G = (mod && mod["."] || {}) as LuaScope;
    if (_G.$inited) { return _G; }

    _G.$inited = true;
    _G.$global = true;
    _G.$root   = true;
    _G.$scope  = undefined;
    _G.$file   = "buildin";

    const _g: LuaObject = {};

    _G["_G"] = {
        type: "lib",
        doc: "## 全局变量 _G",
        readonly: true,
        ".": _g, // 全局库
        ":": {},
        "$$mt": {
            ".": {
                "__index": {  // 通过 __index 元方法返回其它全局变量
                    "()": (self: any, key: string) => _G[key]
                }
            }
        }
    };

    // 加载关键字或保留字
    KeyWords.forEach(name => {
        _G[name] = {
            readonly: true,
            type: "keyword",
        };
    });

    // 注入全局函数
    for (let k in GlobalLib) {
        setItem(_G, [k, "()"], GlobalLib[k]);
    }

    // 注入全局库
    BuildInLibs.forEach(name => {
        _G[name] = _g[name] = lua.load(ctx, name);
    });

    return _G;

}

/** 生成全局变量环境 */
export function genGlobal(ctx: NgxPath) {

    const _G = loadGlobal(ctx);
    const _g = newScope(_G, ctx.fileName);

    // 注入字符串类型
    _G["$type<@string>"] = getItem(_G, [ "string", ".", "$type<@string>" ]);

    // 注入文件类型
    _G["$type<@file>"] = getItem(_G, [ "io", ".", "$type<@file>" ]);

    _g["_load"] = _g["require"] = {
        "()": _require,
        args: '(modname: string)',
        argsMin: 1,
        $args: [ LuaString ],
        $argx: '(modname: string) => any',
        doc: "加载模块",
    };

    return _g;

    /** 加载模块 */
    function _require(name: string) {
        if ( typeof name !== "string" ) { return; }
        if ( name === "cjson.safe" ) { name = "cjson"; }

        return name in _G ? _G[name]
            :  name === "table.new"   ? getItem(_G, ["table", ".", "new"])
            :  name === "table.nkeys" ? getItem(_G, ["table", ".", "nkeys"])
            :  name === "table.clone" ? getItem(_G, ["table", ".", "clone"])
            :  name === "table.clear" ? getItem(_G, ["table", ".", "clear"])
            :  lua.load(ctx, name);
    }

}
