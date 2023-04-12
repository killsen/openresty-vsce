
import * as lua from './index';
import { NgxPath, getLuaFiles, getClibFiles, getLinkFiles } from "./ngx";
import { getValue, LuaScope, newScope } from "./scope";
import { getItem, setItem } from "./utils";
import { LuaString, LuaObject, LuaBoolean, LuaTable, LuaCData, LuaAny } from "./types";
import { _unpack } from "./libs/TableLib";
import { GlobalLib } from "./libs/GlobalLib";
import { Node } from 'luaparse';
import { loadNode } from './parser';
import { addLint } from './vtype';

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

// 其它内置模块
const BuildInFuns = {
    "table.isempty" : {
        "()": [ LuaBoolean ],
        args: '(t: table)',
        argsMin: 1,
        $args: [ LuaTable ],
        $argx: '(t: table) => boolean',
        doc: "检查是否空表",
        readonly: true,
    },
    "table.isarray" : {
        "()": [ LuaBoolean ],
        args: '(t: table)',
        argsMin: 1,
        $args: [ LuaTable ],
        $argx: '(t: table) => boolean',
        doc: "检查是否数组",
        readonly: true,
    },
    "thread.exdata" : {
        "()": [ LuaCData ],
        args: '(data?)',
        argsMin: 0,
        $args: [ LuaAny ],
        $argx: '(data?) => cdata',
        doc: "获取当前线程的扩展数据",
        readonly: true,
    }
};

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

    _g["require"] = {
        "()": _require,
        args: '(modname: string)',
        argsMin: 1,
        $args: _require_args,
        $argx: '(modname: string) => module',
        doc: "加载模块",
        readonly: true,
    };

    // app 项目代码才导入
    if (ctx.appName) {
        _g["_load"] = _g["require"];
        _g["_unload"] = {
            "()": [],
            args: '()',
            argsMin: 0,
            $args: [],
            $argx: '() => void',
            doc: "卸载模块",
            readonly: true,
        };
    }

    return _g;

    /** 检查模块文件是否存在 */
    function _require_args (i: number, args: Node[] = [], _s: LuaScope) {
        if (i === 0) {
            if (args.length > 0 && getValue(_s, "$$lints")) {
                const node = args[0];
                const name = loadNode(node, _s);
                if ( typeof name === "string" ) {
                    if (getLinkFiles(ctx, name).length === 0)  {
                        // *.lua, *.dll 或 *.so 文件列表
                        const files = [...getLuaFiles(ctx, name), ...getClibFiles(ctx, name)];
                        const msg = "未能加载 “" + name + "” 模块，文件不存在：\n" + files.join("\n");
                        addLint(node, "", _s, msg);
                    }
                }
            }
            return LuaString;
        }
    }

    /** 加载模块 */
    function _require(name: string) {
        if ( typeof name !== "string" ) { return; }
        if ( name === "cjson.safe" ) { name = "cjson"; }

        return name in BuildInLibs      ? _G[name]
            :  name === "table.new"     ? getItem(_G, ["table", ".", "new"])
            :  name === "table.nkeys"   ? getItem(_G, ["table", ".", "nkeys"])
            :  name === "table.clone"   ? getItem(_G, ["table", ".", "clone"])
            :  name === "table.clear"   ? getItem(_G, ["table", ".", "clear"])
            :  name === "table.isempty" ? BuildInFuns["table.isempty"]
            :  name === "table.isarray" ? BuildInFuns["table.isarray"]
            :  name === "thread.exdata" ? BuildInFuns["thread.exdata"]
            :  name === "thread.exdata2"? BuildInFuns["thread.exdata"]
            :  lua.load(ctx, name);
    }

}
