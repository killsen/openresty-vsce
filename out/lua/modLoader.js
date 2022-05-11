"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadModuleByCode = exports.loadModule = void 0;
const luaparse = require("luaparse");
const lua = require("./index");
const ngx_1 = require("./ngx");
const parser_1 = require("./parser");
const utils_1 = require("./utils");
const scope_1 = require("./scope");
const modApiTypes_1 = require("./modApiTypes");
/** 通过名称加载模块 */
function loadModule(path, name) {
    let fileName = ngx_1.getModFile(path, name);
    if (!fileName) {
        return;
    }
    let code = ngx_1.getModCode(path, name);
    if (!code) {
        return;
    }
    path.modName = name;
    return loadModuleByCode(path, code, fileName);
}
exports.loadModule = loadModule;
/** 通过代码加载模块 */
function loadModuleByCode(path, code, fileName) {
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
        const _G = lua.genGlobal(path);
        const _g = lua.newScope(_G, fileName);
        // 模块名称及文件
        scope_1.setValue(_g, "$$name", path.modName, true);
        scope_1.setValue(_g, "$$file", path.fileName, true);
        // 解析注释中的类型定义
        let $$comm = utils_1.parseComments(chunk.comments);
        scope_1.setValue(_g, "$$comm", $$comm, true);
        let mod = parser_1.loadBody(chunk.body, _g);
        if (mod instanceof Object) {
            mod["$file"] = fileName;
            // 构造函数
            let func = scope_1.getValue(_g, "@@");
            if (typeof func === "function") {
                mod["@@"] = func;
            }
            modApiTypes_1.loadApiTypes(path, mod);
            scope_1.setValue(_g, "$$req", mod["$req"], true); // 请求参数类型
            scope_1.setValue(_g, "$$res", mod["$res"], true); // 返回值类型 v21.11.25
            scope_1.setValue(_g, "$$types", mod["$types"], true); // 自定义类型
        }
        return mod;
    }
    catch (err) {
        if (err instanceof SyntaxError) {
            // console.log(err.message);
        }
    }
}
exports.loadModuleByCode = loadModuleByCode;
//# sourceMappingURL=modLoader.js.map