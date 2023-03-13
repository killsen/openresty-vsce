
import * as luaparse from 'luaparse';
import * as lua from './index';
import { LuaModule } from './types';
import { NgxPath, getModCode, getModFile } from './ngx';
import { loadBody } from './parser';
import { getItem, parseComments, setItem } from './utils';
import { getValue, setValue } from './scope';
import { loadApiTypes } from './modApiTypes';
import { dirname } from "path";
import { DbLib } from './libs/DbLib';

/** 通过名称加载模块 */
export function loadModule(ctx: NgxPath, name: string): LuaModule | undefined {

    let fileName = getModFile(ctx, name);
    if (!fileName) { return; }

    let code = getModCode(ctx, name);
    if (!code) { return; }

    ctx.modName = name;

    const mod = loadModuleByCode(ctx, code, fileName);
    if (!mod) {return;}

    // 注入 DbLib 函数
    if (name === "%db") {
        for (let k in DbLib) {
            setItem(mod, [".", k, "()"], DbLib[k]);
        }
    }

    // -- @@api : openresty-vsce
    if (name === "api" || code.match(/^\s*--\s*@@\s*api/)) {
        let apiPath = "";
        if (fileName.endsWith("\\init.lua")) {
            apiPath = dirname(fileName);
        } else {
            apiPath = fileName.replace(".lua", "");
        }
        return lua.loadApiMod(ctx, name, apiPath, mod);
    }

    return mod;

}

/** 通过代码加载模块 */
export function loadModuleByCode(ctx: NgxPath, code: string, fileName?: string, $lints?: any[], $funcs?: any[]): LuaModule | undefined {

    fileName = fileName || ctx.fileName;

    try {
        let chunk = luaparse.parse(code, {
            wait: false,
            comments: true,
            scope: true,
            locations: true,
            ranges: true,
            extendedIdentifiers: false,
            luaVersion: 'LuaJIT'
        });

        const _G: any = lua.genGlobal(ctx);
        const _g: any = lua.newScope(_G, fileName);

        // 模块名称及文件
        setValue(_g, "$$name", ctx.modName, true);
        setValue(_g, "$$file", ctx.fileName, true);

        // apicheck 成员字段检查
        $lints && setValue(_g, "$$lints", $lints, true);
        $funcs && setValue(_g, "$$funcs", $funcs, true);

        // 解析注释中的类型定义
        let $$comm = parseComments(chunk.comments);
        setValue(_g, "$$comm", $$comm, true);
        setValue(_g, "$$comments", chunk.comments, true);

        // 初始化返回值数组
        setValue(_g, "$$return", [], true);

        let $types = {};
        setValue(_g, "$$types", $types, true);

        let mod = loadBody(chunk.body, _g);

        if (mod instanceof Object) {
            mod["$file"] = fileName;

            // 构造函数
            let func = getValue(_g, "@@");
            if (typeof func === "function") {
                mod["@@"] = func;
            } else {
                // 默认使用 new 方法作为构造函数
                func = getItem(mod, [".", "new", "()"]) ||
                       getItem(mod, [":", "new", "()"]);
                if (typeof func === "function") {
                    setValue(_g, "@@", func, true);
                    mod["@@"] = func;
                }
            }

            loadApiTypes(ctx, mod);
            setValue(_g, "$$req", mod["$req"], true);       // 请求参数类型
            setValue(_g, "$$res", mod["$res"], true);       // 返回值类型 v21.11.25

            // 自定义类型
            $types = _g["$$types"] = mod["$types"] = { ...$types, ...mod["$types"] };
        }

        return mod || { $types };

    }catch(err){
        if (err instanceof SyntaxError) {
            // console.log(err.message);
        }
    }

}

