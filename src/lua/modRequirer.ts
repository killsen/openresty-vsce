
import { NgxPath, getApiFile } from './ngx';
import { loadApiDoc } from './apiDoc';
import { LuaModule, LuaDao, LuaApi, getLuaType } from './types';
import { setDepend } from "./modCache";
import { isObject, setItem } from './utils';
import { TableLib } from './libs/TableLib';
import { NgxThreadLib } from './libs/NgxLib';
const readonly = true;

/** 通过API文件加载接口声明 */
export function requireModule(ctx: NgxPath, name: string, dao?: LuaDao): LuaModule | undefined {

	// 检查路径是否存在
	let fileName = getApiFile(ctx, name);
	if (!fileName) { return; }

    let apis = loadApiDoc(ctx, name);
    if (!apis) { return ; }

    let mod: { [key: string]: LuaModule } = {};
    let requireName = "";

    let daoDoc = "";
    if (dao) {
        daoDoc = dao.doc;
        let daoRow = { ".": dao.row, doc: "## $"+ dao.name +"\ndao 类型单行数据\n" + daoDoc, readonly };
        mod["row"] = daoRow;
        mod["row[]"] = { "[]": daoRow, doc: "## $"+ dao.name +"[]\ndao 类型多行数据\n" + daoDoc, readonly };
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
                p = mod[k] = mod[k] || { readonly };
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

    function genValue(name: string) {
        if (!name) {return;}
        name = name.replace(/\s/g, "");

        let m = mod[name];
        if (m) { return m; }

        let isArr = name.endsWith("[]");
        if (isArr) {
            name = name.substring(0, name.length-2);
        }

        m = mod[name];
        if (m) {
            return isArr ? { "[]": m, doc: m.doc } : m;
        } else {
            return getLuaType(name, isArr) as any;
        }

    }

    apis.forEach(api => {
        if (api.name === "require") { return; }

        let p = genNode(api);
        if (!p) { return; }

        p.readonly = true;

        if (api.args) {
            let arr = api.res.split(",");
            p["()"] = arr.map(genValue);
            p.args = api.args;
            p.doc = api.doc + daoDoc;
            p.$file = api.file;
            p.$loc = api.loc;

            if (p.args && p.args !== "()" && dao) {
                p.$dao = dao; // 用于 dao 补全
            }

        } else if (api.res) {
            if (!isNaN(Number(api.res))) {
                const parent = mod[api.parent] as any;
                if (parent && parent["."]) {
                    parent["."][api.child] = Number(api.res);
                    parent["."]["$" + api.child + "$"] = {
                        ["$file"]: api.file,
                        ["$loc"]: api.loc,
                    };
                    return;
                }
            }

            const t1 = genValue(api.res);
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

    const t = name === "_G" ? { "." : mod } : mod[requireName];
    if (!t) { return; }

    if (name === "table") {
        for (let k in TableLib) {
            setItem(t, [".", k, "()"], (TableLib as any)[k]);
        }
    } else if (name === "ngx") {
        for (let k in NgxThreadLib) {
            setItem(t, [".", "thread", k, "()"], (NgxThreadLib as any)[k]);
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
