
import { LuaModule } from './types';
import { NgxPath, getApiFile, getModFile } from "./ngx";
import { requireModule } from './modRequirer';
import { loadModule } from './modLoader';
import { loadDao } from './daoLoader';
import { loadApiDoc } from './apiDoc';
import { genGlobal } from './global';
import { newScope } from './scope';
import { setDepend, getModCache, setModCache } from './modCache';
import * as fs from 'fs';
import { join } from 'path';
import { window } from 'vscode';

export { load, loadApiMod, loadApiDoc, genGlobal, newScope };

const LIBS = ["io", "os", "string", "table", "math",
"package", "debug", "coroutine", "ngx", "ndk", "_G"];

const MOD_PROXY = new Map<string, LuaModule>();

/** 加载模块(懒加载) */
function load(ctx: NgxPath, name: string): LuaModule | undefined {

    name = name.replace(/('|")/g, "");
    if (!name || !ctx.fileName || !ctx.ngxPath) {return;}

    let apiFile = getApiFile(ctx, name);
    let modFile = getModFile(ctx, name);

    if (name.startsWith("$") && !modFile) {
        name = "dao";
        apiFile = getApiFile(ctx, name);
    }

    let fileName = apiFile || modFile;
    if (!fileName) {return;}

    let obj = MOD_PROXY.get(fileName);
    if (obj) { return obj; }

    ctx = { ... ctx };  // 克隆

    const isLib = LIBS.includes(name);
    if (isLib) {ctx.fileName = fileName;}

    // 属性代理：只读
    obj = new Proxy({} as LuaModule, {
        // 读
        get(target, prop) {
            if (prop === "selfCall") {return false; }
            if (prop === "$proxy")   { return true; }

            if (isLib) {
                if (prop === "type") {return "lib";}
                if (prop === "doc") {return "## " + name + " 库";}
                if (prop === "$file") {return fileName;}
                if (prop === "readonly") {return true;}
                if (prop !== ".") {return;}
            }

            let mod = _load(ctx, name, apiFile, modFile) as any;
            return mod && mod[prop];

        },
        // 写
        set(target, prop, value) {
            return true;  // 返回 true 避免修改属性时抛出错误
        }
    });

    MOD_PROXY.set(fileName, obj);
    return obj;

}

let count = 1;  // 加载次数

/** 加载模块 */
function _load(ctx: NgxPath, name: string, apiFile?: string, modFile?: string): LuaModule | undefined {

    let fileName = apiFile || modFile;
    if (!fileName) {return;}

    // 设置引用关系
    setDepend(ctx.fileName, fileName);

    let mod: LuaModule | undefined;

    // 取出缓存
    mod = getModCache(fileName);
    if (mod) {return mod;}

    // 先占个坑：避免互相引用或者自己引用自己
    setModCache(fileName, {});

    ctx = {...ctx, fileName};  // 克隆并更改 fileName

    const time1 = new Date().getTime();

    if (apiFile) {
        mod = requireModule(ctx, name);
    } else {
        mod = loadModule(ctx, name);
    }

    if (mod && name.startsWith("$")) {
        let dao = loadDao(mod);
        mod = requireModule(ctx, "dao", dao);
    }

    const time2 = new Date().getTime();

    const text = `加载模块 #${ count++ } - ${ time2 - time1 }ms ：${ fileName }`;
    console.log(text);
    window.setStatusBarMessage(text);

    // 更新缓存（直接覆盖）
    mod && setModCache(fileName, mod);

    return getModCache(fileName);

}

// api 目录懒加载
function loadApiMod(ctx: NgxPath, apiName: string, apiPath: string, apiMod?: LuaModule): LuaModule {

    let obj: LuaModule = {};
    if (!apiPath) {return obj;}

    ctx = { ... ctx };

    // 属性代理：只读
    return new Proxy(obj, {
        // 读
        get(target, prop) {
            if (prop === "selfCall") {return false; }
            if (prop === "$proxy")   { return true; }

            if (prop === "type") {return "api";}
            if (prop === "doc") {return "## " + apiName + " 接口";}

            let mod = apiMod as any;
            if (!mod) {
                let modFile = getModFile(ctx, apiName);
                mod = modFile && _load(ctx, apiName, "", modFile) || {};
            }

            if (prop !== ".") {return mod[prop];}

            let names = loadNames(apiPath);

            let ti = { ... mod["."] || {} };

            names.forEach(name=>{
                ti[name] = ti[name] || loadApiMod(ctx, apiName + "." + name, join(apiPath, name));
            });

            return ti;

        },
        // 写
        set(target, prop, value) {
            return true;  // 返回 true 避免修改属性时抛出错误
        }
    });

}

function loadNames (pPath: string) {

    let names: string[] = [];

    try {
        const files = fs.readdirSync(pPath);
        files.forEach(name => {
            if (name === "_bk" || name === "init.lua" || name.startsWith(".")) {return;}

            let fPath = join(pPath, name);
            let fStat = fs.statSync(fPath);

            if (fStat.isDirectory()) {
                names.push(name);
            } else if (fStat.isFile() && name.endsWith(".lua")) {
                name = name.substring(0, name.length - 4);
                names.push(name);
            }
        });
    } catch (e) {
        // console.log(e);
    }

    return names;

}
