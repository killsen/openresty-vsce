
import * as luaparse from 'luaparse';
import * as lua from './index';
import { LuaModule } from './types';
import { NgxPath, getModCode, getModFile } from './ngx';
import { loadBody } from './parser';
import { parseComments } from './utils';
import { getValue, setValue } from './scope';
import { loadApiTypes } from './modApiTypes';

/** 通过名称加载模块 */
export function loadModule(path: NgxPath, name: string): LuaModule | undefined {

    let fileName = getModFile(path, name);
    if (!fileName) { return; }

    let code = getModCode(path, name);
    if (!code) { return; }

    path.modName = name;

    return loadModuleByCode(path, code, fileName);

}

/** 通过代码加载模块 */
export function loadModuleByCode(path: NgxPath, code: string, fileName?: string): LuaModule | undefined {

    fileName = fileName || path.fileName;

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

        const _G: any = lua.genGlobal(path);
        const _g: any = lua.newScope(_G, fileName);

        // 模块名称及文件
        setValue(_g, "$$name", path.modName, true);
        setValue(_g, "$$file", path.fileName, true);

        // 解析注释中的类型定义
        let $$comm = parseComments(chunk.comments);
        setValue(_g, "$$comm", $$comm, true);

        let mod = loadBody(chunk.body, _g);

        if (mod instanceof Object) {
            mod["$file"] = fileName;

            // 构造函数
            let func = getValue(_g, "@@");
            if (typeof func === "function") {
                mod["@@"] = func;
            }

            loadApiTypes(path, mod);
            setValue(_g, "$$req", mod["$req"], true);       // 请求参数类型
            setValue(_g, "$$res", mod["$res"], true);       // 返回值类型 v21.11.25
            setValue(_g, "$$types", mod["$types"], true);   // 自定义类型
        }

        return mod;

    }catch(err){
        if (err instanceof SyntaxError) {
            // console.log(err.message);
        }
    }

}

