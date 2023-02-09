
import { Node, FunctionDeclaration } from 'luaparse';
import { newScope, getValue, setValue, LuaScope, setChild } from './scope';
import { loadBody } from './parser';
import { genResArgs } from './parser/genResArgs';
import { LuaModule, getLuaType } from './types';
import { getItem, isArray, isObject } from './utils';
const readonly = true;

/** 调用函数 */
export function callFunc(t: any, ...args: any) {

    try {
        if (typeof t === "function") {
            return t(...args);
        }

        let f = getItem(t, ["()"]);
        if (typeof f === "function") {
            f["$$self"] = t["$$self"];
            return f(...args);
        } else if (f !== undefined) {
            return f;
        }

        f = getItem(t, ["$$mt", ".", "__call", "()"]);
        if (typeof f === "function") {
            f["$$self"] = t["$$self"];
            return f(t, ...args);  // 第一个参数 t 自己
        } else if (f !== undefined) {
            return f;
        }

    }catch(e){
        // console.log(e);
    }

}


function getFunc(t: any) {
    if (typeof t === "function") { return t; }

    let f = getItem(t, ["()"]);
    if (typeof f === "function") { return f; }

    f = getItem(t, ["$$mt", ".", "__call", "()"]);
    if (typeof f === "function") { return f; }
}


/** 生成函数 */
export function makeFunc(node: FunctionDeclaration, _g: LuaScope) {

    let isRunning = false;
    let callOnce = false;
    let resValue: any;

    let types = loadTypes(node, _g);  // 通过注释加载类型
    let returnType = types && types["return"];  // 返回值类型

    const myFunc = function (...params: any) {

        let myfunc : any = myFunc;
        let $$req  : any = myfunc["$$req"];  // 请求参数类型
        let $$res  : any = myfunc["$$res"];  // 返回值类型 v21.11.25
        let $$self : any = myfunc["$$self"]; // self:func()

        if (isRunning) {
            // console.log("函数递归回调");
            resValue = returnType && loadType(returnType, _g) || resValue;
            return resValue;

        } else if (callOnce && !$$self) {
            // console.log("只执行一次");
            return resValue;
        }

        // 没有参数：只执行一次
        let args = node.parameters;
        callOnce = (args.length === 0);

        let newG = newScope(_g);

        if (isObject($$self)) {
            setValue(newG, "self", $$self, true);

            // 去掉第一个参数 self 或者 _
            if (args.length > 0 && args[0].type === "Identifier" && (args[0].name === "self" || args[0].name === "_")) {
                args = [ ... args ];
                args.shift();
            }
        }

        // 初始化返回值数组
        setValue(newG, "$$return", [], true);

        // 初始化返回值类型
        setValue(newG, "$type_return", $$res, true);

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

            if ( name === "..." ) {
                value = params.slice(i);

            } else if ( i === 0 && $$req) {
                value = $$req;                          // 生成请求参数类型

            } else if (types && types[name]) {
                value = loadType(types[name], newG);    // 通过类型名称取得类型

            } else if ( name === "self" && self && value === undefined) {
                value = self;                           // 构造器 @@ <Constructor>
            }

            setValue(newG, name, value, true, p.loc);
        });

        // 编辑模式下，或者未指定返回类型，则需要运行代码
        let needToRun = getValue(newG, "$$node") || (!$$res && !returnType);

        // apicheck 成员字段检查需运行代码
        if (getValue(newG, "$$lints")) {needToRun = true;}

        if (needToRun) {
            isRunning = true;  // 避免递归回调：造成死循环
            resValue = loadBody(node.body, newG, node.loc);
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
        setValue(_g, "@@", myFunc, true);
    }

    // 参数类型定义
    myFunc.$argTypes = new Proxy({}, {
        get(target, prop) {
            let i = Number(prop) as number;
            let p = node.parameters[i];
            if (p?.type === "Identifier") {
                let typeName = types && types[p.name];
                if (typeName) {
                    return loadType(typeName, _g);
                }
            }
        }
    });

    return myFunc;

}

function getValueX(name: string, _g: LuaScope) {
    name = name.replace(/\s/g, "");
    let K = name.includes(".") ? name.split(".") : [ name ];
    let T = getValue(_g, K[0].trim());
    for (let i=1; i<K.length; i++) {
        T = getItem(T, [".", K[i].trim()]);
    }
    return T;
}

function getReqOfFunc(name: string, _g: LuaScope) {
    let t = getValueX(name, _g);
    if (isObject(t) && t.$$req) {
        return t.$$req;
    }
    let f = getFunc(t);
    return f && f.$argTypes && f.$argTypes[0];
}

function getResOfFunc(name: string, _g: LuaScope) {
    let t = getValueX(name, _g);
    if (isObject(t) && t.$$res) {
        return t.$$res;
    }
    let v = callFunc(t);
    return isArray(v) ? v[0] : v;
}

// 两边括号
const PairMap : { [key: string]: string} = {
    "(" : ")",
    "{" : "}",
};

// 预解析: (小括号) {花括号}
function parseTypes(name: string, _map: Map<string, string>) {

    if (!name.includes("(") && !name.includes("{")) {
        return name;
    }

    let temp = [] as string[];
    let pref = "", subf = "";
    let step = 0 , pos  = 0;

    for (let i=0; i<name.length; i++) {
        let char = name[i];

        if (pref && subf) {
            if (pref === char) {            // 左边括号 ( {
                step++;
            } else if (subf === char) {     // 右边括号 ) }
                step--;
            }

            if (step === 0) {
                let find = name.substring(pos+1, i);    // 不含两边括号
                let text = parseTypes(find, _map);
                let key = "#T" + _map.size;

                _map.set(key, pref + text + subf);      // 包含两边括号
                temp.push(key);                         // 不含两边括号

                pref = "";
                subf = "";
            }

        } else if (char in PairMap) {
            pref = char;
            subf = PairMap[char];
            step = 1;
            pos  = i;

        } else {
            temp.push(char);
        }

    }

    return temp.join("");

}


/** 通过类型名称取得类型 */
export function loadType(name: string, _g: LuaScope, _loc?: Node["loc"], _map?: Map<string, string>): any {

    if (typeof name !== "string") { return; }

    let pos = name.indexOf("//");
    if (pos !== -1) {
        name = name.substring(0, pos);  // 去掉注释
    }

    name = name.trim();
    if (!name) { return; }

    if (!_map) {
        _map = new Map<string, string>();
        name = parseTypes(name, _map);
    }

    name = _map.get(name) || name;

    // map<T> 或 arr<T>
    let m = name.match(/^(map|arr)\s*<\s*(.+)\s*>$/);
    if (m) {
        let T = loadType(m[2], _g, _loc, _map);
        return m[1] === "map"
            && mapType(name, T)   // map<T>
            || arrType(name, T);  // arr<T>
    }

    // req<T> 或 res<T>
    m = name.match(/^(req|res)\s*<\s*(.+)\s*>$/);
    if (m) {
        let T = m[1] === "req" ? getReqOfFunc(m[2], _g) : getResOfFunc(m[2], _g);
        return newType(name, T);
    }

    // T[] 或 T[K]
    m = name.match(/^(.+)\[(.*)\]$/);
    if (m) {
        let T = loadType(m[1], _g, _loc, _map);
        let K = m[2].replace(/["']/g, "").trim();
        if (K) { // T[K]
            T = getItem(T, [".", K]) || getItem(T, [".", "*"]) || getItem(T, ["[]"]);
            return newType(name, T);
        } else {
            return arrType(name, T); // T[]
        }
    }

    // ( T )
    m = name.match(/^\((.*)\)$/);
    if (m) {
        let T = loadType(m[1], _g, _loc, _map) || {};
        return { ...T, type: "(" + (T.type || m[2]) + ")", readonly: true, doc: ""};
    }

    // { K1, K2 : T2 }
    m = name.match(/^\{(.*)\}$/);
    if (m) {
        let T = { type: name, doc: "", ".": {} } as any;
        let names = [] as string[];
        m[1].split(",").forEach(s => {
            let [k, t] = s.split(":");
            let n = k.trim();
            k = k.replace("?", "").trim();
            t = t && t.trim() || "string";
            if (k) {
                let v = loadType(t, _g, _loc, _map) || {};
                setChild(_g, T, ".", k, v, _loc);

                if (t !== "string" && v.type) {
                    n = n + ": " + v.type;
                }
                names.push(n);
            }
        });
        T.readonly = true;
        T.type = "{ " + names.join(", ") + " }";
        return T;
    }

    // T1 | T2 | T3
    if (name.includes("|")) {
        let T = { type: name, readonly: true, doc: "", ".": {} } as any;
        let Ti = {} as any;

        let names = name.split("|")
            .map( n => n.trim() )
            .filter( n => !!n );

        names.forEach((n, i) => {
            let t: any = loadType(n, _g, _loc, _map);
            let ti = t && t["."] || {};
            if (i === 0) {
                Ti = { ...ti };
            } else {
                for (let k in Ti) {
                    !(k in ti) && delete Ti[k];  // 取交集
                }
            }
            names[i] = t?.type || n;
        });

        T["."] = Ti;
        T.type = names.join(" | ");
        return T;
    }

    // T1 & T2 & T3
    if (name.includes("&")) {
        let T = { type: name, readonly: true, doc: "", ".": {} } as any;

        let names = name.split("&")
            .map( n => n.trim() )
            .filter( n => !!n );

        names.forEach((n, i) => {
            let t: any = loadType(n, _g, _loc, _map);
            if (isObject(t)) {
                T = { ...t, ...T, ".": { ...t["."], ...T["."] }};  // 取并集
            }
            names[i] = t?.type || n;
        });

        T.type = names.join(" & ").replace(/\s*\}\s*&\s*\{\s*/g, ", ");
        return T;
    }

    // T.K
    if (name.includes(".")) {
        let K = name.split(".");
        let T = loadType(K[0].trim(), _g, _loc, _map);
        for (let i=1; i<K.length; i++) {
            T = getItem(T, [".", K[i].trim()]);
        }
        return newType(name, T);
    }

    // @T
    let namex = name.replace("@", "").trim();
    let T = getType(namex, false, _g) || getValue(_g, namex);
    return newType(name, T);
}

function mapType(name: string, T: any) {
    T = isObject(T) ? T : { "." : {}, readonly };
    return {
        type: T.type ? `map<${ T.type }>` : name,
        readonly: true,
        doc: "",
        ".": {
            "*": T
        },
        "[]": T,
    };
}

function arrType(name: string, T: any) {
    T = isObject(T) ? T : { "." : {}, readonly };
    return {
        type: T.type ? `${ T.type }[]` : name,
        readonly: true,
        doc: "",
        "[]": T,
    };
}

function newType(name: string, T: any) {
    T = isObject(T) ? T : {};
    return T.basic | T.readonly ? T : {
        ... T,
        "." : { ...T["."] },
        type: name,
        readonly: (name !== "table" && name !== "object"),
        doc: "",
    };
}

function getType(typeName: string, isArr: boolean, _g: LuaScope) {

    let pos = typeName.indexOf("//");
    if (pos !== -1) {
        typeName = typeName.substring(0, pos);  // 去掉注释
    }

    typeName = typeName.trim();

    let t = getLuaType(typeName, isArr);
    if (t) { return t; }

    if (typeName.startsWith("$")) {
        // 加载 dao 类型
        let _load = getValue(_g, "_load");
        if (_load) {
            let mod: LuaModule = callFunc(_load, typeName);
            if (mod instanceof Object && mod["$dao"]) {
                let daoType = mod["$dao"];
                let daoRow = daoType["row"];
                let doc = "## "+ typeName +"\ndao 类型单行数据\n" + daoType.doc;
                let t = { type: typeName, doc, ".": daoRow, readonly };
                if (isArr) {
                    doc = "## "+ typeName +"[]\ndao 类型多行数据\n" + daoType.doc;
                    return { type: typeName + "[]", doc, "[]": t, readonly };  // 数组
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
                let t = { type: typeName, doc, ".": userType, readonly };  // 复制字段定义
                if (isArr) {
                    doc = "## "+ typeName +"[]\n自定义类型数组\n" + mod.doc;
                    return { type: typeName + "[]", doc, "[]": t, readonly };  // 数组
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
    if (!nloc) {return;}

    let $$comm = getValue(_g, "$$comm");
    if (!($$comm instanceof Object)) {return;}

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
