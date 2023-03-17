
import * as luaparse from "luaparse";
import * as lua from './index';
import * as ngx from './ngx';
import { TextDocument, Position, Range } from 'vscode';
import { loadBody } from './parser';
import { isObject, parseComments } from './utils';
import { setValue } from './scope';
import { loadModule, loadModuleByCode } from './modLoader';

interface LuaScopeOption {
    ctx: ngx.NgxPath;
    codes: string[];
    findNode: Function;
}

/** 出错信息对应代码替换 */
const ERRORS: { [key: string] : string } = {
    [`'then' expected`              ] : `()   then end ------ `,
    [`'end' expected`               ] : `()        end ------ `,
    [`'do' expected`                ] : `()   do   end ------ `,

    [`')' expected near 'then'`     ] : `() ) then end ------ `,
    [`')' expected near 'end'`      ] : `() )      end ------ `,
    [`')' expected near 'do'`       ] : `() ) do   end ------ `,

    [`'}' expected near '='`        ] : `(), _ `,  // { _____(), _ = ... }  // 光标在 {} 表达式等号(=)前面
    [`'}' expected near`            ] : `(), `  ,  // { _____(), ...     }  // 光标在 {} 表达式逗号(,)前面
    [`unexpected symbol`            ] : `(). _ `,  // { _____(). _ = ... }  // 光标在赋值语句等号(=)前面
};

/** 取得上量或成员变量 */
export function getUpValues(doc: TextDocument, pos: Position) {

    let ctx = ngx.getPath(doc.fileName);
    ctx.fileName = doc.fileName + ".editing";  // 正在编辑中的文件

    let docText = doc.getText();
    let identifier = "_".repeat(30);

    let regx = /[a-zA-Z_]\w*/;
    let range = doc.getWordRangeAtPosition(pos, regx);
    let startOffset, endOffset;

    if (!range) {
        startOffset = endOffset = doc.offsetAt(pos);
    } else {
        startOffset = doc.offsetAt(range.start);
        endOffset = doc.offsetAt(range.end);
    }

    let codes = [
        docText.substring(0, startOffset),
        identifier, "()",
        docText.substring(endOffset),
    ];

    function findNode(node: luaparse.Node) {
        if (node.type === 'Identifier' &&
            node.name ===  identifier ) {
            node.isCursor = true;  // 光标所在位置
            return true;
        }
    }

    // 尝试运行3次
    for (let i=0; i<3; i++) {

        try {
            let scope = loadScope({ ctx, codes, findNode });
            return scope;

        } catch (err) {
            if (!(err instanceof SyntaxError)) {return;}

            let msg = err.message;
            // console.log(codes[1], codes[2], "\t", msg)

            let code2;

            for (let key in ERRORS) {
                if (msg.includes(key) ) {
                    code2 = ERRORS[key];
                    break;
                }
            }

            if (!code2) {return;}
            codes[2] = code2;
        }
    }

}

/** 位置信息是否一致 */
function isSameLoc(node: luaparse.Node, range: Range) {
    const loc = node.loc;
    return loc && range &&
        loc.start.line === range.start.line + 1 &&
        loc.start.column === range.start.character &&
        loc.end.line === range.end.line + 1 &&
        loc.end.column === range.end.character;
}

/** 取得变量定义 */
export function getDefineScope(doc: TextDocument, pos: Position) {

    const regx = /[a-zA-Z_]\w*/;
    const range = doc.getWordRangeAtPosition(pos, regx);

    const name = range && doc.getText(range);
    if (!name) { return; }

    function findNode(node: luaparse.Node) {
        if (node.type === 'Identifier' &&
            isSameLoc(node, range!) ) {
            node.isCursor = true;  // 光标所在位置
            return true;
        }
    }

    const ctx = ngx.getPath(doc.fileName);
    ctx.fileName = doc.fileName + ".editing";  // 正在编辑中的文件

    const codes = [ doc.getText() ];
    const scope = loadScope({ ctx, codes, findNode });

    if (!isObject(scope)) { return; }

    return { name, scope };

}

/** 取得变量定义 */
export function getDefine(doc: TextDocument, pos: Position) {

    const defineScope = getDefineScope(doc, pos);
    if ( !defineScope ) { return; }
    const { scope, name } = defineScope;

    return scope["$" + name + "$"] || scope[name] || scope["*"];

}

function loadScope(option: LuaScopeOption) {

    let $$node: luaparse.Node | undefined;
    let { ctx, codes, findNode } = option;

    let code = codes.join("");

    // console.log(codes.join(""));

    const chunk = luaparse.parse( code, {
        wait: false,
        comments: true,
        scope: true,
        locations: true,
        ranges: true,
        extendedIdentifiers: false,
        luaVersion: 'LuaJIT',
        onCreateScope: () => { },
        onDestroyScope: () => { },
        onCreateNode: (node: luaparse.Node) => {
            if (node.type === 'Identifier' && findNode(node)) {
                $$node = node;
                // console.log(node);
            }
        },
    });

    if (!$$node) { return; }

    const _G = lua.genGlobal(ctx);
    const _g = lua.newScope(_G, ctx.fileName);

    // 解析注释中的类型定义
    let $$comm = parseComments(chunk.comments);
    setValue(_g, "$$comm", $$comm, true);
    setValue(_g, "$$comments", chunk.comments, true);

    // 导入外部构造函数
    let firstComm = $$comm && $$comm[1];
    if (firstComm && firstComm.name === "@@@") {
        let modName = firstComm.value;
        if (modName) {
            let mod = loadModule(ctx, modName);
            if (mod && mod["@@"]) {
                setValue(_g, "@@", mod["@@"], true);  // 外部构造函数
            }
        }
    }

    // 生成请求参数及自定义类型
    let mod = loadModuleByCode(ctx, code);
    if (mod) {
        setValue(_g, "$$req", mod["$req"], true);       // 请求参数类型
        setValue(_g, "$$res", mod["$res"], true);       // 返回值类型 v21.11.25
        setValue(_g, "$$types", mod["$types"], true);   // 自定义类型

        if (mod["@@"]) {
            setValue(_g, "@@", mod["@@"], true);        // 内部构造函数
        }
    }

    setValue(_g, "$$node", $$node, true);
    setValue(_g, "$$func", null, true);
    setValue(_g, "$$call", null, true);

    loadBody(chunk.body, _g);

    if ($$node.scope) {
        let t = mergeScope($$node.scope);
        if ("$$call" in _g) {
            t["$$call"] = _g["$$call"];  // 参数提示
        }
        return t;
    }

    let $$func = _g["$$func"];
    while (typeof $$func === "function") {
        _g["$$func"] = null;  // 不能删除哦！！！
        $$func();
        if ($$node.scope) {
            let t = mergeScope($$node.scope);
            if ("$$call" in _g) {
                t["$$call"] = _g["$$call"];  // 参数提示
            }
            return t;
        }
        $$func = _g["$$func"];
    }

}

/** 合并作用域变量集合 */
function mergeScope(t: any) : any {

    if (!t) { return {}; }

    let s = {};

    while (t) {
        s = { ...t, ...s };
        t = t.$scope;
    }

    return s;

}
