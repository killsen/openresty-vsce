
import * as luaparse from "luaparse";
import * as lua from './index';
import * as ngx from './ngx';
import { TextDocument, Position } from 'vscode';
import { loadNode, } from './parser';
import { isInScope, isDownScope, parseComments } from './utils';
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
    [`unexpected symbol '=' near`   ] : `(); _ `,  // { _____(), _ = ... }  // 光标在赋值语句等号(=)前面
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

/** 取得变量定义 */
export function getDefine(doc: TextDocument, pos: Position) {

    let regx = /[a-zA-Z_]\w*/;
    let range = doc.getWordRangeAtPosition(pos, regx);
    if (!range) { return; }

    let name = doc.getText(range);
    if (!name) { return; }

    // console.log(name);

    let scope: any = getUpValues(doc, pos);
    return scope && (scope["$" + name + "$"] || scope[name] || scope["*"]);

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
    const _d = lua.newScope(_g);

    // 解析注释中的类型定义
    let $$comm = parseComments(chunk.comments);
    setValue(_g, "$$comm", $$comm, true);

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

    for (const s of chunk.body) {

        if (isInScope(s, $$node)) { // 作用域内
            setValue(_g, "$$node", $$node, true);
            setValue(_g, "$$func", null, true);
            setValue(_g, "$$call", null, true);
            loadNode(s, _g);

        }else if (isDownScope(s, $$node)) { // 作用域下
            loadNode(s, _d);

        } else { // 作用域上
            loadNode(s, _g);
        }

        if ($$node.scope instanceof Object) {
            let t: any = mergeScope($$node.scope);
            if (t instanceof Object) {
                t["$$call"] = _g["$$call"];  // 参数提示
            }
            return t;
        }

    }

    let $$func = _g["$$func"];
    while (typeof $$func === "function") {
        delete _g["$$func"];
        $$func();
        if ($$node.scope) {
            let t: any = mergeScope($$node.scope);
            if (t instanceof Object) {
                t["$$call"] = _g["$$call"];  // 参数提示
            }
            return t;
        }
        $$func = _g["$$func"];
    }

}

/** 合并作用域变量集合 */
function mergeScope(t: any) {

    if (!t) { return {}; }

    let s = {};

    while (t) {
        s = { ...t, ...s };
        t = t.$scope;
    }

    return s;

}
