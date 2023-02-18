
import { NgxPath, getApiFile } from './ngx';
import { loadApiDoc } from './apiDoc';
import { LuaModule, LuaDao, LuaApi, getBasicType, LuaAny } from './types';
import { setDepend } from "./modCache";
import { isObject, setItem } from './utils';
import { TableLib } from './libs/TableLib';
import { NgxThreadLib, NgxTimerLib } from './libs/NgxLib';
import { LuaScope } from './scope';
import { loadType, parseTypes } from './vtype';

const readonly = true;
const basic = true;

/** 获取单个返回值类型 */
function genValue(args: string, _g: LuaScope, loc: LuaApi["loc"]): any {

    let vt = getBasicType(args) || _g[args];
    if (vt) { return vt; }

    let arr = genArgs(args, _g, loc, true);
    vt = arr[0];

    if (isObject(vt) && vt.type !== "never") {
        return vt;
    }

}

/** 获取参数类型或者返回值类型 */
function genArgs(args: string, _g: LuaScope, loc: LuaApi["loc"], isRes = false): any[] {

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
        return vt || LuaAny;

    });
}


/** 通过API文件加载接口声明 */
export function requireModule(ctx: NgxPath, name: string, dao?: LuaDao): LuaModule | undefined {

	// 检查路径是否存在
	let fileName = getApiFile(ctx, name);
	if (!fileName) { return; }

    let apis = loadApiDoc(ctx, name);
    if (!apis) { return ; }

    let _g: LuaScope = { $local: {}, $scope: undefined, $file: fileName };
    let requireName = "";

    let daoDoc = "";
    if (dao) {
        // 注入 dao 类型
        daoDoc = dao.doc;
        _g["row"] = {
            type: "$"+ dao.name,
            "." : dao.row, readonly,
            doc : "## $"+ dao.name +"\ndao 类型单行数据\n" + daoDoc,
        };
        _g["row[]"] = {
            type: "$"+ dao.name + "[]",
            "[]": _g["row"], readonly,
            doc: "## $"+ dao.name +"[]\ndao 类型多行数据\n" + daoDoc,
        };
        _g["sql"] = {
            type: "string",
            readonly, basic,
            doc: "sql操作语句",
        };
        _g["sqls"] = {
            type: "string",
            readonly, basic,
            $result: _g["row[]"],
            doc: "sql查询语句",
        };
    }

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
            p.doc   = api.doc + daoDoc;
            p.$file = api.file;
            p.$loc  = api.loc;

            if (p.args && p.args !== "()" && dao) {
                p.$dao = dao; // 用于 dao 补全
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
        setItem(t, [".", "$string"], _g["str"]);

    } else if (name === "table") {
        for (let k in TableLib) {
            setItem(t, [".", k, "()"], (TableLib as any)[k]);
        }
    } else if (name === "ngx") {
        for (let k in NgxThreadLib) {
            setItem(t, [".", "thread", ".", k, "()"], (NgxThreadLib as any)[k]);
        }
        for (let k in NgxTimerLib) {
            setItem(t, [".", "timer", ".", k, "()"], (NgxTimerLib as any)[k]);
        }
    }

    if (t instanceof Object && dao) {
        if (dao["$file"]) {
            setDepend(dao["$file"], fileName);
        }
        t["$file"] = dao["$file"];
        t["$dao"] = dao;
        t["doc"] = daoDoc;
    } else if (t instanceof Object) {
        t["$file"] = fileName;
    }

    return t;

}
