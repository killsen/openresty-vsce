
import { getBasicType, LuaAny, LuaModule, LuaObject, LuaStringOrNil, LuaTable } from './types';
import { NgxPath } from "./ngx";
import { isObject, getItem, setItem, delItem, toTable } from './utils';
import * as lua from './index';
const readonly = true;

/** 加载类型声明 */
export function loadApiTypes(ctx: NgxPath, mod: LuaModule): LuaModule | undefined {

    const API_MOD  = mod;
    const API_TABLE: any = getItem(mod, ["."]);
    const API_TYPES: any = {};  // 自定义类型
    const REQ_TYPES: any = {};  // 请求参数类型
    const RES_TYPES: any = {};  // 返回值类型

    if (!isObject(API_TABLE)) { return; }
    delItem(API_MOD, [".", "__apipath"]);

    let modName = ctx.modName || "__";
    let modFile = mod.$file || "";
        modFile = modFile.replace(".editing", "").replace(" ", "");
        modFile = "(file:"+ modFile +")";

    loadTypes(); // 加载全部类型

    // 生成请求参数、返回值类型
    Object.keys(API_TABLE).forEach(key => {
        if (!key.endsWith("__")) { return; }

        const ti = getItem(API_MOD, [".", key, "."]);
                   delItem(API_MOD, [".", key]);
        if (!isObject(ti)) { return; }

        const name = key.substring(0, key.length - 2);
        const func = getItem(API_MOD, [".", name, "()"]);
        if (typeof func !== "function") { return; }

        let desc = ti["1"], req = ti["req"], res = ti["res"];

        req  = typeof req  === "string" ? req.trim()  : toTable(req);
        res  = typeof res  === "string" ? res.trim()  : toTable(res);
        desc = typeof desc === "string" ? desc.trim() : "";

        let reqDoc = "", resDoc = "";

        // 生成请求参数类型
        if (typeof req === "string") {
            reqDoc = genApiDoc("", req);
            req = genRefType(name, req);
        } else if (isObject(req)) {
            req = genType(req, "req<" + modName + "." + name + ">");
            reqDoc = req?.doc || "";
        }

        // 生成返回值类型
        if (typeof res === "string") {
            resDoc = genApiDoc("", res);
            res = genRefType(name, res);
        } else if (isObject(res)) {
            res = genType(res, "res<" + modName + "." + name + ">");
            resDoc = res?.doc || "";
        }

        const apiDocs = [] as string[];
        apiDocs.push("### [" + modName + "]" + modFile + "." + name);
        apiDocs.push(desc);
        reqDoc && apiDocs.push("", "请求参数：", reqDoc);
        resDoc && apiDocs.push("", "返回参数：", resDoc);
        apiDocs.push("");

        const argsMin = req ? 1 : 0;

        req = REQ_TYPES[name] = req || LuaTable;
        res = RES_TYPES[name] = res || LuaAny;

        // 为 apicheck 提供参数及返回值类型
        func["$$res"] = res;
        func["$$req"] = req;

        setItem(API_MOD, [".", name, "()"     ], [res, LuaStringOrNil]);    // 返回值类型
        setItem(API_MOD, [".", name, "$args"  ], [req]);                    // 请求参数类型
        setItem(API_MOD, [".", name, "argsMin"], argsMin);                  // 最少参数个数
        setItem(API_MOD, [".", name, "doc"    ], apiDocs.join("\n"));       // 文档
    });

    for (let k in API_TYPES) {
        let t = API_TYPES[k];
        API_TYPES[k] = t?.$typed || t;
    }

    for (let k in REQ_TYPES) {
        let t = REQ_TYPES[k];
        REQ_TYPES[k] = t?.$typed || t;
    }

    for (let k in RES_TYPES) {
        let t = RES_TYPES[k];
        RES_TYPES[k] = t?.$typed || t;
    }

    setItem(API_MOD, [".", "$types"], API_TYPES);

    API_MOD["$types"] = API_TYPES;  // 自定义类型
    API_MOD["$req"  ] = REQ_TYPES;  // 请求参数类型
    API_MOD["$res"  ] = RES_TYPES;  // 返回值类型

    return API_MOD;

    // 加载自定义全部类型
    function loadTypes() {

        let types = getItem(API_MOD, [".", "types", "."]);
        isObject(types) && Object.keys(types).forEach( k => {
            if (k.startsWith("$")) { return; }

            let obj = toTable(types[k]);
            if (!isObject(obj)) { return; }

            API_TYPES["$" + k + "$"] = types["$" + k + "$"];
            API_TYPES[k] = genTypeProxy(obj, k);
        });

        let ti = getItem(API_MOD, ["."]);
        isObject(ti) && Object.keys(ti).forEach( key => {
            if (!key.endsWith("__")) { return; }

            let $types = getItem(API_MOD, [".", key, ".", "$types"]);
            if (isObject($types)) {
                Object.keys($types).forEach(k => {
                    API_TYPES[k] = $types[k];   // 直接引用外部类型定义 v22.04.07
                });
                return;
            }

            let types = getItem(API_MOD, [".", key, ".", "types", "."]);
            isObject(types) && Object.keys(types).forEach( k => {
                if (k.startsWith("$")) { return; }

                let obj = toTable(types[k]);
                if (!isObject(obj)) { return; }

                API_TYPES["$" + k + "$"] = types["$" + k + "$"];
                API_TYPES[k] = genTypeProxy(obj, k);
            });

        });

    }

    // 生成自定义类型属性
    function genType(t: any, typeName?: string) {

        let obj: any = {};

        if (!isObject(t)) {return obj;}

        let docs : string[] = [];

        typeName = typeName || "";
        if (typeName && !typeName.startsWith("req<") && !typeName.startsWith("res<")) {
            docs.push(
                "### [" + modName + "]" + modFile
                + "." + typeName.replace(modName + ".", "")
                + "\n\n"
            );
        }

        const $required = [] as string[];

        Object.keys(t).forEach(k=>{

            if (k.startsWith("$")) {
                obj[k] = t[k];  // 变量定义的位置信息
                return;
            }

            let isRequired = true;

            if (k.includes("?")) {
                k = k.replace("?", "");
                isRequired = false;
            }

            let v = t[k];

            if (typeof v === "string" && v.includes("?")) {
                v = v.replace("?", "");
                isRequired = false;
            }

            // "MenuInfo  //继承",
            // { "MenuID", "菜品编码", "string" },
            // { name = "MenuID", desc = "菜品编码", type = "string" },
            // MenuID = "string //菜品编码",
            // MenuUnit = { MenuUnitID = "规格编码", MenuUnitName = "规格名称" }

            if (/^\d+$/.test(k)) {
                if (typeof v === "string") {

                    v = v.split("//")[0].trim();
                    if (!v) {return;}

                    let p = genRefType("", v, typeName);  // 数字做序表示继承
                    let pt = p && p["."];

                    if (isObject(pt)) {
                        Object.keys(pt).forEach(pk => {
                            obj[pk] = pt[pk];
                        });
                        docs.push("* 继承属性：`<" + v + ">`");
                    }
                    return;

                } else if (isObject(v)) {
                    let name = v["name"] || v[1];
                    let desc = v["desc"] || v[2] || "";
                    let type = v["type"] || v[3] || "string";

                    if (typeof name === "string" && name.includes("?")) {
                        name = name.replace("?", "");
                        isRequired = false;
                    }
                    if (typeof type === "string" && type.includes("?")) {
                        type = type.replace("?", "");
                        isRequired = false;
                    }

                    if (typeof name === "string") {
                        if (typeof type === "string") {
                            if (desc && typeof desc === "string") {type += "//" + desc;}
                            docs.push(genApiDoc(name, type));
                            obj[name] = genRefType(name, type, typeName);
                        } else if (isObject(type)) {
                            obj[name] = genType(type, typeName);
                        } else {
                            return;
                        }

                        if (isRequired && !$required.includes(name)) {
                            $required.push(name);
                        }

                        // 变量定义的位置信息
                        obj["$" + name + "$"] = t["$" + k + "$"];
                    }

                }

            } else {

                let name = k;
                let type = typeof v === "number"  && "number"  ||
                           typeof v === "boolean" && "boolean" ||
                           v;

                if (typeof type === "string") {

                    obj[name] = genRefType(name, type);
                    docs.push(genApiDoc(name, type));

                } else if (isObject(type)) {

                    obj[name] = genType(type, typeName + "." + name);

                    let typeDesc = type["1"];
                    if (typeof typeDesc === "string" && typeDesc.trim().startsWith("//")) {
                        typeDesc = "object " + typeDesc;
                    } else {
                        typeDesc = "object //扩展属性";
                    }

                    docs.push(genApiDoc(name, typeDesc));

                } else {
                    return;
                }

                if (isRequired && !$required.includes(name)) {
                    $required.push(name);
                }

            }

        });

        const type = typeName || "table";
        const doc  = docs.join("\n");

        return { ".": obj, type, doc, readonly, $required };

    }

    // 生成自定义类型代理
    function genTypeProxy(t: any, typeName: string) {

        if (!isObject(t)) {return {};}

        let mod: any;
        let loaded  = false;
        let loading = false;

        function getMod() {
            if (mod) {return mod;}

            // 避免自己继承自己或者相互继承死循环的问题
            if (loading) {return {};}

            loading = true;
            mod = genType(t, typeName) || {};
            loading = false;

            loaded  = true;
            return mod;
        }

        // 属性代理：只读
        return new Proxy({}, {
            // 读
            get(target, prop) {
                let m = getMod();
                if (prop === "$typed") {return m;}
                if (prop === "loaded") {return loaded;}
                return m[prop];
            },
            // 写
            set(target, prop, value) {
                let m = getMod();
                m[prop] = value;
                return true;  // 返回 true 避免修改属性时抛出错误
            },
            ownKeys(target) {
                let m = getMod();
                return Object.keys(m);
            },
            getOwnPropertyDescriptor(k) {
                return {
                    enumerable  : k !== "loaded",
                    configurable: k !== "loaded",
                };
            }
        });

    }

    // 生成引用类型
    function genRefType(key: string, name: string, typeName: string = "") {

        let desc = "";

        if (name.indexOf("//") !== -1) {
            let arr = name.split("//");
            name = arr[0].trim();
            desc = arr[1].trim() + "\n\n";
        }

        // 自定义类型命名: 兼容处理
        name = name.replace(/[@?\r\n\s]/g, "") || "string";

        // 是否数组
        let isArr = name.indexOf("[]") !== -1;
        if (isArr) {
            name = name.replace("[]", "");
        }

        let vt;
        let loaded = true;

        if (name.startsWith("$")) {
            let dao = lua.load(ctx, name) as any;
            vt = dao && dao["$row"] || {};
        } else if (API_TYPES[name]) {
            vt = API_TYPES[name] || {};
            loaded = vt.loaded !== false;
        } else {
            vt = getBasicType(name) || {};
        }

        return isArr  ? { "[]": vt, readonly, type: name + "[]", doc: desc } :
               loaded ? { ...vt, readonly, type: name, doc: desc } : vt;

    }

}

// 生成 api 文档
function genApiDoc(name: string, typeDesc: string, level: number = 0) {

    let arr = typeDesc.split("//");
    let type = arr[0].trim();
    let desc = (arr[1] || "").trim();
        desc = desc.split(/[:：]/)[0].trim();

    // 自定义类型命名: 兼容处理
    type = type.replace("@", "");

    let span = "  ".repeat(level);

    if (name === "") {
        return "#### `<" + type + ">`";

    } else if  (/^\d+$/.test(name))  {
        return span + "* 继承属性：`<" + type + ">`";

    } else {
        if (!type || type === "string") {
            type = "";
        } else {
            type = " `<" + type + ">`";
        }
        if (desc) {
            return span + "* " + desc + "：" + name + type;
        } else {
            return span + "* " + name + type;
        }
    }

}
