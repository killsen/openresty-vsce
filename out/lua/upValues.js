"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefine = exports.getUpValues = void 0;
const luaparse = require("luaparse");
const lua = require("./index");
const ngx = require("./ngx");
const parser_1 = require("./parser");
const utils_1 = require("./utils");
const scope_1 = require("./scope");
const modLoader_1 = require("./modLoader");
/** 出错信息对应代码替换 */
const ERRORS = {
    [`'then' expected`]: `()   then end ------ `,
    [`'end' expected`]: `()        end ------ `,
    [`'do' expected`]: `()   do   end ------ `,
    [`')' expected near 'then'`]: `() ) then end ------ `,
    [`')' expected near 'end'`]: `() )      end ------ `,
    [`')' expected near 'do'`]: `() ) do   end ------ `,
    [`'}' expected near '='`]: `(), _ `,
    [`unexpected symbol '=' near`]: `(); _ `,
};
/** 取得上量或成员变量 */
function getUpValues(doc, pos) {
    let path = ngx.getPath(doc.fileName);
    path.fileName = doc.fileName + ".editing"; // 正在编辑中的文件
    let docText = doc.getText();
    let identifier = "_".repeat(30);
    let regx = /[a-zA-Z_]\w*/;
    let range = doc.getWordRangeAtPosition(pos, regx);
    let startOffset, endOffset;
    if (!range) {
        startOffset = endOffset = doc.offsetAt(pos);
    }
    else {
        startOffset = doc.offsetAt(range.start);
        endOffset = doc.offsetAt(range.end);
    }
    let codes = [
        docText.substring(0, startOffset),
        identifier, "()",
        docText.substring(endOffset),
    ];
    function findNode(node) {
        if (node.type === 'Identifier' &&
            node.name === identifier) {
            return true;
        }
    }
    // 尝试运行3次
    for (let i = 0; i < 3; i++) {
        try {
            let scope = loadScope({ path, codes, findNode });
            return scope;
        }
        catch (err) {
            if (!(err instanceof SyntaxError))
                return;
            let msg = err.message;
            // console.log(codes[1], codes[2], "\t", msg)
            let code2;
            for (let key in ERRORS) {
                if (msg.includes(key)) {
                    code2 = ERRORS[key];
                    break;
                }
            }
            if (!code2)
                return;
            codes[2] = code2;
        }
    }
}
exports.getUpValues = getUpValues;
/** 取得变量定义 */
function getDefine(doc, pos) {
    let regx = /[a-zA-Z_]\w*/;
    let range = doc.getWordRangeAtPosition(pos, regx);
    if (!range) {
        return;
    }
    let name = doc.getText(range);
    if (!name) {
        return;
    }
    // console.log(name);
    let scope = getUpValues(doc, pos);
    return scope && (scope["$" + name + "$"] || scope[name] || scope["*"]);
}
exports.getDefine = getDefine;
function loadScope(option) {
    let $$node;
    let { path, codes, findNode } = option;
    let code = codes.join("");
    // console.log(codes.join(""));
    const chunk = luaparse.parse(code, {
        wait: false,
        comments: true,
        scope: true,
        locations: true,
        ranges: true,
        extendedIdentifiers: false,
        luaVersion: 'LuaJIT',
        onCreateScope: () => { },
        onDestroyScope: () => { },
        onCreateNode: (node) => {
            if (node.type === 'Identifier' && findNode(node)) {
                $$node = node;
                // console.log(node);
            }
        },
    });
    if (!$$node) {
        return;
    }
    const _G = lua.genGlobal(path);
    const _g = lua.newScope(_G, path.fileName);
    const _d = lua.newScope(_g);
    // 解析注释中的类型定义
    let $$comm = utils_1.parseComments(chunk.comments);
    scope_1.setValue(_g, "$$comm", $$comm, true);
    // 导入外部构造函数
    let firstComm = $$comm && $$comm[1];
    if (firstComm && firstComm.name === "@@@") {
        let modName = firstComm.value;
        if (modName) {
            let mod = modLoader_1.loadModule(path, modName);
            if (mod && mod["@@"]) {
                scope_1.setValue(_g, "@@", mod["@@"], true); // 外部构造函数
            }
        }
    }
    // 生成请求参数及自定义类型
    let mod = modLoader_1.loadModuleByCode(path, code);
    if (mod) {
        scope_1.setValue(_g, "$$req", mod["$req"], true); // 请求参数类型
        scope_1.setValue(_g, "$$res", mod["$res"], true); // 返回值类型 v21.11.25
        scope_1.setValue(_g, "$$types", mod["$types"], true); // 自定义类型
    }
    for (const s of chunk.body) {
        if (utils_1.isInScope(s, $$node)) { // 作用域内
            scope_1.setValue(_g, "$$node", $$node, true);
            scope_1.setValue(_g, "$$func", null, true);
            scope_1.setValue(_g, "$$call", null, true);
            parser_1.loadNode(s, _g);
        }
        else if (utils_1.isDownScope(s, $$node)) { // 作用域下
            parser_1.loadNode(s, _d);
        }
        else { // 作用域上
            parser_1.loadNode(s, _g);
        }
        if ($$node.scope instanceof Object) {
            let t = mergeScope($$node.scope);
            if (t instanceof Object) {
                t["$$call"] = _g["$$call"]; // 参数提示
            }
            return t;
        }
    }
    let $$func = _g["$$func"];
    while (typeof $$func === "function") {
        delete _g["$$func"];
        $$func();
        if ($$node.scope) {
            let t = mergeScope($$node.scope);
            if (t instanceof Object) {
                t["$$call"] = _g["$$call"]; // 参数提示
            }
            return t;
        }
        $$func = _g["$$func"];
    }
}
/** 合并作用域变量集合 */
function mergeScope(t) {
    if (!t) {
        return {};
    }
    let s = {};
    while (t) {
        s = Object.assign(Object.assign({}, t), s);
        t = t.$scope;
    }
    return s;
}
//# sourceMappingURL=upValues.js.map