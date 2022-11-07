
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
"package", "debug", "coroutine", "ngx", "ndk"];

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

    ctx = { ... ctx };  // 克隆

    const isLib = LIBS.includes(name);
    if (isLib) {ctx.fileName = fileName;}

    let obj: LuaModule = {};

    // 属性代理：只读
    return new Proxy(obj, {
        // 读
        get(target, prop) {

            if (isLib) {
                if (prop === "type") {return "lib";}
                if (prop === "doc") {return "## " + name + " 库";}
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

    if (apiFile) {
        mod = requireModule(ctx, name);
    } else {
        mod = loadModule(ctx, name);
    }

    if (mod && name.startsWith("$")) {
        let dao = loadDao(mod);
        mod = requireModule(ctx, "dao", dao);
    }

    const text = "加载模块：" + (count++) + "\t" + fileName;
    console.log(text);
    window.setStatusBarMessage(text);

    // 更新缓存（直接覆盖）
    mod && setModCache(fileName, mod);

    return getModCache(fileName);

}

// api 目录懒加载
function loadApiMod(ctx: NgxPath, pName: string = "api", apiRoot: string, apiMod?: LuaModule): LuaModule {

    let obj: LuaModule = {};

    ctx = { ... ctx };

    let pPath = apiRoot || join(ctx.appPath, pName);

    // 属性代理：只读
    return new Proxy(obj, {
        // 读
        get(target, prop) {

            if (prop === "type") {return "api";}
            if (prop === "doc") {return "## " + pName + " 接口";}

            let mod = apiMod as any;
            if (!mod) {
                let modFile = getModFile(ctx, pName);
                mod = modFile && _load(ctx, pName, "", modFile) || {};
            }

            if (prop !== ".") {return mod[prop];}

            let names = loadNames(pPath);

            let ti = { ... mod["."] || {} };

            names.forEach(name=>{
                ti[name] = ti[name] || loadApiMod(ctx, pName + "." + name, join(apiRoot, name));
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
                name = name.substr(0, name.length - 4);
                names.push(name);
            }
        });
    } catch (e) {
        // console.log(e);
    }

    return names;

}
