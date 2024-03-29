
import { Node, FunctionDeclaration } from 'luaparse';
import { newScope, getValue, setValue, LuaScope, setValueTyped } from './scope';
import { loadBody } from './parser';
import { genResArgs } from './parser/genResArgs';
import { LuaModule, LuaStringOrNil, LuaTable } from './types';
import { getItem, isArray, isInScope, isObject } from './utils';
import { get_arg_vtype_callback, loadReturnTypes, loadType, loadTypex } from './vtype';

type ArgsFunc = (i: number, args: (undefined | Node)[], _g_: LuaScope) => any;

/** 调用函数 */
export function callFunc(t: any, ...args: any) {

    try {
        if (!t) { return; }

        if (typeof t === "function") {
            let res = t(...args);
            t["$$self"] = undefined;
            return res;
        }

        let f = getItem(t, ["()"]);
        if (typeof f === "function") {
            f["$$self"] = t["$$self"];
            let res = f(...args);
            f["$$self"] = t["$$self"] = undefined;
            return res;
        } else if (f !== undefined) {
            return f;
        }

        f = getItem(t, ["$$mt", ".", "__call", "()"]);
        if (typeof f === "function") {
            f["$$self"] = t["$$self"] = undefined;
            return f(t, ...args);  // 第一个参数 t 自己
        } else if (f !== undefined) {
            return f;
        }

    }catch(e){
        // console.log(e);
    }

}

/** 取得函数 */
export function getFunc(t: any) {
    if (typeof t === "function") { return t; }

    let f = getItem(t, ["()"]);
    if (typeof f === "function") { return f; }

    f = getItem(t, ["$$mt", ".", "__call", "()"]);
    if (typeof f === "function") { return f; }
}

/** 生成函数 obj.func(self, abc) => obj:func(abc) */
export function makeSelfCallFunc(funt: LuaModule) {

    if (!isObject(funt)) { return; }

    const func = funt["()"] as any;
    if (typeof func !== "function") { return; }

    const $args = func.$args as ArgsFunc;
    if (typeof $args !== "function") { return; }

    _call.$$self = undefined as any;

    _call.$args = (i: number, args: (undefined | Node)[], _g_: LuaScope) => {
        i = Number(i) || 0;
        const argx = isArray(args) ? [undefined, ...args] : [];
        return $args(i+1, argx, _g_);
    };

    // 最少参数个数 - 1
    let argsMin = typeof funt.argsMin === "number" ? funt.argsMin : 0;
    if (argsMin > 0) { argsMin--; }

    return {
        ...funt,
        "()"    : _call,
        args    : funt.selfArgs,
        $argx   : funt.selfArgx,
        argsMin,
    };

    function _call (...args: any) {
        func.$$self = _call.$$self;
        const res = func(...args);
        func.$$self = _call.$$self = undefined;
        return res;
    }

}

/** 生成函数 obj:func(abc) => obj.func(self, abc) */
export function makeNormalCallFunc(funt: LuaModule) {

    if (!isObject(funt)) { return; }

    const func = funt["()"] as any;
    if (typeof func !== "function") { return; }

    const $args = func.$args as ArgsFunc;
    if (typeof $args !== "function") { return; }

    _call.$$self = undefined as any;

    _call.$args = (i: number, args: (undefined | Node)[], _g_: LuaScope) => {
        i = Number(i) || 0;
        const argx = isArray(args) ? [...args] : [];
        argx.shift();
        return i === 0 ? LuaTable : $args(i-1, argx, _g_);
    };

    let args  = typeof funt.args  === "string" ? funt.args  : "()";
    let $argx = typeof funt.$argx === "string" ? funt.$argx : "()";

    args  =  args.replace("(", "(self, ").replace(", )", ")");
    $argx = $argx.replace("(", "(self, ").replace(", )", ")");

    // 最少参数个数 + 1
    let argsMin = typeof funt.argsMin === "number" ? funt.argsMin : 0;
    if (argsMin > 0) { argsMin++; }

    return {
        ...funt,
        "()" : _call,
        args,
        argsMin,
        $argx,
    };

    function _call ($$self: any, ...args: any) {
        func.$$self = $$self;
        const res = func(...args);
        func.$$self = $$self = undefined;
        return res;
    }

}

/** 生成函数 */
export function makeFunc(node: FunctionDeclaration, _g: LuaScope) {

    const typex = loadTypex(node, _g);  // 通过注释加载类型
    const txRes = typex["return"];      // 返回值类型

    // 构造器 @@ <Constructor>
    if (typex["@@"]) {
        setValue(_g, "@@", myFunc, true);
        delete typex["@@"];
    }

    const argt = getFuncArgx(node, typex);

    myFunc.args     = argt.args;
    myFunc.$argx    = argt.argx;
    myFunc.selfCall = argt.selfCall;
    myFunc.selfArgs = argt.selfArgs;
    myFunc.selfArgx = argt.selfArgx;
    myFunc.argsMin  = argt.argsMin;

    if (typex["@@desc"]) {  // 函数注释
        myFunc.$$docs = typex["@@desc"].desc;
        delete typex["@@desc"];
    }

    myFunc.$$req  = undefined as any;   // api接口请求参数
    myFunc.$$res  = undefined as any;   // api接口返回类型
    myFunc.$$self = undefined as any;   // 面向对象self变量

    // 获取回调函数位置 (fun: function*, ...)
    let callbackIndex = -1;
    if (node.parameters.length >= 2) {
        const params = node.parameters;
        if (params[params.length - 1].type === "VarargLiteral") {
            const i = params.length - 2;
            const p = params[i];
            if (p && p.type === "Identifier") {
                const tx = typex[p.name];
                if (tx && tx.type === "function*") {
                    callbackIndex = i;
                }
            }
        }
    }

    // 参数类型定义
    myFunc.$args = function (i: number, args: (undefined | Node)[], _g_: LuaScope) {
        i = Number(i) || 0;

        if (i === 0 && myFunc["$$req"]) {
            return myFunc["$$req"];
        }

        // 获取回调函数参数类型 (fun: function*, ...)
        if (callbackIndex !== -1 && i >= callbackIndex) {
            return get_arg_vtype_callback(i, args, _g_, callbackIndex, 0);
        }

        const p = node.parameters[i];
        if (p && p.type === "Identifier") {
            const tx = typex[p.name];
            if (tx) {
                return loadType(tx.type, _g, tx.loc);
            } else if (p.name === "self") {
                return LuaTable;
            }
        }
    };

    let isRunning = false;  // 是否正在运行中
    let callOnce = false;   // 是否只允许一次
    let resValue: any;      // 最近一次的返回值

    let $$lints = getValue(_g, "$$lints") || null;  // 类型检查
    let $$node  = getValue(_g, "$$node")  || null;  // 光标位置
    if ($$node && !isInScope(node, $$node)) {
        $$node = null;  // 不在作用域内
    }

    if (!node.isParsed) {
        node.isParsed = true;  // 标识为: 已经解析过了

        // 光标位置在函数定义内部
        $$node && setValue(_g, "$$func", myFunc, false);

        // 为 apicheck 提供待运行的函数
        const $$funcs = getValue(_g, "$$funcs") as Function[];
        isArray($$funcs) && $$funcs.push(myFunc);
    }

    return myFunc;

    function myFunc (...params: any) {

        const $$req  = myFunc["$$req"];  // api接口请求参数
        const $$res  = myFunc["$$res"];  // api接口返回类型
        const $$self = myFunc["$$self"]; // 面向对象self变量

        if (isRunning) {
            // console.log("函数递归回调");
            if (!resValue && txRes) {
                resValue = loadReturnTypes(txRes.type, _g, txRes.loc);
                if (isArray(resValue) && resValue.length === 1) {
                    resValue = resValue[0];  // 只有一个返回值
                }
            }
            return resValue;

        } else if (callOnce && !$$self) {
            // console.log("只执行一次");
            return resValue;
        }

        const newG = newScope(_g);

        // 没有参数：只执行一次
        let args = node.parameters;
        callOnce = (args.length === 0);

        if (isObject($$self)) {
            setValue(newG, "self", $$self, true);

            // 去掉第一个参数 self 或者 _
            if (args.length > 0 && args[0].type === "Identifier" && (args[0].name === "self" || args[0].name === "_")) {
                args = [ ... args ];
                args.shift();
            }
        }

        setValue(newG, "$$return", [], true);           // 初始化返回值数组
        setValue(newG, "$type_return", $$res, true);    // 初始化返回值类型
        setValue(newG, "$type_return1", $$res, true);   // 初始化返回值类型

        for (let i=2; i<100; i++) {
            let vt = getValue(newG, "$type_return" + i);
            if (vt) {
                // 清除外层函数返回值类型
                setValue(newG, "$type_return" + i, null, true);
            } else {
                break;
            }
        }

        // 构造器 @@ <Constructor>
        let self = getValue(newG, "self");
        if (!self) {
            let func = getValue(_g, "@@");
            if (typeof func === "function" && func !== myFunc) {
                self = func["@@self"];
                if (self === undefined) {
                    // 缓存 self 以提升性能
                    self = func["@@self"] = callFunc(func) || {};
                }
                setValue(newG, "self", self, true, node.loc);
            }
        }

        args.forEach((p, i) => {

            let name  = p.type === "VarargLiteral" ? p.raw : p.name;
            let value = params[i];
            let vt    = null;

            if ( name === "..." ) {
                value = params.slice(i);

            } else if ( i === 0 && $$req) {
                value = $$req;                          // 生成请求参数类型

            } else if (typex[name]) {
                const tx = typex[name];
                tx.isArg = true;  // 参数类型
                vt = loadType(tx.type, newG, tx.loc);    // 通过类型名称取得类型

            } else if ( name === "self" && self && value === undefined) {
                value = self;                           // 构造器 @@ <Constructor>
            }

            setValueTyped(newG, "$type_" + name, vt);
            setValue(newG, "$param_" + name, true, true);
            setValue(newG, name, value, true, p.loc);
        });

        // setValueTyped(newG, "$type_return", null);

        // 加载其它非参数及返回值类型
        for (let name in typex) {
            let tx = typex[name];
            if (name === "return") {  // 返回值类型
                let vtypes = loadReturnTypes(tx.type, newG, tx.loc);
                vtypes.forEach((vt, i) => {
                    i === 0 && setValueTyped(newG, "$type_return", vt);
                    setValueTyped(newG, "$type_return" + (i+1), vt);
                });
            } else if (!tx.isArg) {  // 非参数类型
                let vt = loadType(tx.type, newG, tx.loc);
                setValueTyped(newG, "$type_" + name, vt);
            }
        }

        if ($$res) {
            setValueTyped(newG, "$type_return", $$res);
            setValueTyped(newG, "$type_return1", $$res);
            setValueTyped(newG, "$type_return2", LuaStringOrNil);
        }

        // 编辑模式, 或检查模式, 或者未指定返回类型, 则需要运行代码
        if ($$node || $$lints || (!$$res && !txRes)) {
            $$node === null && setValue(newG, "$$node", null, true);
            $$node   = null;    // 光标位置只处理一次

            $$lints === null && setValue(newG, "$$lints", null, true);
            $$lints   = null;   // 类型检查只进行一次

            isRunning = true;   // 避免递归回调：造成死循环
            resValue  = loadBody(node.body, newG, node.loc);
            isRunning = false;
        }

        if ($$res) {
            resValue = [ $$res, LuaStringOrNil ];
        } else if (txRes) {
            resValue = loadReturnTypes(txRes.type, newG, txRes.loc);
        }

        if (isArray(resValue) && resValue.length === 1) {
            resValue = resValue[0];  // 只有一个返回值
        }

        return resValue;
    }

}

/** 取得函数参数及返回值表达式 */
function getFuncArgx(node: FunctionDeclaration, typex: ReturnType<typeof loadTypex>) {

    let args = node.parameters.map(p => {
        switch (p.type) {
            case "Identifier": return p.name;
            case "VarargLiteral": return p.raw;
        }
    });

    // 取得最少参数个数
    let argsMin = 0;
    node.parameters.forEach((p, i) => {
        let vt = p.type === "Identifier" && typex[p.name];
        if (vt && vt.required) {
            argsMin = i+1;
        }
    });

    let argx = args.map(name => {
        const vt = typex[name];
        return vt ? `${ vt.name }${ vt.required ? "" : "?" }: ${ vt.type }` : name;
    }).join(", ");
    argx = "(" + argx + ")";

    let selfCall = args[0] === "self" || args[0] === "_";
    let selfArgs = args.slice(1);
    let selfArgx = selfArgs.map(name => {
        const vt = typex[name];
        return vt ? `${ vt.name }${ vt.required ? "" : "?" }: ${ vt.type }` : name;
    }).join(", ");
    selfArgx = "(" + selfArgx + ")";

    if (typex["return"]) {
        const vt = typex["return"];
        argx += " => " + vt.type;
        selfArgx += " => " + vt.type;
    } else {
        const resArgs = genResArgs(node.body);
        if (resArgs.includes("\n")) {
            argx += "\n" + resArgs;
            selfArgx += "\n" + resArgs;
        } else {
            argx += resArgs;
            selfArgx += resArgs;
        }
    }

    return {
        args: `(${ args.join(", ") })`,
        argsMin,
        argx,
        selfCall,
        selfArgs: `(${ selfArgs.join(", ") })`,
        selfArgx
    };

}

/** 生成函数文档 */
export function parseFuncDoc(node: FunctionDeclaration, _g: LuaScope) {

    let nloc = node.loc;
    if (!nloc) {return;}

    let $$comm = getValue(_g, "$$comm");
    if (!($$comm instanceof Object)) {return;}

    let docs: string[] = [];

    let args = node.parameters.map(p => {
        switch (p.type) {
            case "Identifier": return p.name;
            case "VarargLiteral": return p.raw;
        }
    });

    docs.push("#### {{name}} (" + args.join(", ") + ")");

    // 函数注释
    let comm = $$comm[nloc.start.line-1];
    if (comm && comm.desc) {
        docs.push("#### " + comm.desc);
    }

    let returnDoc = "";
    let argsDoc: string[] = [];

    for (let i=nloc.start.line+1; i<=nloc.end.line; i++) {
        let comm = $$comm[i];
        if (comm instanceof Object) {
            let { name, value, desc } = comm;
            if (name && value) {
                if (name === "return") {
                    returnDoc = "`< " + value + " >` " + desc;
                } else if(!name.startsWith("@")) {
                    argsDoc.push("* " + name + " `< " + value + " >` " + desc);
                }
            }
        }
    }

    if (args.length > 0 && argsDoc.length > 0 ) {
        docs.push("");
        docs.push("----------");
        docs.push("参数类型：");
        docs.push("");
        docs.push(...argsDoc);
    }

    if (returnDoc) {
        docs.push("");
        docs.push("----------");
        docs.push("返回类型：" + returnDoc);
        docs.push("");
    } else {
        let resArgs = genResArgs(node.body);
        if (resArgs) {
            docs.push("");
            docs.push("----------");
            docs.push("返回类型：");
            let arr = resArgs.split("\n");
            arr.forEach(s=>{
                s = s.replace("->", "*");
                docs.push(s);
            });
            docs.push("");
        }
    }

    // 模块名称及文件
    let modName = getValue(_g, "$$name");
    let modFile = getValue(_g, "$$file");
    if (modName && modFile) {
        docs.push("");
        docs.push("----------");
        docs.push("#### 模块：[" + modName + "](file:" + modFile + ")");
        docs.push("");
    }

    return docs.join("\n");

}


/** 设置 {} 参数补全作用域及参数提示 */
export function setScopeCall(scope: any, $$node: Node, _g: LuaScope){

    $$node.scope = scope;

    if (!isObject(scope)) {return;}

    const args = Object.keys(scope).filter (
        k => /^[a-zA-Z_][0-9a-zA-Z_]*$/.test(k)
    );

    if (args.length === 0) {return;}

    const $$call = {
        args  : "{ " + args.join(", ") + " }",
        doc   : "",
        index : 0
    };

    setValue(_g, "$$call", $$call, false);

}

/** 设置 () 参数提示 */
export function setArgsCall(funt: any, index: number, _g: LuaScope){

    if (!isObject(funt)) {return;}

    let args = [] as string[];
    let doc  = "";

    if (funt["()"]) {
        doc  =  funt.doc  || "";
        args = (funt.args || "").replace(/[()\s]/g, "").split(",");
    } else {
        let _call = getItem(funt, ["$$mt", ".", "__call"]) as LuaModule;
        if (!isObject(_call)) { return; }

        doc  =  _call.doc  || "";
        args = (_call.args || "").replace(/[()\s]/g, "").split(",");
        args.shift();  // 去掉第一个参数
    }

    if (args.length === 0) {return;}

    const $$call = {
        args : "( " + args.join(", ") + " )",
        doc,
        index,
    };

    setValue(_g, "$$call", $$call, false);

}
