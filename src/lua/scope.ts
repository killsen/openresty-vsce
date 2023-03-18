import { Node } from "luaparse";
import { makeSelfCallFunc } from "./modFunc";
import { getBasicType, getLuaTypeName, LuaType } from "./types";
import { getItem, isObject } from "./utils";
import { mergeTypes } from "./vtype";

/** 作用域 */
export interface LuaScope {
    $file     : string;
    $scope  ? : LuaScope;
    $inited ? : boolean;
    $global ? : boolean;
    $root   ? : boolean;
    [key: string] : any;
}

/** 创建新作用域 */
export function newScope(_g: LuaScope, $file?: string): LuaScope {
    return {
        $scope : _g,
        $file  : $file || _g.$file,
        $root  : false,
    };
}

/** 查找上量出现的作用域 */
export function getScope(_g: LuaScope, key: string): LuaScope {

    if (_g["$local_"+key] || key in _g) {
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
export function setValue(_g: LuaScope, key: string, val: any, isLocal: boolean, loc?: Node["loc"]) {

    _g = isLocal ? _g : getScope(_g, key);
    if (_g["$root"]) { return; }

    if (!key.startsWith("$")) {
        if (isLocal) {
            _g["$local_"+key] = true;
            if (loc) {
                _g["$" + key + "$"] = {
                    ["$file"]: getValue(_g, "$file"),
                    ["$loc"]: loc, // 保留本地变量的位置
                };
            }
        }

        let vt = getType(_g, key);
        if (vt) {
            val = getValueTyped(vt, val);  // 类型收敛
        }
    }

    _g[key] = val === undefined ? {} : val;

}

/** 设置值或类型 */
export function setValueTyped(_g: LuaScope, name: string, vtype: LuaType | null) {

    _g[name] = vtype;

    if (vtype && name.startsWith("$type_")) {
        let key = name.substring(6);
        let val = getValue(_g, key);
        if (val !== vtype) {
            _g[key] = vtype;
        }
    }

}

/** 类型收敛 */
export function getValueTyped(vt: LuaType, v: any) : LuaType {

    if (!vt) { return v; }  // 类型未定义

    // function* 或 table* 类型
    if (vt?.passthrough && vt?.type === v?.type) { return v; }

    if (!vt?.types) { return vt; }  // 非联合类型
    if (v === null || v === undefined) { return vt; }
    if (v?.type === "never" || v?.type === "any") { return vt; }
    if (vt === v || vt?.type === v?.type) { return vt; }

    let vt2 : LuaType;

    if (!isObject(v)) {
        let vtName = getLuaTypeName(v);
        if (vtName === "nil" || vtName === "any") {
            return vt;
        } else {
            vt2 = getBasicType(vtName) as LuaType;
        }
    } else {
        vt2 = v;
    }

    v = mergeTypes([vt, vt2]);
    if (!v || v?.type === "never" || v?.type === "any") {
        return vt;
    } else {
        return v;
    }

}


/** 取得变量值 */
export function getValue(_g: LuaScope, key: string) {
    let _G = getScope(_g, key);
    let v = _G[key];
    if (v !== undefined) {
        return v;  // 变量值优先
    } else {
        return getType(_g, key);  // 类型声明托底
    }
}

/** 取得变量类型 */
export function getType(_g: LuaScope, key: string) {
    let keyT = "$type_" + key;
    let _GT = getScope(_g, keyT);
    let vt = _GT[keyT];
    if (vt !== undefined && vt !== null) {
        return vt;
    }
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
    if (val?.type === "function" && val?.selfCall === true && indexer === ".") {
        let ti = t[":"] = t[":"] || {};
        if (ti instanceof Object) {
            ti[key] = makeSelfCallFunc(val);  // 生成函数 SelfCall
            ti["$" + key + "$"] = {
                ["$file"]: $file,
                ["$loc"]: loc, // 保留成员变量的位置
            };
        }
    }

}
