
import { CompletionItemKind } from "vscode";
import { isObject } from "./utils";

export interface LuaLoc {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
}

export type LuaValue = LuaModule | undefined;

export interface LuaObject {
    [key: string]: LuaValue;
}

export interface LuaModule {
    "."?: LuaObject;
    ":"?: LuaObject;
    "()"?: LuaValue[] | Function;
    "[]"?: LuaModule;
    args?: string;
    argsMin?: number;
    $args?: any;
    $argx?: string;
    doc?: string;
    type?: string;
    text?: string;

    readonly?: boolean;
    selfCall?: boolean;
    selfArgs?: string;
    selfArgx?: string;
    resArgs?: string;

    "$dao"?: LuaDao;
    "$file"?: string;
    "$loc"?: LuaLoc;

    "$types"?: LuaObject;    // 自定义类型
    "$req"?: LuaObject;      // 请求参数类型
    "$res"?: LuaObject;      // 返回值类型

    "@@"?: Function;        // 构造函数
}

export interface LuaItem {
    name: string,
    doc: string,
    kind: CompletionItemKind
}

export interface LuaDaoField {
    name: string;
    desc: string;
    type: string;
    pk: boolean;
    "$file"?: string;
    "$loc"?: LuaLoc;
}

export interface LuaDao {
    name: string;
    desc: string;
    fields: LuaDaoField[];
    row: LuaObject;
    "$file"?: string;
    "$loc"?: LuaLoc;
    "doc": string;
}

export interface LuaApi {
	/** 代码补全 */ text: string;
	/** 接口名称 */ name: string;
	/** 输入参数 */ args: string;
	/** 返回参数 */ res: string;
	/** 接口说明 */ desc: string;
	/** 接口类型 */ kind: CompletionItemKind;
	/** 父接口名 */ parent: string;
	/** 点连接符 */ indexer: string;
	/** 子接口名 */ child: string;

	/** 接口文档 */ doc: string;
	/** 文档位置 */ loc? : LuaLoc;
	/** 文档路径 */ file?: string;
    /** 只读属性 */ readonly: true;
}

export interface LuaApiDocs {
    [key: string]: LuaApiDoc;
}

export interface LuaApiDoc {
    file: string;
    doc: string;
    loc: LuaLoc;
}

export interface LuaType {
    "."     ? : LuaObject;
    ":"     ? : LuaObject;
    "[]"    ? : LuaType;
    type      : string;
    types   ? : LuaType[];
    vtype   ? : LuaType;
    doc     ? : string;
    basic   ? : boolean;
    readonly  : boolean;
    nilable ? : boolean;
    passthrough? : boolean;
}

const basic = true;
const readonly = true;
const passthrough = true;

export const LuaNil  = null;

// ngx.null 或 cjson.null
export const LuaNull      = { type: "null", basic, readonly };
export const LuaNullArray = { type: "null[]", "[]": LuaNull, readonly };

export const LuaVarArgs = { type: "...", basic, readonly, nilable: true };

// 任意类型
export const LuaAny       = { type: "any", basic, readonly, ".": {}, "$mt": {} };
export const LuaAnyArray  = { type: "any[]", "[]": LuaAny, readonly };
LuaAny["."  ] = { "*": LuaAny };
LuaAny["$mt"] = { __call : { "()" : [LuaAny] } };

// 不存在类型
export const LuaNever       = { type: "never", basic, readonly };
export const LuaNeverArray  = { type: "never[]", "[]": LuaNever, readonly };

// 字符串类型
export const LuaString       = { type: "string", basic, readonly };
export const LuaStringArray  = { type: "string[]", "[]": LuaString, readonly };
export const LuaStringOrNil  = { type: "string", basic, readonly, nilable: true };

// 数字类型
export const LuaNumber       = { type: "number", basic, readonly };
export const LuaNumberArray  = { type: "number[]", "[]": LuaNumber, readonly };

// 布尔值类型
export const LuaBoolean      = { type: "boolean", basic, readonly };
export const LuaBooleanArray = { type: "boolean[]", "[]": LuaBoolean, basic, readonly };

// 函数类型
export const LuaFunction      = { type: "function", "()": [LuaAny], basic, readonly };
export const LuaFunctionArray = { type: "function[]", "[]": LuaFunction, readonly };

// 线程类型
export const LuaThread      = { type: "thread", basic, readonly };
export const LuaThreadArray = { type: "thread[]", "[]": LuaThread, readonly };

// 自定义类型
export const LuaUserData      = { type: "userdata", ".": { "*": LuaAny }, basic, readonly };
export const LuaUserDataArray = { type: "userdata[]", "[]": LuaUserData, readonly };

// C数据
export const LuaCData       = { type: "cdata", ".": { "*": LuaAny }, basic, readonly };
export const LuaCDataArray  = { type: "cdata[]", "[]": LuaCData, readonly };

// C类型
export const LuaCType       = { type: "ctype", "()": [LuaCData], basic, readonly };
export const LuaCTypeArray  = { type: "ctype[]", "[]": LuaCType, readonly };

// 文件类型
export const LuaFile       = { type: "file", basic, readonly };
export const LuaFileArray  = { type: "file[]", "[]": LuaFile, readonly };

// 对象类型
export const LuaTable      = { type: "table", ".": { "*": LuaAny }, ":": { "*": LuaFunction }, readonly };
export const LuaTableArray = { type: "table[]", "[]": LuaTable, readonly };

const LuaTypes: { [key: string] : LuaType } = {
    "..."               : LuaVarArgs,
    "null"              : LuaNull                   , "null[]"          : LuaNullArray,
    "any"               : LuaAny                    , "any[]"           : LuaAnyArray,
    "never"             : LuaNever                  , "never[]"         : LuaNeverArray,
    "string"            : LuaString                 , "string[]"        : LuaStringArray,
    "string?"           : LuaStringOrNil,
    "number"            : LuaNumber                 , "number[]"        : LuaNumberArray,
    "boolean"           : LuaBoolean                , "boolean[]"       : LuaBooleanArray,
    "function"          : LuaFunction               , "function[]"      : LuaFunctionArray,
    "thread"            : LuaThread                 , "thread[]"        : LuaThreadArray,
    "userdata"          : LuaUserData               , "userdata[]"      : LuaUserDataArray,
    "ctype"             : LuaCType                  , "ctype[]"         : LuaCTypeArray,
    "cdata"             : LuaCData                  , "cdata[]"         : LuaCDataArray,
    "file"              : LuaFile                   , "file[]"          : LuaFileArray,
    "table"             : LuaTable                  , "table[]"         : LuaTableArray,
    "object"            : LuaTable                  , "object[]"        : LuaTableArray,

    "map<null>"         : { type: "map<null>"       , ".": { "*": LuaNull           }, readonly },
    "map<any>"          : { type: "map<any>"        , ".": { "*": LuaAny            }, readonly },
    "map<never>"        : { type: "map<never>"      , ".": { "*": LuaNever          }, readonly },
    "map<string>"       : { type: "map<string>"     , ".": { "*": LuaString         }, readonly },
    "map<number>"       : { type: "map<number>"     , ".": { "*": LuaNumber         }, readonly },
    "map<boolean>"      : { type: "map<boolean>"    , ".": { "*": LuaBoolean        }, readonly },
    "map<function>"     : { type: "map<function>"   , ".": { "*": LuaFunction       }, readonly },
    "map<thread>"       : { type: "map<thread>"     , ".": { "*": LuaThread         }, readonly },
    "map<userdata>"     : { type: "map<userdata>"   , ".": { "*": LuaUserData       }, readonly },
    "map<ctype>"        : { type: "map<ctype>"      , ".": { "*": LuaCType          }, readonly },
    "map<cdata>"        : { type: "map<cdata>"      , ".": { "*": LuaCData          }, readonly },
    "map<file>"         : { type: "map<file>"       , ".": { "*": LuaFile           }, readonly },
    "map<table>"        : { type: "map<table>"      , ".": { "*": LuaTable          }, readonly },
    "map<object>"       : { type: "map<table>"      , ".": { "*": LuaTable          }, readonly },

    "map<null[]>"       : { type: "map<null[]>"     , ".": { "*": LuaNullArray      }, readonly },
    "map<any[]>"        : { type: "map<any[]>"      , ".": { "*": LuaAnyArray       }, readonly },
    "map<string[]>"     : { type: "map<string[]>"   , ".": { "*": LuaStringArray    }, readonly },
    "map<number[]>"     : { type: "map<number[]>"   , ".": { "*": LuaNumberArray    }, readonly },
    "map<boolean[]>"    : { type: "map<boolean[]>"  , ".": { "*": LuaBooleanArray   }, readonly },
    "map<function[]>"   : { type: "map<function[]>" , ".": { "*": LuaFunctionArray  }, readonly },
    "map<thread[]>"     : { type: "map<thread[]>"   , ".": { "*": LuaThreadArray    }, readonly },
    "map<userdata[]>"   : { type: "map<userdata[]>" , ".": { "*": LuaUserDataArray  }, readonly },
    "map<ctype[]>"      : { type: "map<ctype[]>"    , ".": { "*": LuaCTypeArray     }, readonly },
    "map<cdata[]>"      : { type: "map<cdata[]>"    , ".": { "*": LuaCDataArray     }, readonly },
    "map<file[]>"       : { type: "map<file[]>"     , ".": { "*": LuaFileArray      }, readonly },
    "map<table[]>"      : { type: "map<table[]>"    , ".": { "*": LuaTableArray     }, readonly },
    "map<object[]>"     : { type: "map<table[]>"    , ".": { "*": LuaTableArray     }, readonly },
};

/** 获取基本类型 */
export function getBasicType(typeName: string) {

    if (typeof typeName !== "string") { return; }

    typeName = typeName.replace(/\s/g, "");  // 清除空格

    if (typeName in LuaTypes) {
        return LuaTypes[typeName];

    } else if (typeName === "table*") {
        // 可传递的 可修改的 table 类型
        return { type: "table", ".": { "*": LuaAny }, ":": { "*": LuaFunction }, readonly: false, passthrough };

    } else if (typeName === "function*") {
        // 可传递的 function 类型
        return { type: "function", "()": [LuaAny], basic, readonly, passthrough };

    } else if (typeName === "void") {
        return LuaNil;

    } else if (typeName === "nil") {
        return LuaNil;

    }

}

/** 取得 lua 类型名称 */
export function getLuaTypeName(v: any) {

    if (!isObject(v)) {
        let t = typeof v;
        return v === null       ? "nil"
            :  t === "string"   ? "string"
            :  t === "number"   ? "number"
            :  t === "boolean"  ? "boolean"
            :  t === "function" ? "function"
            :  "any";
    } else {
        let t = v.type;
        return t === "any"      ? "any"
            :  t === "never"    ? "never"
            :  t === "string"   ? "string"
            :  t === "number"   ? "number"
            :  t === "boolean"  ? "boolean"
            :  t === "function" ? "function"
            :  t === "thread"   ? "thread"
            :  t === "userdata" ? "userdata"
            :  t === "file"     ? "userdata"
            :  t === "null"     ? "userdata"
            :  t === "cdata"    ? "cdata"
            :  t === "ctype"    ? "cdata"
            :  t === "table"    ? "table"
            :  t === "lib"      ? "table"
            :  t === "api"      ? "table"
            :  v["$$mt"]        ? "table"
            :  v["()"]          ? "function"
            :  v["."]           ? "table"
            :  v[":"]           ? "table"
            :  v["[]"]          ? "table"
            :  "any";
    }
}


// 是否基本类型
export function isBasicType(typeName: string) {
    let vt = getBasicType(typeName) as any;
    return !!vt?.basic;
}

// 类型是否一致
export function isSameType(v1: LuaType, v2: LuaType) {

    if (v1 === v2) { return true; }

    let vt1 = getBasicType(v1?.type);
    let vt2 = getBasicType(v2?.type);

    return vt1?.type === vt2?.type;

}
