
import { Node, FunctionDeclaration } from 'luaparse';
import { newScope, getValue, setValue, LuaScope } from './scope';
import { loadBody } from './parser';
import { genResArgs } from './parser/genResArgs';
import { getItem } from './utils';
import { LuaModule } from './types';

/** 调用函数 */
export function callFunc(t: any, ...args: any) {

    // console.log("callFunc");
    let fun;

    if (typeof t === "function") {
        fun = t;

    } else if (t instanceof Object) {
        t = t["()"];
        if (typeof t === "function") {
            fun = t;
        }

    }else{
        return;
    }

    if (typeof fun === "function") {
        try{
            t = fun.apply(t, args);
        }catch(e){
            // console.log(e);
        }
    }

    return t;

}

/** 生成函数 */
export function makeFunc(node: FunctionDeclaration, _g: LuaScope) {

    let isRunning = false;
    let callOnce = false;
    let resValue: any;

    let args = node.parameters;
    let body = node.body;
    let types = loadTypes(node, _g);  // 通过注释加载类型

    let returnType = types && types["return"];  // 返回值类型

    const myFunc = function (...params: any) {

        let myfunc : any = myFunc;
        let $$req  : any = myfunc["$$req"];  // 请求参数类型
        let $$res  : any = myfunc["$$res"];  // 返回值类型 v21.11.25

        if (isRunning) {
            // console.log("函数递归回调");
            resValue = returnType && loadType(returnType, _g) || resValue;
            return resValue;

        } else if (callOnce) {
            // console.log("只执行一次");
            return resValue;
        }

        // 没有参数：只执行一次
        callOnce = (args.length === 0);

        let newG = newScope(_g);

        if (types) {
            for (let name in types) {
                let value = loadType(types[name], newG);
                // 预定义类型 v21.11.25
                setValue(newG, "$type_" + name, value, true);
            }
        }

        // 构造器 @@ <Constructor>
        let self = getValue(newG, "self");
        if (!self) {
            let func = getValue(_g, "@@")
            if (typeof func === "function" && func !== myFunc) {
                self = callFunc(func);
                if (self) {
                    setValue(newG, "self", self, true, node.loc);
                }
            }
        }

        args.forEach((p, i) => {
            let name;
            switch (p.type) {
                case "Identifier": name = p.name; break;
                case "VarargLiteral": name = p.raw; break;
            }
            let value = params[i];

            if ( i == 0 && $$req) {
                value = $$req;                          // 生成请求参数类型

            } else if (types && types[name]) {
                value = loadType(types[name], newG);    // 通过类型名称取得类型

            } else if ( name === "self" && self ) {
                value = self;                           // 构造器 @@ <Constructor>
            }

            // { } 参数补全及提示
            if (i===0 && value instanceof Object) {
                let $$func: any = myFunc;
                let $$gggg = $$func["$$gggg"];
                if ($$gggg) {
                    delete $$func["$$gggg"];
                    let $$keys = getValue($$gggg, "$$keys");
                    let $$node = getValue($$gggg, "$$node");
                    if ($$node && $$keys instanceof Array) {
                        let scope = getItem(value, $$keys);
                        setScopeCall(scope, $$node, $$gggg);
                    }
                }
            }

            setValue(newG, name, value, true, p.loc);
        });

        // 编辑模式下，或者未指定返回类型，则需要运行代码
        let needToRun = getValue(newG, "$$node") || (!$$res && !returnType);

        if (needToRun) {
            isRunning = true;  // 避免递归回调：造成死循环
            resValue = loadBody(body, newG);
            isRunning = false;
        }

        if ($$res) {
            resValue = $$res;  // 返回值类型 v21.11.25

        } else if (returnType) {
            // 按指定类型返回或按指定参数返回 v21.11.25
            resValue = loadType(returnType, newG) || getValue(newG, returnType) || resValue;
        }

        return resValue;
    };

    // 构造器 @@ <Constructor>
    if (types && types["@@"]) {
        setValue(_g, "@@", myFunc, true)
    }

    return myFunc;

}

/** 通过类型名称取得类型 */
function loadType(typeName: string, _g: LuaScope) {

    // 自定义类型命名: 兼容处理
    typeName = typeName.replace("@", "")

    let isArray = typeName.indexOf("[]") !== -1
    if (isArray) typeName = typeName.replace("[]", "");

    if (typeName.startsWith("$")) {
        // 加载 dao 类型
        let _load = getValue(_g, "_load");
        if (_load) {
            let mod: LuaModule = callFunc(_load, typeName);
            if (mod instanceof Object && mod["$dao"]) {
                let daoType = mod["$dao"];
                let daoRow = daoType["row"];
                let doc = "## "+ typeName +"\ndao 类型单行数据\n" + daoType.doc;
                let t = { doc, ".": { ...daoRow } };  // 复制字段定义
                if (isArray) {
                    doc = "## "+ typeName +"[]\ndao 类型多行数据\n" + daoType.doc;
                    return { doc, "[]": t }  // 数组
                } else {
                    return t;
                }
            }
        }

    } else {
        // 加载自定义类型
        let $$types = getValue(_g, "$$types");
        if ($$types instanceof Object) {
            let mod: LuaModule = $$types[typeName];
            if (mod instanceof Object && mod["."] instanceof Object) {
                let userType = mod["."];
                let doc = "## "+ typeName +"\n自定义类型对象\n" + mod.doc;
                let t = { doc, ".": { ...userType } };  // 复制字段定义
                if (isArray) {
                    doc = "## "+ typeName +"[]\n自定义类型数组\n" + mod.doc;
                    return { doc, "[]": t }  // 数组
                } else {
                    return t;
                }
            }
        }

    }

}

/** 通过注释加载类型 */
function loadTypes(node: Node, _g: LuaScope) {

    let nloc = node.loc;
    if (!nloc) return;

    let $$comm = getValue(_g, "$$comm");
    if (!($$comm instanceof Object)) return;

    let types: { [key: string]: string } = {};

    for (let i=nloc.start.line; i<=nloc.end.line; i++) {
        let comm = $$comm[i];
        if (comm instanceof Object) {
            let { name, value } = comm;
            if (name && value) {
                types[name] = value;
            }
        }
    }

    return types;

}

/** 生成函数文档 */
export function parseFuncDoc(node: FunctionDeclaration, _g: LuaScope) {

    let nloc = node.loc;
    if (!nloc) return;

    let $$comm = getValue(_g, "$$comm");
    if (!($$comm instanceof Object)) return;

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

    if (!(scope instanceof Object)) return;

    let args: string[] = [];

    Object.keys(scope).forEach(k=>{
        if (k.startsWith("$")) return;
        if (/\d+/.test(k)) return;
        args.push(k);
    });

    let $$call = {
        doc : "",
        args : "{" + args.join(", ") + "}",
        index : 0
    };

    setValue(_g, "$$call", $$call, false);

}
