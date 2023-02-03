import { getItem } from "./utils";

/** 作用域 */
export interface LuaScope {
    ["$local"] : { [key: string]: boolean };
    ["$scope"] : LuaScope | undefined;
    ["$file"] : string;
    [key: string] : any;
}

/** 创建新作用域 */
export function newScope(_g: LuaScope, $file?: string): LuaScope {
    return {
        ["$local"]: {},
        ["$scope"]: _g,
        ["$file"]: $file || _g["$file"]
    };
}

/** 查找上量出现的作用域 */
export function getScope(_g: LuaScope, key: string): LuaScope {

    if (_g[key] !== undefined || _g["$local"][key]) {
        return _g;
    }

    let _G = _g["$scope"];
    if (!_G) {
        return _g;
    }else{
        return getScope(_G, key);
    }

}

/** 设置变量值 */
export function setValue(_g: LuaScope, key: string, val: any, isLocal: boolean, loc?: any) {

    if (val === undefined) {
        val = {};  // 默认值
    }

    if (isLocal) {
        _g["$local"][key] = true;

        if (!key.startsWith("$")) {
            _g["$" + key + "$"] = {
                ["$file"]: getValue(_g, "$file"),
                ["$loc"]: loc, // 保留本地变量的位置
            };
        }
    } else {
        _g = getScope(_g, key);
    }

    if (_g["$local"][key]) {
        // 预定义类型 v21.11.25
        let typeVal = _g["$type_" + key];
        if (typeVal) {val = typeVal;}
    }

    _g[key] = val;

}

/** 取得变量值 */
export function getValue(_g: LuaScope, key: string) {

    // 优先使用类型声明 v22.03.25
    let keyT = "$type_" + key;
    let _GT = getScope(_g, keyT);

    let _G = getScope(_g, key);

    return keyT in _GT ? _GT[keyT] : _G[key];

}

/** 取得变量类型 */
export function getType(_g: LuaScope, key: string) {

    // 优先使用类型声明 v22.03.25
    let keyT = "$type_" + key;
    let _GT = getScope(_g, keyT);

    return _GT[keyT];

}


/** 检查函数的第一个参数是否 self 或者 _ */
function isSelfCall(obj: any): boolean {
    if (!(obj instanceof Object)) { return false; }
    return obj["selfCall"] === true;
}

/** 设置成员属性 */
export function setChild(_g: LuaScope, t: any, indexer: string, key: string | number, val: any, loc: any) {

    if (!(t instanceof Object)) { return; }

    if (t["readonly"]) {
        return;  // 只读
    }

    if (typeof key === "number") { key = String(key); }
    if (typeof key !== "string") {return;}


    let ti = t[indexer];
    if (!(ti instanceof Object)) {
        ti = t[indexer] = {};
    }

    let $file = getValue(_g, "$file");

    if (!key.startsWith("$")) {
        let keyExist = key in ti;
        let keyFile$ = getItem(t, [".", "$" + key + "$", "$file"]);

        // 不允许修改其它模块的成员变量
        if (keyExist && $file && keyFile$ && $file !== keyFile$) {
            // console.log("不允许修改：", key, keyFile$, $file);
            return;
        }

        ti["$" + key + "$"] = {
            ["$file"]: $file,
            ["$loc"]: loc, // 保留成员变量的位置
        };
    }

    ti[key] = val;

    // function t.f(self, a, b, c) -> t:f(a, b, c)
    if (isSelfCall(val) && indexer === ".") {
        let ti = t[":"] = t[":"] || {};
        if (ti instanceof Object) {
            ti[key] = {
                ["()"]: val["()"],
                "args": val["selfArgs"],
                "doc": val["doc"],
                "$file": val["$file"],
                "$loc": val["$loc"],
            };
        }
    }

}
