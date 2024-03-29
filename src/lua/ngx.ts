
import { existsSync as _exist, readFileSync as _read } from 'fs';
import { join as _join } from 'path';
import { watchFile } from "./modCache";
import * as path from 'path';
import * as fs   from 'fs';
import * as vscode from 'vscode';

export interface NgxPath {
    fileName: string;       // d:\openresty\nginx\app\pos\api\demo.lua

    rootPath: string;       // d:\openresty\
    libPathX: string;       // d:\openresty\lua_modules\app\lib\
    utiPathX: string;       // d:\openresty\lua_modules\app\utils\

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

/** 取得 .orpmrc 所在的目录 */
function getRootPath(p1: string): string {

    if (!p1 || p1 === "." || p1 === "..") {return "";}

    if (fs.existsSync(`${p1}/.orpmrc`)) {
        return p1;
    }

    let p2 = path.dirname(p1);
    if (p2 === p1) {return "";}

    return getRootPath(p2);

}

/** 取得 nginx.exe 所在的目录 */
function getNginxPath(p1: string): string {

    if (!p1 || p1 === "." || p1 === "..") {return "";}

    if (fs.existsSync(`${p1}/nginx.exe`)) {
        return p1;
    }

    let p2 = path.dirname(p1);
    if (p2 === p1) {return "";}

    return getNginxPath(p2);

}

/** 取得应用路径 */
export function getPath(fileName: string): NgxPath{

    let rootPath = getRootPath(fileName);
    // console.log("rootPath: ", rootPath);

    let m = /(.*\\nginx\\).+\.lua/.exec(fileName);

    let ngxPath = m && m[1] || getNginxPath(fileName) || "";
    // console.log("ngxPath: ", ngxPath);

    if (rootPath) {
        ngxPath = _join(rootPath, "nginx");
    } else if (ngxPath) {
        rootPath = _join(ngxPath, "..");
    } else {
        let folders = vscode.workspace.workspaceFolders;
        let folder = folders && folders[0];
        if (folder) {
            // 使用单第一个工作区目录
            ngxPath = rootPath = folder.uri.fsPath;
        } else {
            // 使用当前文件所在的目录
            ngxPath = rootPath = path.dirname(fileName);
        }
    }

    let apiPath = ngxPath && _join(ngxPath, "api") || '';
    let libPath = ngxPath && _join(ngxPath, "app", "lib") || '';
    let utiPath = ngxPath && _join(ngxPath, "app", "utils") || '';

    let libPathX = rootPath && _join(rootPath, "lua_modules", "app", "lib") || '';
    let utiPathX = rootPath && _join(rootPath, "lua_modules", "app", "utils") || '';

    m = /(.*\\nginx\\app\\(\w+)\\)(.+)\.lua/.exec(fileName);

    let appPath = m && m[1] || '';
    let appName = m && m[2] || '';
    let modName = m && m[3] || '';
    let actPath = appPath && _join(appPath, "act") || '';
    let daoPath = appPath && _join(appPath, "dao") || '';
    let comPath = appPath && _join(appPath, "com") || '';

    modName = modName.replace(/[\\/]/g, ".");

    return {
        fileName,
        modType : "",
        modName,

        rootPath,       // d:\openresty\
        libPathX,       // d:\openresty\lua_modules\app\lib\
        utiPathX,       // d:\openresty\lua_modules\app\utils\

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
    let m = /["']?([$#%])?(([\w+-]+\.)*[\w-]+)["']?/.exec(text);
    return {
        modType: m && m[1] || '',
        modName: m && m[2] || '',
    };
}

/** .api 接口声明文件 */
export function getApiFile(ctx: NgxPath, name: string) {

    const { rootPath, ngxPath } = ctx;

    // 检查路径是否存在
    if (!ngxPath || !name) { return ""; }

    const files   = [] as string[];
    const apiFile = `${ name }.api`;

    files.push(_join(ngxPath, "api", apiFile));

    if (rootPath) {
        files.push(_join(rootPath, "lua_types", apiFile));
        files.push(_join(rootPath, "lua_types", "luajit", apiFile));
        files.push(_join(rootPath, "lua_types", "lualib", apiFile));
        files.push(_join(rootPath, "lua_types", "ngx", apiFile));
        files.push(_join(rootPath, "lua_types", "resty", apiFile));
    }

    {   // 使用插件内置 lua_types api 声明文件
        files.push(_join(__dirname, "..", "lua_types", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "luajit", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "lualib", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "ngx", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "resty", apiFile));
    }

    for (let file of files) {
        if (_exist(file)) { return file; }
    }

    return "";

}

/** .lua.api 接口文件 (lua 伪代码) */
export function getLuaApiFile(ctx: NgxPath, name: string) {

    const { rootPath, ngxPath } = ctx;

    // 检查路径是否存在
    if (!ngxPath || !name) { return ""; }

    const files   = [] as string[];
    const apiFile = `${ name }.lua.api`;

    files.push(_join(ngxPath, "api", apiFile));

    if (rootPath) {
        files.push(_join(rootPath, "lua_types", apiFile));
        files.push(_join(rootPath, "lua_types", "luajit", apiFile));
        files.push(_join(rootPath, "lua_types", "lualib", apiFile));
        files.push(_join(rootPath, "lua_types", "ngx", apiFile));
        files.push(_join(rootPath, "lua_types", "resty", apiFile));
    }

    {   // 使用插件内置 lua_types api 声明文件
        files.push(_join(__dirname, "..", "lua_types", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "luajit", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "lualib", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "ngx", apiFile));
        files.push(_join(__dirname, "..", "lua_types", "resty", apiFile));
    }

    for (let file of files) {
        if (_exist(file)) { return file; }
    }

    return "";

}


/** 取得 lua 文件列表 */
export function getLuaFiles(ctx: NgxPath, name: string) : string[] {

    const files = [] as string[];
    const map = new Map<string, boolean>();

    const { rootPath, ngxPath, appPath } = ctx;

    // 检查路径是否存在
    if (!ngxPath || !name) { return files; }

    // 取得模块名称
    let { modType, modName } = getModType(name);
    if (!modName) { return files; }

    // 取得文件名
    let apiFile  = modName.replace(/\./g, "\\") + ".lua.api";
    let modFile  = modName.replace(/\./g, "\\") + ".lua";
    let initFile = modName.replace(/\./g, "\\") + "\\init.lua";

    function addFile(...paths: string[]) {
        let file = _join(...paths);
        if (!map.has(file.toLowerCase())) {
            map.set(file.toLowerCase(), true);
            files.push(file);
        }
    }

    if (modType === "$") {
        if (appPath) {
            addFile(appPath, "dao", modFile);
        }

    } else if (modType === "%") {
        if (appPath) {
            addFile(appPath, "com", apiFile);
            addFile(appPath, "com", modFile);
            addFile(appPath, "com", initFile);
            addFile(ngxPath, "app", "lib", modFile);
            addFile(ngxPath, "app", "lib", initFile);
            addFile(rootPath, "lua_modules",  "app", "lib", modFile);
            addFile(rootPath, "lua_modules",  "app", "lib", initFile);
        }

    } else if (modType === "#") {
        addFile(ngxPath,  "app", "utils", modFile);
        addFile(ngxPath,  "app", "utils", initFile);
        addFile(rootPath, "lua_modules",  "app", "utils", modFile);
        addFile(rootPath, "lua_modules",  "app", "utils", initFile);

    } else {
        if (appPath) {
            appPath && addFile(appPath, apiFile);
            appPath && addFile(appPath, modFile);
            appPath && addFile(appPath, initFile);
        }

        addFile(ngxPath, modFile);
        addFile(ngxPath, initFile);
        addFile(ngxPath, "lua", modFile);
        addFile(ngxPath, "lua", initFile);
        addFile(ngxPath, "lualib", modFile);
        addFile(ngxPath, "lualib", initFile);

        addFile(rootPath, "lua_modules", modFile);
        addFile(rootPath, "lua_modules", initFile);
        addFile(rootPath, "lua_modules", "lua", modFile);
        addFile(rootPath, "lua_modules", "lua", initFile);
        addFile(rootPath, "lua_modules", "lualib", modFile);
        addFile(rootPath, "lua_modules", "lualib", initFile);

        const conf = vscode.workspace.getConfiguration("openresty");
        const package_path = conf.get<string[]>("package.path") || [];
        package_path.forEach(path => {
            path = path.trim();
            if (!path) { return; }
            if (path.match(/^([a-zA-Z]+:)?[/\\]/)) {
                addFile(path, modFile);
                addFile(path, initFile);
            } else {
                addFile(rootPath, path, modFile);
                addFile(rootPath, path, initFile);
            }
        });

    }

    return files;

}

const ModNameMap : Record<string, string> = {
    ["table.isempty"] : "table",
    ["table.isarray"] : "table",
    ["table.new"    ] : "table",
    ["table.nkeys"  ] : "table",
    ["table.clone"  ] : "table",
    ["table.clear"  ] : "table",
    ["thread.exdata"]  : "jit",
    ["thread.exdata2"] : "jit",
    ["cjson.safe"   ] : "cjson",
};

/** 取得接口声明文件及模块文件 */
export function getLinkFiles(ctx: NgxPath, name: string) : string[] {

    name = ModNameMap[name] || name;

    const files = [] as string[];
    let file : string;

    // *.api 文件
    file = getApiFile(ctx, name);
    file && files.push(file);

    // *.lua.api 文件
    file = getLuaApiFile(ctx, name);
    file && files.push(file);

    // *.lua 文件
    for (let file of getLuaFiles(ctx, name)) {
        if (_exist(file)) {
            files.push(file);
            // break;
        }
    }

    if (files.length > 0) {
        return files;
    }

    // *.dll 或 *.so 文件
    for (let file of getClibFiles(ctx, name)) {
        if (_exist(file)) {
            files.push(file);
            // break;
        }
    }

    return files;

}

/** 取得 C 模块文件列表 */
export function getClibFiles(ctx: NgxPath, name: string) : string[] {

    const files = [] as string[];
    const map = new Map<string, boolean>();

    const { rootPath, ngxPath } = ctx;

    // 检查路径是否存在
    if (!ngxPath || !name) { return files; }

    // 取得模块名称
    let { modType, modName } = getModType(name);
    if (modType || !modName) { return files; }

    // 取得文件名
    let dllFile  = modName.replace(/\./g, "\\") + ".dll";
    let soFile   = modName.replace(/\./g, "\\") + ".so";

    function addFile(...paths: string[]) {
        let file = _join(...paths);
        if (!map.has(file.toLowerCase())) {
            map.set(file.toLowerCase(), true);
            files.push(file);
        }
    }

    addFile(ngxPath, dllFile);
    addFile(ngxPath, soFile);
    addFile(ngxPath, "lua", dllFile);
    addFile(ngxPath, "lua", soFile);
    addFile(ngxPath, "lualib", dllFile);
    addFile(ngxPath, "lualib", soFile);
    addFile(ngxPath, "clib", dllFile);
    addFile(ngxPath, "clib", soFile);

    addFile(rootPath, "lua_modules", dllFile);
    addFile(rootPath, "lua_modules", soFile);
    addFile(rootPath, "lua_modules", "lua", dllFile);
    addFile(rootPath, "lua_modules", "lua", soFile);
    addFile(rootPath, "lua_modules", "lualib", dllFile);
    addFile(rootPath, "lua_modules", "lualib", soFile);
    addFile(rootPath, "lua_modules", "clib", dllFile);
    addFile(rootPath, "lua_modules", "clib", soFile);

    const conf = vscode.workspace.getConfiguration("openresty");
    const package_cpath = conf.get<string[]>("package.cpath") || [];
    package_cpath.forEach(path => {
        path = path.trim();
        if (!path) { return; }
        if (path.match(/^([a-zA-Z]+:)?[/\\]/)) {
            addFile(path, dllFile);
            addFile(path, soFile);
        } else {
            addFile(rootPath, path, dllFile);
            addFile(rootPath, path, soFile);
        }
    });

    return files;

}

/** 取得 C 模块文件 */
export function getClibFile(ctx: NgxPath, name: string) : string {

    const files = getClibFiles(ctx, name);

    for (let file of files) {
        if (_exist(file)) { return file; }
    }

    return "";

}

/** 取得模块文件 */
export function getModFile(ctx: NgxPath, name: string) : string {

    // 优先使用 *.lua.api 伪代码进行类型推导
    let file = getLuaApiFile(ctx, name);
    if (file) { return file; }

    const files = getLuaFiles(ctx, name);

    for (let file of files) {
        if (_exist(file)) { return file; }
    }

    return "";

}

/** 取得模块代码 */
export function getModCode(ctx: NgxPath, name: string) {

    let file = getModFile(ctx, name);
    if (!file) {return;}

    watchFile(file);  // 监听文件变化

    try {
        let data = _read(file);
        return data.toString();
    } catch (e) {
        // console.log(e);
    }

}
