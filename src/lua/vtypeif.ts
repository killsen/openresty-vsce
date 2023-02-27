import { Expression } from 'luaparse';
import { getBasicType, getLuaTypeName, LuaType } from './types';
import { getValue, setValue, LuaScope } from './scope';
import { isArray, isObject } from './utils';
import { unionTypes } from './vtype';
import { _getn } from './libs/TableLib';

function getTypeNameToCheck(exp: Expression) {
    if (exp.type !== "StringLiteral") { return ""; }
    let raw = exp.raw;
    if (raw.startsWith("'") || raw.startsWith('"')) {
        return raw.substring(1, raw.length-1);
    } else {
        let index = raw.indexOf("[", 1) + 1;
        return raw.substring(index, raw.length-index);
    }
}

function getVarNameToCheck(exp: Expression) {
    return exp.type === "CallExpression"
        && exp.base.type === "Identifier"
        && exp.base.name === "type"
        && exp.arguments.length === 1
        && exp.arguments[0].type === "Identifier"
        && exp.arguments[0].name
        || "";
}

const AllTypes = [
    "table",
    "string",
    "number",
    "boolean",
    "function",
    "thread",
    "userdata",
    "ctype",
    "cdata",
];

type MaybeTypes = { [key: string] : string[] };

function andTypes(map1?: MaybeTypes, map2?: MaybeTypes) {

    if (map1 && map2) {
        for (let k in map1) {
            let t1 = map1[k];
            let t2 = map2[k];
            if (t1 && t2) {
                let t = t2.filter(name => t1.includes(name));  // 取交集
                map1[k] = map2[k] = t;
            }
        }
        return { ...map1, ...map2 };

    } else if (map1) {
        return map1;
    } else if (map2) {
        return map2;
    }

}

function orTypes(map1?: MaybeTypes, map2?: MaybeTypes) {
    map1 = notTypes(map1);
    map2 = notTypes(map2);
    return notTypes(andTypes(map1, map2));
}

function notTypes(map?: MaybeTypes) {
    if (!map) {return;}
    for (let k in map) {
        let t = map[k];
        map[k] = AllTypes.filter(name => ! t.includes(name));  // 取差集
    }
    return map;
}

function notType(types: string[]) {
    return AllTypes.filter(name => ! types.includes(name));
}

function loadMaybeTypes(exp: Expression) : MaybeTypes | undefined {

    // if type(t) == "string" then ... else ... end
    // if type(t) ~= "string" then ... else ... end

    if (exp.type === "BinaryExpression") {
        let { left, right, operator } = exp;

        if (operator !== "==" && operator !== "~=") { return; }

        let varName = getVarNameToCheck(left) || getVarNameToCheck(right);
        if (!varName) { return; }

        let typeName = getTypeNameToCheck(left) || getTypeNameToCheck(right);
        if (!typeName) { return; }

        if (operator === "==") {
            return { [ varName ] : [ typeName ] };
        } else if (operator === "~=") {
            return { [ varName ] : AllTypes.filter( name => name !== typeName ) };
        }

    } else if (exp.type === "LogicalExpression") {
        let map1 = loadMaybeTypes(exp.left);
        let map2 = loadMaybeTypes(exp.right);
        return exp.operator === "and"
             ? andTypes(map1, map2)
             : orTypes (map1, map2);

    }  else if (exp.type === "UnaryExpression" && exp.operator === "not") {
        let map = loadMaybeTypes(exp.argument);
        return notTypes(map);
    }

}


export function maybeTypes(exp: Expression, _g: LuaScope, newG: LuaScope, elsG: LuaScope, withReturn: boolean) {

    // if type(t) == "string" then ... else ... end
    // if type(t) ~= "string" then ... else ... end

    const map =  loadMaybeTypes(exp);
    if (!map) { return; }

    Object.keys(map).forEach(varName => {

        let typeNames = map[varName];

        let vt = getValue(newG, varName);
        let vtName = getLuaTypeName(vt);

        if (!isObject(vt) || vtName === "never" || vtName === "any" || vtName === "nil") {
            let name = typeNames.length === 1 ? typeNames[0] : "";
            if (name && name !== vtName) {
                vt = getBasicType(name);
                setValue(newG, "$type_" + varName, null, true);
                setValue(newG, varName, vt, true);
                return;
            }
            // if type(t) ~= "string" then return end
            if (withReturn && typeNames.length >= AllTypes.length - 1) {
                typeNames = notType(typeNames);
                name = typeNames.length === 1 ? typeNames[0] : "";
                if (name && name !== vtName) {
                    setValue(newG, "$type_" + varName, null, true);
                    setValue(newG, varName, vt, true);  // 保留原值

                    vt = getBasicType(name);
                    setValue(_g, "$type_" + varName, null, true);
                    setValue(_g, varName, vt, true);
                }
            }
            return;
        }

        if (vt.$proxy || !vt.type) {
            return;  // 非类型声明不处理
        }

        let vtypes: LuaType[] = isArray(vt?.types) ? vt.types : [ vt ];

        let vtypesNew = vtypes.filter( vt =>   typeNames.includes(getLuaTypeName(vt)) );
        let vtypesEls = vtypes.filter( vt => ! typeNames.includes(getLuaTypeName(vt)) );

        // 只有一个类型
        if (typeNames.length === 1 && vtypesNew.length === 0) {
            let vt0 = getBasicType(typeNames[0]);
            if (vt0) { vtypesNew.push(vt0); }
        }

        let vtNew = unionTypes(vtypesNew);
        let vtEls = unionTypes(vtypesEls);

        setValue(newG, "$type_" + varName, null, true);
        setValue(newG, varName, vtNew, true);

        setValue(elsG, "$type_" + varName, null, true);
        setValue(elsG, varName, vtEls, true);

        // if type(t) ~= "string" then return end
        if (withReturn) {
            setValue(_g, "$type_" + varName, vtEls, true);
            setValue(_g, varName, vtEls, true);
        }
    });

}
