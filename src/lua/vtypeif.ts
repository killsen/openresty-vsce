import { Expression } from 'luaparse';
import { getBasicType, getLuaTypeName, LuaType } from './types';
import { getValue, setValueTyped, LuaScope } from './scope';
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


export function maybeTypes(exp: Expression, _g: LuaScope,
    thenG: LuaScope, elseG: LuaScope, thenReturn: boolean, elseReturn: boolean) {

    // if type(t) == "string" then ... else ... end
    // if type(t) ~= "string" then ... else ... end

    const map =  loadMaybeTypes(exp);
    if (!map) { return; }

    Object.keys(map).forEach(varName => {

        const thenTypes = map[varName];
        const elseTypes = notType(thenTypes);

        const vt = getValue(thenG, varName);
        const vtName = getLuaTypeName(vt);

        if (!isObject(vt) || vtName === "never" || vtName === "any" || vtName === "nil") {
            let name : string;

            // if type(t) == "string" then ... else return end
            name = thenTypes.length === 1 ? thenTypes[0] : "";
            if (name && name !== vtName) {
                const vtThen = getBasicType(name) as LuaType;
                setValueTyped(thenG, varName, vtThen);

                if (elseReturn) {
                    setValueTyped(elseG, varName, vt);  // 保留原值
                    setValueTyped(_g, varName, vtThen);
                }
            }

            // if type(t) ~= "string" then return else ... end
            name = elseTypes.length === 1 ? elseTypes[0] : "";
            if (name && name !== vtName) {
                const vtElse = getBasicType(name) as LuaType;
                setValueTyped(elseG, varName, vtElse);

                if (thenReturn) {
                    setValueTyped(thenG, varName, vt);  // 保留原值
                    setValueTyped(_g, varName, vtElse);
                }
            }
            return;
        }

        if (vt.$proxy || !vt.type) {
            return;  // 非类型声明不处理
        }

        const vtypes: LuaType[] = isArray(vt?.types) ? vt.types : [ vt ];

        const vtypesThen = vtypes.filter( vt => thenTypes.includes(getLuaTypeName(vt)) );
        const vtypesElse = vtypes.filter( vt => elseTypes.includes(getLuaTypeName(vt)) );

        // then 只有一个类型
        if (thenTypes.length === 1 && vtypesThen.length === 0) {
            const vt0 = getBasicType(thenTypes[0]);
            if (vt0) { vtypesThen.push(vt0); }
        }

        // else 只有一个类型
        if (elseTypes.length === 1 && vtypesElse.length === 0) {
            const nt0 = getBasicType(elseTypes[0]);
            if (nt0) { vtypesElse.push(nt0); }
        }

        // if type(t) ~= "string" then return else ... end
        if (vtypesElse.length > 0) {
            const vtElse = unionTypes(vtypesElse);
            setValueTyped(elseG, varName, vtElse);
            thenReturn && setValueTyped(_g, varName, vtElse);
        }

        // if type(t) == "string" then ... else return end
        if (vtypesThen.length > 0) {
            const vtThen = unionTypes(vtypesThen);
            setValueTyped(thenG, varName, vtThen);
            elseReturn && setValueTyped(_g, varName, vtThen);
        }
    });

}
