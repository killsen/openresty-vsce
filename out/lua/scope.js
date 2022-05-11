"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setChild = exports.getType = exports.getValue = exports.setValue = exports.getScope = exports.newScope = void 0;
/** 创建新作用域 */
function newScope(_G, $file) {
    return {
        ["$local"]: {},
        ["$scope"]: _G,
        ["$file"]: $file || _G["$file"]
    };
}
exports.newScope = newScope;
/** 查找上量出现的作用域 */
function getScope(_g, key) {
    if (_g[key] !== undefined || _g["$local"][key]) {
        return _g;
    }
    let _G = _g["$scope"];
    if (!_G) {
        return _g;
    }
    else {
        return getScope(_G, key);
    }
}
exports.getScope = getScope;
/** 设置变量值 */
function setValue(_g, key, val, isLocal, loc) {
    if (val === undefined) {
        val = {}; // 默认值
    }
    if (isLocal) {
        _g["$local"][key] = true;
        if (!key.startsWith("$")) {
            _g["$" + key + "$"] = {
                ["$file"]: getValue(_g, "$file"),
                ["$loc"]: loc,
            };
        }
    }
    else {
        _g = getScope(_g, key);
    }
    if (_g["$local"][key]) {
        // 预定义类型 v21.11.25
        let type_val = _g["$type_" + key];
        if (type_val)
            val = type_val;
    }
    _g[key] = val;
}
exports.setValue = setValue;
/** 取得变量值 */
function getValue(_g, key) {
    // 优先使用类型声明 v22.03.25
    let keyT = "$type_" + key;
    let _GT = getScope(_g, keyT);
    let _G = getScope(_g, key);
    return _GT[keyT] || _G[key];
}
exports.getValue = getValue;
/** 取得变量类型 */
function getType(_g, key) {
    // 优先使用类型声明 v22.03.25
    let keyT = "$type_" + key;
    let _GT = getScope(_g, keyT);
    return _GT[keyT];
}
exports.getType = getType;
/** 检查函数的第一个参数是否 self 或者 _ */
function isSelfCall(obj) {
    if (!(obj instanceof Object)) {
        return false;
    }
    return obj["selfCall"] === true;
}
/** 设置成员属性 */
function setChild(_g, t, indexer, key, val, loc) {
    if (!(t instanceof Object)) {
        return;
    }
    let $file = getValue(_g, "$file");
    let ti = t[indexer];
    if (!(ti instanceof Object)) {
        ti = t[indexer] = {};
    }
    // 不允许修改其它模块的成员变量
    let oldVal = ti[key];
    if (oldVal instanceof Object) {
        if (oldVal["$file"] !== $file) {
            // console.log("不允许修改：", key, oldVal["$file"], $file);
            return;
        }
    }
    ti[key] = val;
    if (!("" + key).startsWith("$")) {
        ti["$" + key + "$"] = {
            ["$file"]: $file,
            ["$loc"]: loc,
        };
    }
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
exports.setChild = setChild;
//# sourceMappingURL=scope.js.map