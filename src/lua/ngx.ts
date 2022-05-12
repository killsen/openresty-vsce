
import { existsSync as _exist, readFileSync as _read } from 'fs';
import { join as _join } from 'path';
import { watchFile } from "./modCache";

export interface NgxPath {
    fileName: string;       // d:\openresty\nginx\app\pos\api\demo.lua

    ngxPath : string;	    // d:\openresty\nginx\
    apiPath : string;       // d:\openresty\nginx\api\

    libPath : string;       // d:\openresty\nginx\app\lib\
    utiPath : string;       // d:\openresty\nginx\app\utils\

    appPath : string;	    // d:\openresty\nginx\app\pos\
    actPath : string;       // d:\openresty\nginx\app\pos\act\
    daoPath : string;		// d:\openresty\nginx\app\pos\dao\
    comPath : string;		// d:\openresty\nginx\app\pos\com\
    appName : string;		// pos

    modType : string;
    modName : string;
}

/** 取得应用路径 */
export function getPath(fileName: string): NgxPath{

    let m = /(.*\\nginx\\).+\.lua/.exec(fileName);

    let ngxPath = m && m[1] || '';
    let apiPath = ngxPath && _join(ngxPath, "api") || '';
    let libPath = ngxPath && _join(ngxPath, "app", "lib") || '';
    let utiPath = ngxPath && _join(ngxPath, "app", "utils") || '';

    m = /(.*\\nginx\\app\\(\w+)\\)(.+)\.lua/.exec(fileName);

    let appPath = m && m[1] || '';
    let appName = m && m[2] || '';
    let modName = m && m[3] || '';
    let actPath = appPath && _join(appPath, "act") || '';
    let daoPath = appPath && _join(appPath, "dao") || '';
    let comPath = appPath && _join(appPath, "com") || '';

    modName = modName.replace(/[\\\/]/g, ".");

    return {
        fileName,
        modType : "",
        modName,

        ngxPath,	    // d:\openresty\nginx\
        apiPath,        // d:\openresty\nginx\api\

        libPath,        // d:\openresty\nginx\app\lib\
        utiPath,        // d:\openresty\nginx\app\utils\

        appPath,		// d:\openresty\nginx\app\pos\
        actPath,        // d:\openresty\nginx\app\pos\act\
        daoPath,		// d:\openresty\nginx\app\pos\dao\
        comPath,		// d:\openresty\nginx\app\pos\com\
        appName,		// pos
    };
}

/** 取得模块名称 */
export function getModType(text: string) {
    let m = /["']?([\$\#\%])?(([\w+\-]+\.)*[\w\-]+)["']?/.exec(text);
    return {
        modType: m && m[1] || '',
        modName: m && m[2] || '',
    };
}

/** api 接口声明文件 */
export function getApiFile(path: NgxPath, name: string) {

    const { ngxPath, apiPath } = path;

    // 检查路径是否存在
    if (!ngxPath || !apiPath || !name) { return; }

    let file = _join(apiPath, name + ".api");
    if (!_exist(file)) { return; }

    return file;

}

/** api 接口 lua 伪代码 */
export function getLuaApiFile(path: NgxPath, name: string) {

    const { ngxPath, apiPath } = path;

    // 检查路径是否存在
    if (!ngxPath || !apiPath || !name) { return; }

    let file = _join(apiPath, name + ".lua.api");
    if (!_exist(file)) { return; }

    return file;

}

/** 取得模块文件 */
export function getModFile(path: NgxPath, name: string) {

    // 优先使用 *.lua.api 伪代码进行类型推导
    let file = getLuaApiFile(path, name);
    if (file) {return file;}

    const { ngxPath, appPath } = path;

    // 检查路径是否存在
    if (!ngxPath || !name) { return; }

    // 取得模块名称
    let { modType, modName } = getModType(name);
    if (!modName) { return; }

    // 取得文件名
    let apiFile = modName.replace(/\./g, "\\") + ".lua.api";
    let modFile = modName.replace(/\./g, "\\") + ".lua";

    if (modType === "$") {
        file = appPath && _join(appPath, "dao", modFile);

    } else if (modType === "%") {
        file = appPath && _join(appPath, "com", apiFile);
        if (!_exist(file)) {file = appPath && _join(appPath, "com", modFile);}
        if (!_exist(file)) {file = _join(ngxPath, "app", "lib", modFile);}

    } else if (modType === "#") {
        file = _join(ngxPath, "app", "utils", modFile);

    } else {
        file = appPath && _join(appPath, apiFile);
        if (!_exist(file)) {file = appPath && _join(appPath, modFile);}
        if (!_exist(file)) {file = _join(ngxPath, modFile);}
        if (!_exist(file)) {file = _join(ngxPath, "lua", modFile);}
        if (!_exist(file)) {file = _join(ngxPath, "lualib", modFile);}
    }

    if (!_exist(file)) { return; }

    return file;

}

/** 取得模块代码 */
export function getModCode(path: NgxPath, name: string) {

    let file = getModFile(path, name);
    if (!file) {return;}

    watchFile(file);  // 监听文件变化

    try {
        let data = _read(file);
        return data.toString();
    } catch (e) {
        // console.log(e);
    }

}
