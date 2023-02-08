
import { CompletionItemKind } from "vscode";

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

// 创建类型
function makeType(typeName: string, isArray = false) : LuaModule {
    return new Proxy({} as LuaModule, {
        get(target, prop) {
            if (prop === "readonly") {
                return true;
            } else if (prop === "basic" ) {
                return true;
            } else if (prop === "type" ) {
                return isArray ? `${ typeName }[]` : typeName;
            } else if (prop === "[]" && (isArray || typeName === "any")) {
                return makeType(typeName);

            } else if (prop === "." && typeName === "any") {
                return { "*" : makeType("any") };
            } else if (prop === "()" && typeName === "any") {
                return [ makeType("any") ];

            } else if (prop === "()" && typeName === "ctype") {
                return [ makeType("cdata") ];
            }
        },
        set(target, _prop, _value) {
            return true;
        },
        ownKeys(target) {
            return [ "readonly", "type", "[]", "()", "." ];
        },
        getOwnPropertyDescriptor(k) {
            return {
                enumerable  : true,
                configurable: true,
            };
        }
    });
}

// 任意类型
export const LuaAny = makeType("any");

export const LuaNil  = null;
export const LuaNull = null;

// 数字类型
export const LuaNumber       = makeType("number");
export const LuaNumberArray  = makeType("number", true);

// 字符串类型
export const LuaString       = makeType("string");
export const LuaStringArray  = makeType("string", true);

// 布尔值类型
export const LuaBoolean      = makeType("boolean");
export const LuaBooleanArray = makeType("boolean", true);

export const LuaStringMap = {
    type: "map<string>",
    readonly : true,
    ".": {
        "*": LuaString
    },
    "[]": LuaString,
};

// 线程类型
export const LuaThread      = makeType("thread");
export const LuaThreadArray = makeType("thread", true);

// 自定义类型
export const LuaUserData      = makeType("userdata");
export const LuaUserDataArray = makeType("userdata", true);

// C数据
export const LuaCData       = makeType("cdata");
export const LuaCDataArray  = makeType("cdata", true);

// C类型
export const LuaCType       = makeType("ctype");
export const LuaCTypeArray  = makeType("ctype", true);

export function getLuaType(typeName: string, isArr = false) {

    if (typeName === "string") {  // 字符串类型
        return isArr ? LuaStringArray : LuaString;

    } else if (typeName === "number") {  // 数字类型
        return isArr ? LuaNumberArray : LuaNumber;

    } else if (typeName === "boolean") {  // 布尔值
        return isArr ? LuaBooleanArray : LuaBoolean;

    } else if (typeName === "thread") {  // 线程类型
        return isArr ? LuaThreadArray : LuaThread;

    } else if (typeName === "userdata") {  // 自定义类型
        return isArr ? LuaUserDataArray : LuaUserData;

    } else if (typeName === "ctype") {  // C类型
        return isArr ? LuaCTypeArray : LuaCType;

    } else if (typeName === "cdata") {  // C数据
        return isArr ? LuaCDataArray : LuaCData;

    } else if (typeName === "table" || typeName === "object") {
        const t = { type: "table", ".": { "*": LuaAny } };
        return isArr ? { type: "table[]", "[]": t } : t;

    } else if (typeName === "any") {  // 任意类型
        return LuaAny;

    } else if (typeName === "void") {  // nil值
        return LuaNil;

    } else if (typeName === "nil") {  // nil值
        return LuaNil;

    } else if (typeName === "map<string>") {
        return LuaStringMap;

    }

}
