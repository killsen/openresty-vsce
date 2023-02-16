
import { LuaScope } from "../scope";
import { LuaBoolean, LuaNumber, LuaString, LuaStringOrNil } from "../types";
import { isObject } from "../utils";
import { loadType } from "../vtype";

export const DbLib = {
    execute : _execute,
    query   : _query,
    mquery  : _mquery,
    trans   : _trans,
    tranx   : _tranx,
};

const _g: LuaScope = { $file: "", $local: {}, $scope: undefined };
const AnyRows   = loadType("(string | number | boolean)[][]", _g);
const MapString = loadType("map<string>", _g);
const ArrString = loadType("string | string[]", _g);
const readonly  = true;
const basic     = true;

_mquery  ["$argTypes"] = [ MapString ];
_trans   ["$argTypes"] = [ ArrString ];
_tranx   ["$argTypes"] = [ ArrString ];
_execute ["$argTypes"] = [ LuaString, LuaBoolean ];
_query   ["$argTypes"] = [ LuaString ];

const DbQueryResult = {
    type : "DbQueryResult",
    doc : "## 数据库操作结果",
    readonly,
    "." : {
        affected_rows : { type: "number", readonly, basic, doc: "影响的记录行数" },
        insert_id     : { type: "number", readonly, basic, doc: "INSERT 查询中产生的 AUTO_INCREMENT 的 ID 号" },
        server_status : { type: "number", readonly, basic, doc: "服务器状态" },
        warning_count : { type: "number", readonly, basic, doc: "告警数目" },
        message       : { type: "string", readonly, basic, doc: "服务器消息" },
    }
};

const DbTransResult = {
    type : "DbTransResult",
    doc : "## 数据库事务处理结果",
    readonly,
    "." : {
        res      : DbQueryResult,
        err      : { type: "string", readonly, basic, doc: "错误消息", nilable: true },
        errcode  : { type: "number", readonly, basic, doc: "错误编码" },
        sqlstate : { type: "number", readonly, basic, doc: "服务器状态" },
    }
};

/** 执行语句 */
function _execute(t: any, nrows?: any) {
    let res = nrows ? AnyRows : t?.$result || DbQueryResult;
    return [ res, LuaStringOrNil, LuaNumber, LuaNumber ];
}
function _query(t: any) {
    return _execute(t);
}

/** 并行查询 */
function _mquery(t: any) {

    let ti = isObject(t) ? { ...t["."] } : {};

    for (let k in ti) {
        if (!k.startsWith("$")) {
            let v = ti[k];
            ti[k] = v?.$result || DbQueryResult;
        }
    }

    const res = { ...t, ".": ti };
    return [ res, LuaStringOrNil ];

}

/** 事务处理 */
function _trans(t: any) {

    let ti = isObject(t) ? t["."] : {};
    let ta = {} as any;

    let docs = [] as string[];
    docs.push("## DbTransResult[]");
    docs.push("数据库事务处理结果");
    docs.push("* [1] `{ res: DbQueryResult, err, errcode, sqlstate }` “begin;”");

    ta[1] = DbTransResult;

    for (let k in ti) {
        let kn = Number(k);
        if (!isNaN(kn) && kn > 0) {
            let v = ti[k];
            v = v?.$result || DbQueryResult;

            let name = v?.type || "DbQueryResult";
            docs.push("* [" + (kn+1) + "] `{ res: " + name + ", err, errcode, sqlstate }`");

            ta[kn+1] = {
                ...DbTransResult,
                "." : {
                    ...DbTransResult["."],
                    res: v,
                }
            };

        }
    }

    docs.push("### DbQueryResult");
    docs.push("{ affected_rows, insert_id, server_status, warning_count, message }");

    const res = {
        type: "DbTransResult[]",
        doc: docs.join("\n\n"),
        readonly,
        ".": ta
    };

    return [ res, LuaStringOrNil ];

}

/** 事务处理 */
function _tranx(t: any) {

    let ti = isObject(t) ? t["."] : {};
    let ta = {} as any;

    let docs = [] as string[];
    docs.push("## DbQueryResult[]");
    docs.push("数据库事务处理结果");
    docs.push("* [1] `DbQueryResult` “begin;”");

    ta[1] = DbQueryResult;

    for (let k in ti) {
        let kn = Number(k);
        if (!isNaN(kn) && kn > 0) {
            let v = ti[k];
            v = v?.$result || DbQueryResult;

            let name = v?.type || "DbQueryResult";
            docs.push("* [" + (kn+1) + "] `" + name + "`");

            ta[kn+1] = v;
        }
    }

    docs.push("### DbQueryResult");
    docs.push("{ affected_rows, insert_id, server_status, warning_count, message }");

    const res = {
        type: "DbQueryResult[]",
        doc: docs.join("\n\n"),
        readonly,
        ".": ta
    };

    return [ res, LuaStringOrNil ];

}
