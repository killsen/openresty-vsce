
import { CompletionItemKind } from "vscode";
import { LuaScope } from "./scope";
import { loadType } from "./vtype";

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

export interface LuaTable {
    [key: string]: LuaValue;
}

export interface LuaModule {
    "."?: LuaTable;
    ":"?: LuaTable;
    "()"?: LuaValue[] | Function;
    "[]"?: LuaModule;
    args?: string;
    doc?: string;
    type?: string;
    text?: string;

    readonly?: boolean;
    selfCall?: boolean;
    selfArgs?: string;
    resArgs?: string;

    "$dao"?: LuaDao;
    "$file"?: string;
    "$loc"?: LuaLoc;

    "$types"?: LuaTable;    // 自定义类型
    "$req"?: LuaTable;      // 请求参数类型
    "$res"?: LuaTable;      // 返回值类型

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
    row: LuaTable;
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

const basic = true;
const readonly = true;

export const LuaNil  = null;
export const LuaNull = null;

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

// 数字类型
export const LuaNumber       = { type: "number", basic, readonly };
export const LuaNumberArray  = { type: "number[]", "[]": LuaNumber, readonly };

// 布尔值类型
export const LuaBoolean      = { type: "boolean", basic, readonly };
export const LuaBooleanArray = { type: "boolean[]", "[]": LuaBoolean, basic, readonly };

// 线程类型
export const LuaThread      = { type: "thread", basic, readonly };
export const LuaThreadArray = { type: "thread[]", "[]": LuaThread, readonly };

// 自定义类型
export const LuaUserData      = { type: "userdata", basic, readonly };
export const LuaUserDataArray = { type: "userdata[]", "[]": LuaUserData, readonly };

// C数据
export const LuaCData       = { type: "cdata", basic, readonly };
export const LuaCDataArray  = { type: "cdata[]", "[]": LuaCData, readonly };

// C类型
export const LuaCType       = { type: "ctype", "()": [LuaCData], basic, readonly };
export const LuaCTypeArray  = { type: "ctype[]", "[]": LuaCType, readonly };

const LuaTypes: any = {
    "any"       : LuaAny        , "any[]"       : LuaAnyArray,
    "never"     : LuaNever      , "never[]"     : LuaNeverArray,
    "string"    : LuaString     , "string[]"    : LuaStringArray,
    "number"    : LuaNumber     , "number[]"    : LuaNumberArray,
    "boolean"   : LuaBoolean    , "boolean[]"   : LuaBooleanArray,
    "thread"    : LuaThread     , "thread[]"    : LuaThreadArray,
    "userdata"  : LuaUserData   , "userdata[]"  : LuaUserDataArray,
    "ctype"     : LuaCType      , "ctype[]"     : LuaCTypeArray,
    "cdata"     : LuaCData      , "cdata[]"     : LuaCDataArray,

    "map<string>"   : { type: "map<string>"     , ".": { "*": LuaString      }, readonly },
    "map<number>"   : { type: "map<number>"     , ".": { "*": LuaNumber      }, readonly },
    "map<boolean>"  : { type: "map<boolean>"    , ".": { "*": LuaBoolean     }, readonly },
    "map<any>"      : { type: "map<any>"        , ".": { "*": LuaAny         }, readonly },

    "map<string[]>" : { type: "map<string[]>"   , ".": { "*": LuaStringArray  }, readonly },
    "map<number[]>" : { type: "map<number[]>"   , ".": { "*": LuaNumberArray  }, readonly },
    "map<boolean[]>": { type: "map<boolean[]>"  , ".": { "*": LuaBooleanArray }, readonly },
    "map<any[]>"    : { type: "map<any[]>"      , ".": { "*": LuaAnyArray     }, readonly },
};

/** 获取基本类型或复杂类型 */
export function getLuaType(typeName: string, _g: LuaScope) {

    let t = getBasicType(typeName);
    if (t) { return t; }

    if (typeName.match(/(<.+>|{.+}|.+&.+|.+\|.+)/)) {
        t = loadType(typeName, _g);
        return t;
    }

}

/** 获取基本类型 */
export function getBasicType(typeName: string) {

    typeName = typeName.replace(/\s/g, "");  // 清除空格

    if (typeName in LuaTypes) {
        return LuaTypes[typeName];

    } else if (typeName === "table" || typeName === "object") {
        return { type: "table", ".": { "*": LuaAny } };

    } else if (typeName === "table[]" || typeName === "object[]") {
        const t = { type: "table", ".": { "*": LuaAny } };
        return { type: "table[]", "[]": t };

    } else if (typeName === "void") {
        return LuaNil;

    } else if (typeName === "nil") {
        return LuaNil;

    }

}
