"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModCode = exports.getModFile = exports.getLuaApiFile = exports.getApiFile = exports.getModType = exports.getPath = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const modCache_1 = require("./modCache");
/** 取得应用路径 */
function getPath(fileName) {
    let m = /(.*\\nginx\\).+\.lua/.exec(fileName);
    let ngxPath = m && m[1] || '';
    let apiPath = ngxPath && path_1.join(ngxPath, "api") || '';
    let libPath = ngxPath && path_1.join(ngxPath, "app", "lib") || '';
    let utiPath = ngxPath && path_1.join(ngxPath, "app", "utils") || '';
    m = /(.*\\nginx\\app\\(\w+)\\)(.+)\.lua/.exec(fileName);
    let appPath = m && m[1] || '';
    let appName = m && m[2] || '';
    let modName = m && m[3] || '';
    let actPath = appPath && path_1.join(appPath, "act") || '';
    let daoPath = appPath && path_1.join(appPath, "dao") || '';
    let comPath = appPath && path_1.join(appPath, "com") || '';
    modName = modName.replace(/[\\\/]/g, ".");
    return {
        fileName,
        modType: "",
        modName,
        ngxPath,
        apiPath,
        libPath,
        utiPath,
        appPath,
        actPath,
        daoPath,
        comPath,
        appName,
    };
}
exports.getPath = getPath;
/** 取得模块名称 */
function getModType(text) {
    let m = /["']?([\$\#\%])?(([\w+\-]+\.)*[\w\-]+)["']?/.exec(text);
    return {
        modType: m && m[1] || '',
        modName: m && m[2] || '',
    };
}
exports.getModType = getModType;
/** api 接口声明文件 */
function getApiFile(path, name) {
    const { ngxPath, apiPath } = path;
    // 检查路径是否存在
    if (!ngxPath || !apiPath || !name) {
        return;
    }
    let file = path_1.join(apiPath, name + ".api");
    if (!fs_1.existsSync(file)) {
        return;
    }
    return file;
}
exports.getApiFile = getApiFile;
/** api 接口 lua 伪代码 */
function getLuaApiFile(path, name) {
    const { ngxPath, apiPath } = path;
    // 检查路径是否存在
    if (!ngxPath || !apiPath || !name) {
        return;
    }
    let file = path_1.join(apiPath, name + ".lua.api");
    if (!fs_1.existsSync(file)) {
        return;
    }
    return file;
}
exports.getLuaApiFile = getLuaApiFile;
/** 取得模块文件 */
function getModFile(path, name) {
    // 优先使用 *.lua.api 伪代码进行类型推导
    let file = getLuaApiFile(path, name);
    if (file)
        return file;
    const { ngxPath, appPath } = path;
    // 检查路径是否存在
    if (!ngxPath || !name) {
        return;
    }
    // 取得模块名称
    let { modType, modName } = getModType(name);
    if (!modName) {
        return;
    }
    // 取得文件名
    let apiFile = modName.replace(/\./g, "\\") + ".lua.api";
    let modFile = modName.replace(/\./g, "\\") + ".lua";
    if (modType === "$") {
        file = appPath && path_1.join(appPath, "dao", modFile);
    }
    else if (modType === "%") {
        file = appPath && path_1.join(appPath, "com", apiFile);
        if (!fs_1.existsSync(file))
            file = appPath && path_1.join(appPath, "com", modFile);
        if (!fs_1.existsSync(file))
            file = path_1.join(ngxPath, "app", "lib", modFile);
    }
    else if (modType === "#") {
        file = path_1.join(ngxPath, "app", "utils", modFile);
    }
    else {
        file = appPath && path_1.join(appPath, apiFile);
        if (!fs_1.existsSync(file))
            file = appPath && path_1.join(appPath, modFile);
        if (!fs_1.existsSync(file))
            file = path_1.join(ngxPath, modFile);
        if (!fs_1.existsSync(file))
            file = path_1.join(ngxPath, "lua", modFile);
        if (!fs_1.existsSync(file))
            file = path_1.join(ngxPath, "lualib", modFile);
    }
    if (!fs_1.existsSync(file)) {
        return;
    }
    return file;
}
exports.getModFile = getModFile;
/** 取得模块代码 */
function getModCode(path, name) {
    let file = getModFile(path, name);
    if (!file)
        return;
    modCache_1.watchFile(file); // 监听文件变化
    try {
        let data = fs_1.readFileSync(file);
        return data.toString();
    }
    catch (e) {
        // console.log(e);
    }
}
exports.getModCode = getModCode;
//# sourceMappingURL=ngx.js.map