
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

export { load, loadApiDoc, genGlobal, newScope };

const LIBS = ["io", "os", "string", "table", "math",
"package", "debug", "coroutine", "ngx", "ndk"];

/** 加载模块(懒加载) */
function load(path: NgxPath, name: string): LuaModule | undefined {

    name = name.replace(/(\'|\")/g, "");
    if (!name || !path.fileName || !path.ngxPath) {return;}

    let apiFile = getApiFile(path, name);
    let modFile = getModFile(path, name);

    if (name.startsWith("$") && !modFile) {
        name = "dao";
        apiFile = getApiFile(path, name);
    }

    let fileName = apiFile || modFile;
    if (!fileName) {return;}

    path = { ... path };  // 克隆

    const isLib = LIBS.includes(name);
    if (isLib) {path.fileName = fileName;}

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

            let mod = _load(path, name, apiFile, modFile) as any;
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
function _load(path: NgxPath, name: string, apiFile?: string, modFile?: string): LuaModule | undefined {

    let fileName = apiFile || modFile;
    if (!fileName) {return;}

    // 设置引用关系
    setDepend(path.fileName, fileName);

    let mod: LuaModule | undefined;

    // 取出缓存
    mod = getModCache(fileName);
    if (mod) {return mod;}

    // 先占个坑：避免互相引用或者自己引用自己
    setModCache(fileName, {});

    path = {...path, fileName};  // 克隆并更改 fileName

    if (name === "api") {
        mod =  _loadApi(path, name);   // api 目录懒加载
    }else if (apiFile) {
        mod = requireModule(path, name);
    } else {
        mod = loadModule(path, name);
    }

    if (mod && name.startsWith("$")) {
        let dao = loadDao(mod);
        mod = requireModule(path, "dao", dao);
    }

    const text = "加载模块：" + (count++) + "\t" + fileName;
    console.log(text);
    window.setStatusBarMessage(text);

    // 更新缓存（直接覆盖）
    mod && setModCache(fileName, mod);

    return getModCache(fileName);

}

// api 目录懒加载
function _loadApi(path: NgxPath, pName: string = "api"): LuaModule {

    let obj: LuaModule = {};

    path = { ... path };

    const pPath = join(path.appPath, pName.replace(/\./g, "/"));

    // 属性代理：只读
    return new Proxy(obj, {
        // 读
        get(target, prop) {

            if (prop === "type") {return "api";}
            if (prop === "doc") {return "## " + pName + " 接口";}

            let modFile = pName !== "api" && getModFile(path, pName);
            let mod: any = modFile && _load(path, pName, "", modFile) || {};

            if (prop !== ".") {return mod[prop];}

            let names = loadNames(pPath);

            let ti = { ... mod["."] || {} };

            names.forEach(name=>{
                ti[name] = _loadApi(path, pName + "." + name);
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
            if (name === "_bk" || name.startsWith(".")) {return;}

            let fPath = join(pPath, name);
            let fStat = fs.statSync(fPath);

            if (fStat.isDirectory()) {
                names.push(name);
            } else if (fStat.isFile() && name.endsWith(".lua")) {
                name = name.substr(0, name.length - 4);
                names.push(name);
            }
        });
    } catch (e) {}

    return names;

}
