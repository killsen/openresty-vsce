
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
}

export interface LuaApiDocs {
    [key: string]: LuaApiDoc;
}

export interface LuaApiDoc {
    file: string;
    doc: string;
    loc: LuaLoc;
}


// 任意类型
export const LuaAny = {
    type: "any",
    readonly : true,
    "[]": {} as any,
};
LuaAny["[]"] = LuaAny;

export const LuaNil  = null;
export const LuaNull = null;

// 数字类型
export const LuaNumber = {
    type: "number",
    readonly : true
};

// 数字数组
export const LuaNumberArray = {
    type: "number[]",
    readonly : true,
    "[]": LuaNumber,
};

// 字符串类型
export const LuaString = {
    type: "string",
    readonly : true
};

// 字符串数组
export const LuaStringArray = {
    type: "string[]",
    readonly : true,
    "[]": LuaString,
};

// 布尔值类型
export const LuaBoolean = {
    type: "boolean",
    readonly : true
};

// 布尔值数组
export const LuaBooleanArray = {
    type: "boolean[]",
    readonly : true,
    "[]": LuaBoolean,
};

export const LuaStringMap = {
    type: "map<string>",
    readonly : true,
    ".": {
        "*": LuaString
    },
    "[]": LuaString,
};

// 线程类型
export const LuaThread = {
    type: "thread",
    readonly : true,
};

// 线程数组
export const LuaThreadArray = {
    type: "thread[]",
    readonly : true,
    "[]": LuaThread,
};

export function getLuaType(typeName: string, isArr = false) {

    if (typeName === "string") {  // 字符串类型
        return isArr ? LuaStringArray : LuaString;

    } else if (typeName === "number") {  // 数字类型
        return isArr ? LuaNumberArray : LuaNumber;

    } else if (typeName === "boolean") {  // 布尔值
        return isArr ? LuaBooleanArray : LuaBoolean;

    } else if (typeName === "thread") {  // 线程类型
        return isArr ? LuaThreadArray : LuaThread;

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
