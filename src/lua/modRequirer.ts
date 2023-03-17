
import { NgxPath, getApiFile } from './ngx';
import { loadApiDoc } from './apiDoc';
import { LuaModule, LuaDao, LuaApi, getBasicType, LuaAny, LuaString, LuaNumber, LuaNever, LuaType, LuaStringOrNil } from './types';
import { setDepend } from "./modCache";
import { isObject, setItem } from './utils';
import { TableLib } from './libs/TableLib';
import { NgxThreadLib, NgxTimerLib } from './libs/NgxLib';
import { LuaScope } from './scope';
import { loadType, parseTypes } from './vtype';

const readonly = true;
const basic = true;

/** 获取单个返回值类型 */
function genValue(args: string, _g: LuaScope, loc?: LuaApi["loc"]): any {

    let vt = getBasicType(args) || _g[args];
    if (vt) { return vt; }

    let arr = genArgs(args, _g, loc, true);
    vt = arr[0];

    if (isObject(vt) && vt.type !== "never") {
        return vt;
    }

}

/** 取得最少需要的参数个数 */
function getArgsMin(args: string) {

    // 去除空格及左右两边的小括号()
    args = args.replace(/\s/g, "");
    if (args.startsWith("(") && args.endsWith(")")) {
        args = args.substring(1, args.length-1);
    }
    if (!args) { return 0; }

    const _map = new Map<string, string>();
    const list = parseTypes(args, _map).split(",");

    let minArgs = 0;
    for (let arg of list) {
        if (arg === "..." || arg.includes("?") || arg.includes("=")) {
            break;
        } else {
            minArgs++;
        }
    }
    return minArgs;

}

/** 获取参数类型或者返回值类型 */
function genArgs(args: string, _g: LuaScope, loc?: LuaApi["loc"], isRes = false): any[] {

    // 去除空格及左右两边的小括号()
    args = args.replace(/\s/g, "");
    if (args.startsWith("(") && args.endsWith(")")) {
        args = args.substring(1, args.length-1);
    }
    if (!args) { return []; }

    const _map = new Map<string, string>();
    args = parseTypes(args, _map);

    return args.split(",").map(arg => {
        let type = "";

        let vt = getBasicType(arg) ||
                 getBasicType(arg.replace("?", ""));
        if (vt) {return vt;}

        if (arg === "...") {
            type = "...";
        } else if (arg.includes(":")) {
            let idx = arg.indexOf(":");
            type = arg.substring(idx+1, arg.length);
        } else if (arg.includes("=")) {
            let arr = arg.split("=");
            type = arr[1].replace("?", "");
        } else if (isRes) {
            type = arg;  // 返回值类型
        }

        if (type === "true" || type === "false") {
            type = "boolean";
        } else if (type && !isNaN(Number(type))) {
            type = "number";
        }

        if (!type) { return LuaAny; }

        vt = getBasicType(type) || _g[type];
        if (vt) { return vt; }

        vt = loadType(type, _g, loc, _map);

        if (isObject(vt) && vt.type !== "never") {
            return vt;
        } else {
            return LuaAny;
        }

    });
}

const $dao_ext = {
    _order_by : { type: "string", basic, readonly, doc: "排序" },
    _group_by : { type: "string", basic, readonly, doc: "汇总" },
    _limit    : { type: "number | string", types: [ LuaNumber, LuaString ], readonly, doc: "记录数" },
};

// 注入 dao 类型
function initDao(_g: LuaScope, dao: LuaDao) {

    const doc = "数据库查询结果\n\n"
        + "[" + dao.name + "](file:"+ dao.$file +")"
        + " ( " + dao.desc + " ) " ;

    _g["row"] = {
        "." : dao.row,
        type: "$"+ dao.name, readonly,
        doc,
    };

    _g["row[]"] = {
        "." : {}, "[]": _g["row"],
        type: "$"+ dao.name + "[]", readonly,
        doc,
    };

    _g["sql"] = {
        type: "string", readonly, basic,
        doc: "sql操作语句"
    };

    _g["sql_query"] = {
        type: "string", readonly, basic,
        $result: _g["row[]"],
        doc: "sql查询语句",
    };

    _g["rowx"] = {
        "." : { ...dao.row, ...$dao_ext },
        type: "$"+ dao.name, readonly,
    };

    _g["query"] = genValue("rowx | string[] | map<string>[]", _g);

    _g["update"] = genValue("row | string[] | (row | string[])[]", _g);

    _g["where"] = genValue("row | string[]", _g);

}

/** 生成指定字段查询结果 */
function gen_dao_fields(t: any, dao: LuaDao) : LuaType | undefined {

    if (!isObject(t) || !isObject(t["."])) { return; }

    const doc = "数据库查询结果\n\n"
        + "[" + dao.name + "](file:"+ dao.$file +")"
        + " ( " + dao.desc + " ) " ;

    for (let i=1; i<100; i++) {
        let f = t["."][i];
        if (f === null || f === undefined) { return; }
        if (!isObject(f["."])) { continue; }

        const ti = {} as any;

        for (let k in f["."]) {
            const v = f["."][k];
            if (Number(k)) {
                typeof v === "string" && v.split(",").forEach(name => {
                    name = name.trim();
                    let namex = name;
                    if (name.includes(" as ")) {
                        let arr = name.split(" as ");
                        namex = arr[0].trim();
                        name  = arr[1].trim();
                    }
                    ti[name] = dao.row[namex] || LuaAny;
                    ti["$" + name + "$"] = f["."]["$" + k + "$"];
                });
            } else if (!k.startsWith("$")) {
                ti[k] = dao.row[v] || LuaAny;
                ti["$" + k + "$"] = f["."]["$" + k + "$"];
            }
        }

        return { type: "table", doc, readonly, ".": ti };
    }

}

/** 生成 dao 的 get 及 list 方法 */
function gen_dao_func(mod: LuaModule, dao: LuaDao, $row: LuaType, $rows: LuaType) {

    setItem(mod, [".", "get", "()"], (t: any) => {
        const row = gen_dao_fields(t, dao) || $row;
        return [ row, LuaStringOrNil ];
    });

    setItem(mod, [".", "list", "()"], (t: any) => {
        const row = gen_dao_fields(t, dao);
        const rows = row && { "[]": row, type: "table[]", readonly, doc: row.doc } || $rows;
        return [ rows, LuaStringOrNil ];
    });

    setItem(mod, [":", "get" , "()"], gen_sql_query);
    setItem(mod, [":", "list", "()"], gen_sql_query);

    const doc = "数据库查询语句\n\n"
        + "[" + dao.name + "](file:"+ dao.$file +")"
        + " ( " + dao.desc + " ) " ;

    function gen_sql_query(t: any) {
        const row = gen_dao_fields(t, dao);
        const rows = row && { "[]": row, type: "table[]", readonly, doc: row.doc } || $rows;
        const sql_query = {
            type: "string", readonly, basic,
            $result: rows,
            doc,
        };
        return [ sql_query ];
    }

}

/** 通过API文件加载接口声明 */
export function requireModule(ctx: NgxPath, name: string, dao?: LuaDao): LuaModule | undefined {

	// 检查路径是否存在
	let fileName = getApiFile(ctx, name);
	if (!fileName) { return; }

    let apis = loadApiDoc(ctx, name);
    if (!apis) { return ; }

    let _g: LuaScope = { $file: fileName };
    let requireName = "";

    let daoDoc = dao?.doc || "";
    let daoName = dao?.name || "";
    dao && initDao(_g, dao);  // 注入 dao 类型

    function genNode(api: LuaApi) {
        // console.log(api.name);
        let a: string[] = [];

        if (api.name === "require") {
            requireName = requireName || api.res;
            a = [api.res];
        } else if (api.parent) {
            a = api.parent.split(".");
            if (api.indexer === ".") {
                a.push(api.child);
            }
        } else {
            a = api.name.split(".");
        }

        let p: LuaModule | undefined;

        a.forEach(k => {
            k = k.trim();
            if (!k) { return; }
            if (!requireName) { requireName = k; }

            if (p) {
                p["."] = p["."] || {};
                p["."][k] = p["."][k] || {};
                p = p["."][k];
            } else {
                p = _g[k] = _g[k] || { readonly };
            }
        });

        if (p && api.parent && api.indexer === ":" && api.child) {
            let k = api.child;
            p[":"] = p[":"] || {};
            p[":"][k] = p[":"][k] || {};
            p = p[":"][k];
        }

        if (p) {
            p.doc = api.doc;
            p.$file = api.file;
            p.$loc = api.loc;
            p.readonly = true;
        }

        return p;

    }

    // 生成命名空间
    apis.forEach(api => {
        genNode(api);
    });

    apis.forEach(api => {
        if (api.name === "require") { return; }

        let p = genNode(api);
        if (!p) { return; }

        p.readonly = true;

        if (api.args) {
            p["()"] = genArgs(api.res , _g, p.$loc, true );  // 返回值类型
            p.$args = genArgs(api.args, _g, p.$loc, false);  // 参数类型
            p.args  = api.args;
            p.argsMin = getArgsMin(api.args);
            p.$argx = api.args + (api.res ? " => " + api.res : "");
            p.doc   = api.doc;
            p.$file = api.file;
            p.$loc  = api.loc;

            if (daoName) {
                p.args = p.args.replace(/row/g, `$${ daoName }`);
                p.$argx = p.$argx.replace(/row/g, `$${ daoName }`);
            }

        } else if (api.res) {
            if (!isNaN(Number(api.res))) {
                const parent = _g[api.parent] as any;
                if (parent && parent["."]) {
                    parent["."][api.child] = Number(api.res);
                    parent["."]["$" + api.child + "$"] = {
                        ["$file"]: api.file,
                        ["$loc"]: api.loc,
                    };
                    return;
                }
            }

            // 获取单个返回值类型
            const t1 = genValue(api.res, _g, api.loc);
            if (isObject(t1)) {
                const t2 = p as any;
                for (let k in t1) {
                    if ((t2[k] === null || t2[k] === undefined) &&
                        (t1[k] !== null && t1[k] !== undefined)) {
                        t2[k] = t1[k];  // 仅覆盖 t2 不存在的 key
                    }
                }
            }

        }

    });

    const t = name === "_G" ? { "." : _g } : _g[requireName];
    if (!t) { return; }

    if (name === "string") {
        const T = _g["str"];
        if (isObject(T)) {
            T["type"] = "string";
            T["readonly"] = true;
            T["basic"] = true;
            T["."] = {};
            setItem(t, [".", "$type<@string>"], T);
        }

    } else if (name === "io") {
        const T = _g["file"];
        if (isObject(T)) {
            T["type"] = "file";
            T["readonly"] = true;
            T["basic"] = true;
            T["."] = {};
            setItem(t, [".", "$type<@file>"], T);
        }

    } else if (name === "os") {
        // 日期对象 { year, month, day, hour, min, sec, isdst, wday, yday }
        const T = _g["DateTime"];
        if (isObject(T)) {
            T["type"] = "datetime";
            T["readonly"] = true;
            T["basic"] = true;
            T[":"] = {};
            setItem(t, [".", "date", "()"], (format: string) => {
                return format === "*t" ? T : LuaString;
            });
        }

    } else if (name === "table") {
        for (let k in TableLib) {
            setItem(t, [".", k, "()"], TableLib[k]);
        }
    } else if (name === "ngx") {
        for (let k in NgxThreadLib) {
            setItem(t, [".", "thread", ".", k, "()"], NgxThreadLib[k]);
        }
        for (let k in NgxTimerLib) {
            setItem(t, [".", "timer", ".", k, "()"], NgxTimerLib[k]);
        }
    }

    if (t instanceof Object && dao) {
        if (dao["$file"]) {
            setDepend(dao["$file"], fileName);
        }
        t["$file"] = dao["$file"];
        t["$dao"] = dao;
        t["$row"] = _g["row"];
        t["doc"] = daoDoc;
        t["type"] = `dao<$${ dao.name }>`;

        // 生成 dao 的 get 及 list 方法
        gen_dao_func(t, dao, _g["row"], _g["row[]"]);

    } else if (t instanceof Object) {
        t["$file"] = fileName;
    }

    return t;

}
