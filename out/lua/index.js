"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newScope = exports.genGlobal = exports.loadApiDoc = exports.load = void 0;
const ngx_1 = require("./ngx");
const modRequirer_1 = require("./modRequirer");
const modLoader_1 = require("./modLoader");
const daoLoader_1 = require("./daoLoader");
const apiDoc_1 = require("./apiDoc");
Object.defineProperty(exports, "loadApiDoc", { enumerable: true, get: function () { return apiDoc_1.loadApiDoc; } });
const global_1 = require("./global");
Object.defineProperty(exports, "genGlobal", { enumerable: true, get: function () { return global_1.genGlobal; } });
const scope_1 = require("./scope");
Object.defineProperty(exports, "newScope", { enumerable: true, get: function () { return scope_1.newScope; } });
const modCache_1 = require("./modCache");
const fs = require("fs");
const path_1 = require("path");
const vscode_1 = require("vscode");
const LIBS = ["io", "os", "string", "table", "math",
    "package", "debug", "coroutine", "ngx", "ndk"];
/** 加载模块(懒加载) */
function load(path, name) {
    name = name.replace(/(\'|\")/g, "");
    if (!name || !path.fileName || !path.ngxPath)
        return;
    let apiFile = ngx_1.getApiFile(path, name);
    let modFile = ngx_1.getModFile(path, name);
    if (name.startsWith("$") && !modFile) {
        name = "dao";
        apiFile = ngx_1.getApiFile(path, name);
    }
    let fileName = apiFile || modFile;
    if (!fileName)
        return;
    path = Object.assign({}, path); // 克隆
    const isLib = LIBS.includes(name);
    if (isLib)
        path.fileName = fileName;
    let obj = {};
    // 属性代理：只读
    return new Proxy(obj, {
        // 读
        get(target, prop) {
            if (isLib) {
                if (prop === "type")
                    return "lib";
                if (prop === "doc")
                    return "## " + name + " 库";
                if (prop !== ".")
                    return;
            }
            let mod = _load(path, name, apiFile, modFile);
            return mod && mod[prop];
        },
        // 写
        set(target, prop, value) {
            return true; // 返回 true 避免修改属性时抛出错误
        }
    });
}
exports.load = load;
let count = 1; // 加载次数
/** 加载模块 */
function _load(path, name, apiFile, modFile) {
    let fileName = apiFile || modFile;
    if (!fileName)
        return;
    // 设置引用关系
    modCache_1.setDepend(path.fileName, fileName);
    let mod;
    // 取出缓存
    mod = modCache_1.getModCache(fileName);
    if (mod)
        return mod;
    // 先占个坑：避免互相引用或者自己引用自己
    modCache_1.setModCache(fileName, {});
    path = Object.assign(Object.assign({}, path), { fileName }); // 克隆并更改 fileName
    if (name === "api") {
        mod = _loadApi(path, name); // api 目录懒加载
    }
    else if (apiFile) {
        mod = modRequirer_1.requireModule(path, name);
    }
    else {
        mod = modLoader_1.loadModule(path, name);
    }
    if (mod && name.startsWith("$")) {
        let dao = daoLoader_1.loadDao(mod);
        mod = modRequirer_1.requireModule(path, "dao", dao);
    }
    const text = "加载模块：" + (count++) + "\t" + fileName;
    console.log(text);
    vscode_1.window.setStatusBarMessage(text);
    // 更新缓存（直接覆盖）
    mod && modCache_1.setModCache(fileName, mod);
    return modCache_1.getModCache(fileName);
}
// api 目录懒加载
function _loadApi(path, pName = "api") {
    let obj = {};
    path = Object.assign({}, path);
    const pPath = path_1.join(path.appPath, pName.replace(/\./g, "/"));
    // 属性代理：只读
    return new Proxy(obj, {
        // 读
        get(target, prop) {
            if (prop === "type")
                return "api";
            if (prop === "doc")
                return "## " + pName + " 接口";
            let modFile = pName !== "api" && ngx_1.getModFile(path, pName);
            let mod = modFile && _load(path, pName, "", modFile) || {};
            if (prop !== ".")
                return mod[prop];
            let names = loadNames(pPath);
            let ti = Object.assign({}, mod["."] || {});
            names.forEach(name => {
                ti[name] = _loadApi(path, pName + "." + name);
            });
            return ti;
        },
        // 写
        set(target, prop, value) {
            return true; // 返回 true 避免修改属性时抛出错误
        }
    });
}
function loadNames(pPath) {
    let names = [];
    try {
        const files = fs.readdirSync(pPath);
        files.forEach(name => {
            if (name === "_bk" || name.startsWith("."))
                return;
            let fPath = path_1.join(pPath, name);
            let fStat = fs.statSync(fPath);
            if (fStat.isDirectory()) {
                names.push(name);
            }
            else if (fStat.isFile() && name.endsWith(".lua")) {
                name = name.substr(0, name.length - 4);
                names.push(name);
            }
        });
    }
    catch (e) { }
    return names;
}
//# sourceMappingURL=index.js.map