"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApiTypes = void 0;
const utils_1 = require("./utils");
const lua = require("./index");
function loadApiTypes(path, mod) {
    const API_MOD = mod;
    const API_PATH = path;
    const API_TABLE = utils_1.toTable(mod);
    const API_TYPES = {}; // 自定义类型
    const REQ_TYPES = {}; // 请求参数类型
    const RES_TYPES = {}; // 返回值类型
    if (!API_TABLE) {
        return;
    }
    let modName = path.modName || "__";
    let modFile = mod.$file || "";
    modFile = modFile.replace(".editing", "");
    modFile = "(file:" + modFile + ")";
    let modDocs = [];
    if (mod.doc)
        modDocs.push(mod.doc);
    loadTypes(); // 加载全部类型
    // 生成请求参数、返回值类型
    Object.keys(API_TABLE).forEach(k => {
        if (typeof k === "string" && k.endsWith("__")) {
            if (k.startsWith("__")) {
                // 不处理外部类型引用
                // delItem(API_MOD, [".", k]);
                return;
            }
            let name = k.substr(0, k.length - 2);
            let desc = utils_1.getItem(API_TABLE, [k, "1"]) || "";
            modDocs.push("* " + name + " ( " + desc + " ) ");
            let apiDocs = [];
            let title = "### [" + modName + "]" + modFile + "." + name;
            apiDocs.push(title);
            apiDocs.push(desc);
            apiDocs.push("");
            // 生成请求参数类型
            let req = utils_1.getItem(API_TABLE, [k, "req"]);
            apiDocs.push("#### 请求参数：");
            if (typeof req === "string") {
                let doc = genApiDoc("", req);
                doc && apiDocs.push(doc);
                req = genRefType(name, req) || req;
            }
            else if (utils_1.isObject(req)) {
                req = genType(req);
                let doc = req.doc;
                doc && apiDocs.push(doc);
            }
            apiDocs.push("");
            // 生成返回值类型
            let res = utils_1.getItem(API_TABLE, [k, "res"]);
            apiDocs.push("#### 返回参数：");
            if (typeof res === "string") {
                let doc = genApiDoc("", res);
                doc && apiDocs.push(doc);
                res = genRefType(name, res) || res;
            }
            else if (utils_1.isObject(res)) {
                res = genType(res);
                let doc = res.doc;
                doc && apiDocs.push(doc);
            }
            apiDocs.push("");
            let doc = apiDocs.join("\n");
            if (utils_1.isObject(req)) {
                let doc = title + "\n#### 请求参数：\n" + req["doc"];
                req = Object.assign(Object.assign({}, req), { doc }); // 克隆: 避免覆盖原类型的 doc
            }
            if (utils_1.isObject(res)) {
                let doc = title + "\n#### 返回参数：\n" + res["doc"];
                res = Object.assign(Object.assign({}, res), { doc }); // 克隆: 避免覆盖原类型的 doc
            }
            if (!req && !res)
                return;
            REQ_TYPES[name] = req;
            RES_TYPES[name] = res;
            utils_1.delItem(API_MOD, [".", k]);
            utils_1.setItem(API_MOD, [".", name, "()"], [res]);
            utils_1.setItem(API_MOD, [".", name, "doc"], doc);
            utils_1.setItem(API_MOD, [".", name, "$res"], res);
            utils_1.setItem(API_MOD, [".", name, "$req"], req);
        }
    });
    utils_1.setItem(API_MOD, [".", "$types"], API_TYPES);
    API_MOD["$types"] = API_TYPES; // 自定义类型
    API_MOD["$req"] = REQ_TYPES; // 请求参数类型
    API_MOD["$res"] = RES_TYPES; // 返回值类型
    API_MOD.doc = modDocs.join("\n");
    return API_MOD;
    // 加载自定义全部类型
    function loadTypes() {
        let types = utils_1.getItem(API_TABLE, ["types"]);
        if (utils_1.isObject(types)) {
            let keys = Object.keys(types).filter(key => !key.startsWith("$"));
            keys.forEach(k => {
                API_TYPES["$" + k + "$"] = types["$" + k + "$"];
                API_TYPES[k] = genTypeProxy(types[k], k);
            });
        }
        Object.keys(API_TABLE).forEach(k => {
            if (typeof k === "string" && k.endsWith("__")) {
                let $types = utils_1.getItem(API_TABLE, [k, "$types"]);
                let types = utils_1.getItem(API_TABLE, [k, "types"]);
                if (utils_1.isObject($types)) {
                    let keys = Object.keys($types);
                    keys.forEach(k => {
                        API_TYPES[k] = $types[k]; // 直接引用外部类型定义 v22.04.07
                    });
                }
                else if (utils_1.isObject(types)) {
                    let keys = Object.keys(types).filter(key => !key.startsWith("$"));
                    keys.forEach(k => {
                        API_TYPES["$" + k + "$"] = types["$" + k + "$"];
                        API_TYPES[k] = genTypeProxy(types[k], k);
                    });
                }
            }
        });
    }
    // 生成自定义类型属性
    function genType(t, typeName) {
        let obj = {};
        if (!utils_1.isObject(t))
            return obj;
        let doc = [];
        typeName = typeName || "";
        typeName && doc.push("### [" + modName + "]" + modFile
            + "." + typeName
            + "\n\n");
        Object.keys(t).forEach(k => {
            if (k.startsWith("$")) {
                obj[k] = t[k]; // 变量定义的位置信息
                return;
            }
            k = k.replace("?", "");
            let v = t[k];
            // "MenuInfo  //继承",
            // { "MenuID", "菜品编码", "string" },
            // { name = "MenuID", desc = "菜品编码", type = "string" },
            // MenuID = "string //菜品编码",
            // MenuUnit = { MenuUnitID = "规格编码", MenuUnitName = "规格名称" }
            if (/^\d+$/.test(k)) {
                if (typeof v === "string") {
                    v = v.split("//")[0].trim();
                    if (!v)
                        return;
                    let p = genRefType("", v, typeName); // 数字做序表示继承
                    let pt = p && p["."];
                    if (utils_1.isObject(pt)) {
                        Object.keys(pt).forEach(pk => {
                            obj[pk] = pt[pk];
                        });
                        doc.push("* 继承属性：`<" + v + ">`");
                    }
                    return;
                }
                else if (utils_1.isObject(v)) {
                    let name = v["name"] || v[1];
                    let desc = v["desc"] || v[2] || "";
                    let type = v["type"] || v[3] || "string";
                    if (typeof name === "string") {
                        name = name.replace("?", "");
                        if (typeof type === "string") {
                            if (desc && typeof desc === "string")
                                type += "//" + desc;
                            doc.push(genApiDoc(name, type));
                            obj[name] = genRefType(name, type, typeName);
                        }
                        else if (utils_1.isObject(type)) {
                            obj[name] = genType(type, typeName);
                        }
                        else {
                            return;
                        }
                        // 变量定义的位置信息
                        obj["$" + name + "$"] = t["$" + k + "$"];
                    }
                }
            }
            else {
                let name = k;
                let type = typeof v === "number" && "number" ||
                    typeof v === "boolean" && "boolean" ||
                    v;
                if (typeof type === "string") {
                    obj[name] = genRefType(name, type);
                    doc.push(genApiDoc(name, type));
                }
                else if (utils_1.isObject(type)) {
                    obj[name] = genType(type, typeName + "." + name);
                    let typeDesc = type["1"];
                    if (typeof typeDesc === "string" && typeDesc.trim().startsWith("//")) {
                        typeDesc = "object " + typeDesc;
                    }
                    else {
                        typeDesc = "object //扩展属性";
                    }
                    doc.push(genApiDoc(name, typeDesc));
                }
                else {
                    return;
                }
            }
        });
        return { ".": obj, doc: doc.join("\n") };
    }
    // 生成自定义类型代理
    function genTypeProxy(t, typeName) {
        if (!utils_1.isObject(t))
            return {};
        let mod;
        let loaded = false;
        let loading = false;
        function getMod() {
            if (mod)
                return mod;
            // 避免自己继承自己或者相互继承死循环的问题
            if (loading)
                return {};
            loading = true;
            mod = genType(t, typeName) || {};
            loading = false;
            loaded = true;
            return mod;
        }
        // 属性代理：只读
        return new Proxy({}, {
            // 读
            get(target, prop) {
                let m = getMod();
                if (prop === "loaded")
                    return loaded;
                return m[prop];
            },
            // 写
            set(target, prop, value) {
                let m = getMod();
                m[prop] = value;
                return true; // 返回 true 避免修改属性时抛出错误
            },
            ownKeys(target) {
                let m = getMod();
                return Object.keys(m);
            },
            getOwnPropertyDescriptor(k) {
                return {
                    enumerable: k !== "loaded",
                    configurable: k !== "loaded",
                };
            }
        });
    }
    // 生成引用类型
    function genRefType(key, name, typeName = "") {
        // 自定义类型命名: 兼容处理
        name = name.replace("@", "");
        if (typeName && modName) {
            typeName = "### [" + modName + "]" + modFile + "." + typeName;
        }
        let daoType, userType;
        let isArray = false;
        let isRequired = true;
        let doc = "## " + key + "\n\n`< " + name + " >`\n\n" + typeName;
        if (name.indexOf("//") !== -1) {
            let arr = name.split("//");
            name = arr[0].replace(/[\r\n\s]/g, "") || "string";
            doc = "## " + key + "\n\n`< " + name + " >`\n\n" + arr[1].trim() + "\n\n" + typeName;
        }
        if (name.indexOf("?") !== -1) {
            isRequired = false;
            name = name.replace("?", "");
        }
        if (name.indexOf("[]") !== -1) {
            isArray = true;
            name = name.replace("[]", "");
        }
        if (name.startsWith("$")) {
            let daoMod = lua.load(API_PATH, name);
            if (daoMod)
                daoType = daoMod["$dao"];
        }
        else {
            userType = API_TYPES[name];
        }
        if (userType) {
            // userType 使用 proxy 创建可解决自引用问题
            // userType 加载完成后才能解构 (即访问相关属性)
            let userObj = userType;
            if (userType.loaded) {
                doc = doc + "\n---\n" + userType.doc; // 补上 userType 文档
                userObj = Object.assign(Object.assign({}, userObj), { doc });
            }
            if (isArray) {
                return { "[]": userType, doc }; // userType 数组引用
            }
            else {
                return userObj; // userType 对象引用
            }
        }
        else if (daoType) {
            doc = doc + "\n---\n" + daoType.doc; // 补上 dao 文档
            let row = daoType.row;
            if (isArray) {
                return { "[]": { ".": row }, doc }; // dao 数组引用
            }
            else {
                return { ".": row, doc }; // dao 对象引用
            }
        }
        else {
            return { doc };
        }
    }
}
exports.loadApiTypes = loadApiTypes;
// 生成 api 文档
function genApiDoc(name, typeDesc, level = 0) {
    let arr = typeDesc.split("//");
    let type = arr[0].trim();
    let desc = (arr[1] || "").trim();
    desc = desc.split(/[\:\：]/)[0].trim();
    // 自定义类型命名: 兼容处理
    type = type.replace("@", "");
    let span = "  ".repeat(level);
    if (name === "") {
        return "#### `<" + type + ">`";
    }
    else if (/^\d+$/.test(name)) {
        return span + "* 继承属性：`<" + type + ">`";
    }
    else {
        if (!type || type === "string") {
            type = "";
        }
        else {
            type = " `<" + type + ">`";
        }
        if (desc) {
            return span + "* " + desc + "：" + name + type;
        }
        else {
            return span + "* " + name + type;
        }
    }
}
// function loadParentTypes(path: NgxPath): any {
//     let names = path.modName.split(".")
//     while (true) {
//         let name = names.pop()
//         if (!name) return {};
//         if (name === "d") continue;
//         // 加载同目录的 d.lua 文件
//         let mod = load(path, names.join(".") + ".d")
//         if (mod) {
//             let types = mod["$types"] || {}
//             return { ...types }
//         }
//     }
// }
//# sourceMappingURL=modApiTypes.js.map