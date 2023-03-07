import { Comment, Node } from "luaparse";
import { Diagnostic, Position, Range } from "vscode";
import { callFunc } from "./modFunc";
import { loadNode } from "./parser";
import { getValue, LuaScope, setChild } from "./scope";
import { getBasicType, getLuaTypeName, isBasicType, isSameType, LuaAny, LuaBoolean, LuaModule, LuaNever, LuaNumber, LuaString, LuaObject, LuaType } from "./types";
import { getItem, isArray, isObject } from "./utils";

const readonly = true;
const doc = "";

function getValueX(name: string, _g: LuaScope) {
    let keys = [] as string[];
    name = name.replace(/\s/g, "");
    name.split(".").forEach((s, i) => {
        i > 0 && keys.push(".");
        if (s.includes(":")) {
            let a = s.split(":");
            keys.push(a[0], ":", a[1]);
        } else {
            keys.push(s);
        }
    });

    let key = keys.shift();
    if (key) {
        let T = getValue(_g, key);
        if (keys.length > 0) {
            T = getItem(T, keys);
        }
        return T;
    }
}

function getReqOfFunc(name: string, _g: LuaScope, index: string) {
    let i = Number(index) || 0;
    if (i > 0) { i--; }
    const funt = getValueX(name, _g);
    return get_arg_vtype(funt, i, [], _g);
}

function getResOfFunc(name: string, _g: LuaScope, index: string) {
    let i = Number(index) || 0;
    if (i > 0) { i--; }
    const funt = getValueX(name, _g);
    const resx = callFunc(funt);
    if (isArray(resx)) {
        return resx[i];
    } else if (i === 0) {
        return resx;
    }
}

// 两边括号
const PairMap : { [key: string]: string} = {
    "(" : ")",
    "{" : "}",
    "<" : ">",
};

// 预解析: (小括号) {花括号}
export function parseTypes(name: string, _map: Map<string, string>) {

    name = name.trim();

    if (!name.includes("(") && !name.includes("{") && !name.includes("<")) {
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
                let str = name.substring(pos+1, i).trim();  // 不含两边括号
                let val = parseTypes(str, _map).trim();
                let key = "#T" + _map.size;

                if (pref === "<") {
                    if (!val.includes("&") && !val.includes("|")) {
                        temp.push(pref + val + subf);
                    } else {
                        _map.set(key, val);                 // 不含两边括号   #Tn : ...
                        temp.push(pref + key + subf);       // 包含两边括号  <#Tn>
                    }

                } else {
                    _map.set(key, pref + val + subf);       // 包含两边括号   #Tn : {...} 或 (...)
                    temp.push(key);                         // 不含两边括号   #Tn
                }

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

    return temp.join("").trim();

}


/** 获取参数类型或者返回值类型 */
export function loadReturnTypes(args: string, _g: LuaScope, loc?: Node["loc"], isRes = true): LuaType[] {

    let pos = args.indexOf("//");
    if (pos !== -1) {
        args = args.substring(0, pos);  // 去掉注释
    }

    // 去除空格及左右两边的小括号()
    args = args.replace(/\s/g, "");
    if (!isRes && args.startsWith("(") && args.endsWith(")")) {
        args = args.substring(1, args.length-1);
    }
    if (!args || args === "void") { return []; }

    const _map = new Map<string, string>();
    args = parseTypes(args, _map);

    return args.split(",").map(arg => {
        let type = "";

        let vt = getBasicType(arg) ||
                 getBasicType(arg.replace("?", ""));
        if (vt) {return vt;}

        if (arg === "...") {
            type = "...";
        } else if (arg.includes(":")) {
            let idx = arg.indexOf(":");
            type = arg.substring(idx+1, arg.length);
        } else if (arg.includes("=")) {
            let arr = arg.split("=");
            type = arr[1].replace("?", "");
        } else if (isRes) {
            type = arg;  // 返回值类型
        }

        if (type === "true" || type === "false") {
            type = "boolean";
        } else if (type && !isNaN(Number(type))) {
            type = "number";
        }

        if (!type) { return LuaAny; }

        vt = getBasicType(type) || _g[type];
        if (vt) { return vt; }

        vt = loadType(type, _g, loc, _map);
        return vt || LuaAny;

    });
}

/** 通过类型名称取得类型 */
export function loadType(name: string, _g: LuaScope, _loc?: Node["loc"], _map?: Map<string, string>): LuaType {

    if (typeof name !== "string") { return LuaNever; }

    let pos = name.indexOf("//");
    if (pos !== -1) {
        name = name.substring(0, pos);  // 去掉注释
    }

    // 基本类型
    let T = getBasicType(name);
    if (T) {return T;}

    if (!_map) {
        _map = new Map<string, string>();
        name = parseTypes(name, _map);
    }

    name = _map.get(name) || name;
    name = name.trim();
    if (!name) { return LuaNever; }

    // 基本类型
    T = getBasicType(name);
    if (T) {return T;}

    // ( T )
    let m = name.match(/^\((.*)\)$/);
    if (m) {
        let T = loadType(m[1], _g, _loc, _map);
        if (!T.type.includes(" ")) {
            return T;  // 类型名称不含空格直接返回
        } else {
            return { ...T, type: `(${ T.type })` };
        }
    }

    // { K1, K2 : T2 }
    m = name.match(/^\{(.*)\}$/);
    if (m) {
        let T = { type: name, doc: "", ".": {} } as LuaType;
        let names = [] as string[];
        m[1].split(",").forEach(s => {
            let [k, t] = s.split(":");
            let n = k.trim();
            k = k.replace("?", "").trim();
            t = t ? t.trim() : "string";
            if (k) {
                let v = loadType(t, _g, _loc, _map);
                setChild(_g, T, ".", k, v, _loc);
                n = n + ": " + (v.type || t);
                names.push(n);
            }
        });
        T.readonly = true;
        T.type = "{ " + names.join(", ") + " }";
        return T;
    }

    // T1 | T2 | T3
    if (name.includes("|")) {
        let names = name.split("|").map( n => n.trim() ).filter( n => !!n );
        let types = names.map( n => loadType(n, _g, _loc, _map) );
        return unionTypes(types);
    }

    // T1 & T2 & T3
    if (name.includes("&")) {
        let names = name.split("&").map( n => n.trim() ).filter( n => !!n );
        let types = names.map( n => loadType(n, _g, _loc, _map) );
        return mergeTypes(types);
    }

    // map<T> 或 arr<T>
    m = name.match(/^(map|arr)\s*<\s*(.+)\s*>$/);
    if (m) {
        let T = loadType(m[2], _g, _loc, _map);
        return m[1] === "map"
            && mapType(name, T)   // map<T>
            || arrType(name, T);  // arr<T>
    }

    // req<T> 或 res<T>
    m = name.match(/^(req|res)(\d*)\s*<\s*(.+)\s*>$/);
    if (m) {
        let T = m[1] === "req"
            ? getReqOfFunc(m[3], _g, m[2])
            : getResOfFunc(m[3], _g, m[2]);
        return newType(name, T);
    }

    // T[] 或 T[K]
    m = name.match(/(.+)\[(.*)\]$/);
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
    let t = getBasicType(namex) || getUserType(namex, _g) || getValue(_g, namex);
    return newType(name, t);
}

// T1 | T2 | T3
export function unionTypes(vtypes: LuaType[]) : LuaType {

    if (vtypes.length === 0) { return LuaNever; }
    if (vtypes.length === 1) { return vtypes[0]; }

    let types = [] as LuaType[];
    let tBasic = new Map<string, boolean>();

    vtypes.forEach(vt => {
        if (!isObject(vt)) { return; }
        if (vt.type === "never") { return; }  // 忽略 never

        if (isArray(vt.types)) {
            vt.types?.forEach( t => {
                if (!isObject(t)) { return; }
                if (t.type === "never") { return; }  // 忽略 never

                let name = t.type || "";
                if (!types.includes(t) && !tBasic.has(name)) {
                    isBasicType(name) && tBasic.set(name, true);
                    types.push(t);
                }
            });

        } else {
            let name = vt.type || "";
            if (!types.includes(vt) && !tBasic.has(name)) {
                isBasicType(name) && tBasic.set(name, true);
                types.push(vt);
            }
        }
    });

    if (types.length === 0) { return LuaNever; }
    if (types.length === 1) {return types[0];}

    let tAny = types.find( vt => vt?.type === "any" );
    if (tAny) { return LuaAny; }

    let tInter = {} as LuaObject;   // 交集
    let tUnion = {} as LuaObject;   // 并集
    let tItems = [] as LuaType[];   // 数组
    let tNames = [] as string[];    // 名称

    types.forEach((vt, i) => {
        if (!isObject(vt)) { return; }

        let ti = vt["."] || {};

        vt.type && !tNames.includes(vt.type) && tNames.push(vt.type);
        vt["[]"] && tItems.push(vt["[]"]);

        if (i === 0) {
            tInter = { ...ti };
            tUnion = { ...ti };
        } else {
            // 并集
            tUnion = { ...ti, ...tUnion };
            for (let k in ti) {
                if (!k.startsWith("$")) {
                    let v1 = tUnion[k] as LuaType;
                    let v2 = ti[k] as LuaType;
                    if (!isSameType(v1, v2)) {  // 类型不一致
                        tUnion[k] = unionTypes([v1, v2]);
                    }
                }
            }
            // 交集
            for (let k in tInter) {
                if (!k.startsWith("$")) {
                    if (k in ti) {
                        tInter[k] = tUnion[k];
                    } else {
                        delete tInter[k];
                        delete tInter['$' + k + '$'];
                    }
                }
            }

        }
    });

    const type  = tNames.join(" | ");
    const vtype: LuaType = { type, types, readonly, doc, ".": tUnion };
    const T: LuaType   = { type, types, vtype, readonly, doc, ".": tInter };

    if (tItems.length > 0) {
        T["[]"] = vtype["[]"] = unionTypes(tItems);
    }

    return T;

}

// T1 & T2 & T3
export function mergeTypes(vtypes: LuaType[], checkUnionTypes = true) : LuaType {

    if (vtypes.length === 0) { return LuaNever; }
    if (vtypes.length === 1) { return vtypes[0]; }

    if (checkUnionTypes) {
        // 联合类型的交叉类型
        //    (string | number) & (string | boolean)
        // => (string & string) | (string & boolean) | (number & string) | (number & boolean)
        // => string | never | never | never
        // => string
        const utypes = vtypes.filter( vt => isObject(vt) && isArray(vt.types) );
        if (utypes.length > 0) {
            let arr = vtypes.filter( vt => isObject(vt) && !isArray(vt.types) );
            let vt1 = arr.length > 0 ? mergeTypes(arr) : utypes.shift()!;
            for (let vt2 of utypes) {
                let types1 = isArray(vt1.types) ? vt1.types! : [vt1];
                let types2 = isArray(vt2.types) ? vt2.types! : [vt2];
                let types3 = [] as LuaType[];
                for (let t1 of types1) {
                    for (let t2 of types2) {
                        types3.push(mergeTypes([t1, t2], false));   // 先交叉
                    }
                }
                vt1 = unionTypes(types3);  // 再联合
                if (!isObject(vt1)) { break; }
            }
            return vt1;
        }
    }

    let types  = [] as LuaType[];
    let tBasic = new Map<string, boolean>();

    vtypes.forEach(vt => {
        if (!isObject(vt)) { return; }
        if (vt.type === "any") { return; }  // 忽略 any

        let name = vt.type || "";
        if (!types.includes(vt) && !tBasic.has(name)) {
            isBasicType(name) && tBasic.set(name, true);
            types.push(vt);
        }
    });

    if (types.length === 0) { return LuaAny; }
    if (types.length === 1) {return types[0];}

    // 只要有一个 never 或者基本类型的返回 never
    let tNever = types.find( vt => vt.type === "never" || vt.basic );
    if (tNever) { return LuaNever; }

    let tUnion = {} as LuaObject;   // 并集
    let tItems = [] as any[];       // 数组
    let tNames = [] as string[];    // 名称

    types.forEach((vt, i) => {
        if (!isObject(vt)) { return; }

        let ti = vt["."] || {};

        vt.type && !tNames.includes(vt.type) && tNames.push(vt.type);
        vt["[]"] && tItems.push(vt["[]"]);

        if (i === 0) {
            tUnion = { ...ti };
        } else {
            // 并集
            tUnion = { ...ti, ...tUnion };
            for (let k in ti) {
                if (!k.startsWith("$")) {
                    let v1 = tUnion[k] as LuaType;
                    let v2 = ti[k]     as LuaType;
                    if (!isSameType(v1, v2)) {  // 类型不一致
                        tUnion[k] = mergeTypes([v1, v2]);
                    }
                }
            }
        }
    });

    const type  = tNames.join(" & ");
    const T: LuaType = { type, readonly, doc, ".": tUnion };

    if (tItems.length > 0) {
        T["[]"] = mergeTypes(tItems);
    }

    return T;

}

function mapType(name: string, T: LuaType) : LuaType {
    T = isObject(T) ? T : { "." : {}, readonly } as LuaType;
    return {
        type: T.type ? `map<${ T.type }>` : name,
        readonly: true,
        doc: "",
        ".": { "*": T }
    };
}

function arrType(name: string, T: LuaType) : LuaType {
    T = isObject(T) ? T : { "." : {}, readonly } as LuaType;
    return {
        type: T.type ? `${ T.type }[]` : name,
        readonly: true,
        doc: "",
        "[]": T,
    };
}

function newType(name: string, T: any, level = 0) : LuaType {

    if (level++ > 5) { return T; }

    if (typeof T === "string") {
        return LuaString;
    } else if (typeof T === "number") {
        return LuaNumber;
    } else if (typeof T === "boolean") {
        return LuaBoolean;

    } else if (isObject(T)) {
        if ((T.basic || T.readonly) && T.type) {
            return T;
        } else {
            let ti = T["."];
            let tNames = [] as string[];

            T = {
                ... T,
                type: T["()"] ? "function" : name,
                readonly: (name !== "table" && name !== "object"),
                doc: "",
            };

            if (isObject(ti)) {
                ti = { ...ti };
                for (let k in ti) {
                    if (!k.startsWith("$")) {
                        let t = ti[k] = newType('', ti[k], level);
                        if (t.type) {
                            tNames.push(`${ k }: ${ t.type }`);
                        }
                    }
                }
                T["."] = ti;
                T.type = "{ " + tNames.join(", ") + " }";
            }

            return T;
        }
    } else {
        return LuaNever;
    }

}

function getUserType(typeName: string, _g: LuaScope) : LuaType | undefined {

    let pos = typeName.indexOf("//");
    if (pos !== -1) {
        typeName = typeName.substring(0, pos);  // 去掉注释
    }

    typeName = typeName.trim();

    if (typeName.startsWith("$")) {
        // 加载 dao 类型
        let _load = getValue(_g, "_load");
        if (_load) {
            let t = callFunc(_load, typeName);
            t = isArray(t) ? t[0] : t;
            return t?.$row;
        }

    } else {
        // 加载自定义类型
        const $$types = getValue(_g, "$$types");
        return $$types && $$types[typeName];
    }

}

/** 通过注释加载类型 */
export function loadTypes(node: Node, _g: LuaScope) {

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

/** 通过注释加载类型 */
export function loadTypex(n: Node, _g: LuaScope) {

    const typex = {} as { [key: string]: { name: string, type: string, desc: string, loc: Node["loc"], isArg?: boolean } };

    const comments = getValue(_g, "$$comments") as Comment[];
    if (!isArray(comments)) { return typex; }

    const nloc = n.loc;
    if (!nloc) { return typex; }

    const nline1 = nloc.start.line;
    const nline2 = nloc.end.line;


    comments.forEach((c, idx) => {
        let loc = c.loc;
        if (!loc) { return; }
        let line1 = loc.start.line;
        let line2 = loc.end.line;

        // 解析多行注释
        if (line2 === nline1 - 1) {
            const docs = [] as string[];
            for (let j=idx; j>=0; j--) {
                c = comments[j];
                loc = c?.loc;
                if (!loc) { break; }
                if (line2 !== loc.end.line) { break; }
                line2 = loc.start.line - 1;
                docs.push(c.value);
            }
            typex["@@desc"] = {
                name : "",
                type : "",
                desc : docs.reverse().join("\n\n"),
                loc,
            };
            return;
        }

        if (line1 !== line2 || line1 < nline1 || line2 > nline2) {
            return;  // 单行注释且在函数体内
        }

        const text = c.raw.trim();

        // -- @@@ : %wx -- 外部构造函数
        let m = text.match(/^--\s*(?<name>@@@)\s*:\s*(?<type>\S+)\s*(--\s*(?<desc>.*))?/);
        if (m && m.groups) {
            typex[m.groups.name] = {
                name : m.groups.name,
                type : m.groups.type,
                desc : m.groups.desc || "",
                loc,
            };
            return;
        }

        // -- @@ <Constructor> -- 内部构造器
        m = text.match(/^--\s*(?<name>@@)\s*/);
        if (m && m.groups) {
            typex[m.groups.name] = {
                name : m.groups.name,
                type : "<Constructor>",
                desc : "",
                loc,
            };
            return;
        }

        // -- @req : $pos_dd_store  // 参数类型声明
        m = text.match(/^--\s*@(?<name>\w+)\s*:\s*(?<type>.+)/);
        if (m && m.groups) {
            let name = m.groups.name;
            let type = m.groups.type.trim();
            let desc = "";

            let pos = type.indexOf("//");
            if (pos !== -1) {
                desc = type.substring(pos+2).trim();
                type = type.substring(0, pos).trim();
            }

            typex[name] = { name, type, desc, loc };
            return;
        }

    });

    return typex;

}


// 类型检查
export function check_vtype(v1: any, v2: any, n: Node, _g: LuaScope) {

    if (v1 === v2) {return;}
    if (n.isLinted) {return;}

    let lints = getValue(_g, "$$lints");
    if(!lints) {return;}

    if (!isObject(v1) || (!v1.readonly && !v1.type)) { return; }
    if (v1?.type && v2?.type && v1?.type === v2?.type) {return;}

    let vt1 = getLuaTypeName(v1);
    if (vt1 === "any" || vt1 === "nil") {return;}

    let vt2 = getLuaTypeName(v2);
    if (vt2 === "any" || vt2 === "nil") {return;}

    if (vt1 === "never" || vt2 === "never") {
        addLint(n, "", _g, `不能将类型 “${ vt2 }” 分配给类型 “${ vt1 }”`);
    }

    // 检查必填字段
    if (isArray(v1.$required) && v1.$required.length > 0) {
        let keys = v1.$required as string[];
        let ti = getItem(v2, ["."]);
        if (keys.length > 0 && isObject(ti) && !("*" in ti)) {
            keys = keys.filter(k => !(k in ti));
            if (keys.length > 0) {
                addLint(n, "", _g, `缺少类型 “${ v1.type }” 中的以下属性: ${ keys.join(", ") }`);
                return;
            }
        }
    }

    // if (vt1 === vt2) {return;}

    let at1 : string[] = isArray(v1?.types) ? v1.types.map(getLuaTypeName) : [vt1];
    let at2 : string[] = isArray(v2?.types) ? v2.types.map(getLuaTypeName) : [vt2];

    if (at1.some(t => t === "any" || at2.includes(t) )) {
        return;
    }

    if (at2.some(t => t === "any" )) {
        return;
    }

    vt1 = v1?.type || vt1; //at1.join(" | ");
    vt2 = v2?.type || vt2; //at2.join(" | ");

    addLint(n, "", _g, `不能将类型 “${ vt2 }” 分配给类型 “${ vt1 }”`);

}


// 为 apicheck 提供成员字段检查
export function addLint(n: Node, k: string, _g: LuaScope, message?: string) {

    if (k.startsWith("_")) {return;}

    let lints = getValue(_g, "$$lints") as Diagnostic[];
    if(!lints) {return;}

    if (n.isLinted) {return;}
        n.isLinted = true;

    let start = n.loc!.start;
    let end   = n.loc!.end;

    message = message || `成员字段 “${ k }” 不存在或属性未定义`;

    lints.push({
        range: new Range(
            new Position(start.line-1, start.column),
            new Position(end.line-1, end.column)
        ),
        message,
        severity: 1,
    });

}

type CommentMap = { [key: number] : { name: string, loc: Node["loc"]  } };

// 取得行内类型声明
export function get_vtype_inline(n: Node, _g: LuaScope): any {

    let comments = getValue(_g, "$$comments") as Comment[];
    if (!comments) {return;}

    let map = (comments as any)["$$map"] as CommentMap;
    if (!map) {
        map = (comments as any)["$$map"] = {};
        comments.forEach(c => {
            let line = c.loc!.start.line;
            let name = c.raw;
            if (name.startsWith("-->")) {
                map[line] = {
                    name : name.substring(3).trim(),
                    loc  : c.loc
                };
            }
        });
    }

    let c = map[n.loc!.start.line];
    if (!c) {return;}

    return loadType(c.name, _g, c.loc);

}

// 获取参数类型
export function get_node_vtype(n: Node, _g: LuaScope) {

    let vtype : any;

    if (n.type === "Identifier") {
        vtype = getValue(_g, n.name);

    } else if (n.type === "MemberExpression") {
        let t = loadNode(n.base, _g);
        if (isArray(t)) { t = t[0]; }
        if (!isObject(t) || t["type"] === "any") { return; }

        let ti = t["."] || {};
        let k = n.identifier.name;

        if (k in ti) {
            vtype = ti[k];
        } else if ("*" in ti) {
            vtype = ti["*"];
        } else if (t.readonly) {
            addLint(n.identifier, k, _g);
        }

    } else if (n.type === "IndexExpression") {
        let t = loadNode(n.base, _g);
        if (isArray(t)) { t = t[0]; }
        if (!isObject(t) || t["type"] === "any") { return; }

        let k = loadNode(n.index, _g);
        let vt = getLuaTypeName(k);

        if (typeof k === "number") {
            vtype = getItem(t, [".", String(k)]) || getItem(t, ["[]"]) || getItem(t, [".", "*"]);
        } else if (typeof k === "string") {
            vtype = getItem(t, [".", k]) || getItem(t, [".", "*"]);
        } else if (vt === "number") {
            vtype = getItem(t, ["[]"]) || getItem(t, [".", "*"]);
        } else if (vt === "string") {
            vtype = getItem(t, [".", "*"]);
        }

    } else {
        let t = loadNode(n, _g);
        if (isArray(t)) { t = t[0]; }
        vtype = t;
    }

    // 只读的自定义类型
    if (isObject(vtype) && vtype.readonly && vtype["type"] !== "any") {
        return vtype?.vtype ? vtype?.vtype : vtype;
    }

}

// 设置形参类型
export function set_arg_vtype(funt: any, arg: Node, _g: LuaScope, args: Node[] = [], i = 0) {

    if (typeof funt !== "object") { return; }

    const isTable = arg.type === "TableConstructorExpression";

    let vt = get_arg_vtype(funt, i, args, _g);
    arg.vtype = isTable && vt?.vtype ? vt?.vtype : vt;

}

// 获取形参类型
export function get_arg_vtype(funt: any, i = 0, args: Node[] = [], _g: LuaScope) : any {

    if (typeof funt !== "object") {return;}

    const func  = funt["()"];
    const $args = func?.$args || funt.$args;

    if (typeof $args === "function") {
        return $args(i, args, _g);
    } else if (typeof $args === "object") {
        let vt = $args[i];
        if (vt && vt.type !== "...") { return vt; }

        let size = $args.length;
        if (typeof size === "number") {
            vt = $args[size - 1];
            if (vt && vt.type === "...") {
                vt = $args[size - 2];
                if (vt && vt.type !== "...") { return vt; }
            }
        }
    }

    if (!func) {
        // 元表 __call 方法
        const _call = getItem(funt, ["$$mt", ".", "__call"]);
        if (_call) {
            //参数向后位移一位哦！！
            return get_arg_vtype(_call, i+1, args, _g);
        }
    }

}
