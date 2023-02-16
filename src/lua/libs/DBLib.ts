
import { LuaScope } from "../scope";
import { LuaStringOrNil } from "../types";
import { isObject } from "../utils";
import { loadType } from "../vtype";

const _g: LuaScope = { $file: "", $local: {}, $scope: undefined };

export const DBLib = {
    mquery  : _mquery,
    trans   : _trans,
    tranx   : _tranx,
};

_mquery["$argTypes"] = [ loadType("map<string>", _g) ];
_trans ["$argTypes"] = [ loadType("string | string[]", _g) ];
_tranx ["$argTypes"] = [ loadType("string | string[]", _g) ];

const readonly = true;
const basic = true;

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
        err      : { type: "string", readonly, basic, doc: "错误消息" },
        errcode  : { type: "number", readonly, basic, doc: "错误编码" },
        sqlstate : { type: "number", readonly, basic, doc: "服务器状态" },
    }
};

/** 并行查询 */
function _mquery(t: any) {

    let ti = isObject(t) && isObject(t["."]) ? { ...t["."] } : {};

    for (let k in ti) {
        if (!k.startsWith("$")) {
            let v = ti[k];
            ti[k] = isObject(v) && v["$result"] || DbQueryResult;
        }
    }

    const res = { ...t, ".": ti };

    return [ res, LuaStringOrNil ];

}

/** 事务处理 */
function _trans(t: any) {

    let ti = isObject(t) && isObject(t["."]) ? t["."] : {};
    let ta = {} as any;

    for (let k in ti) {
        let kn = Number(k);
        if (!isNaN(kn) && kn > 0) {
            let v = ti[k];
            ta[kn+1] = {
                ...DbTransResult,
                "." : {
                    ...DbTransResult["."],
                    res: isObject(v) && v["$result"] || DbQueryResult,
                }
            };

        }
    }

    const res = {
        type: "map<DbTransResult>",
        doc: "## 数据库事务处理结果",
        readonly,
        ".": ta
    };

    return [ res, LuaStringOrNil ];

}

/** 事务处理 */
function _tranx(t: any) {

    let ti = isObject(t) && isObject(t["."]) ? t["."] : {};
    let ta = {} as any;

    for (let k in ti) {
        let kn = Number(k);
        if (!isNaN(kn) && kn > 0) {
            let v = ti[k];
            ta[kn+1] = isObject(v) && v["$result"] || DbQueryResult;
        }
    }

    const res = {
        type: "map<DbTransResult>",
        doc: "## 数据库事务处理结果",
        readonly,
        ".": ta
    };

    return [ res, LuaStringOrNil ];

}
