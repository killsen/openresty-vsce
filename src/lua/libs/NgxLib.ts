
import { LuaBoolean, LuaFunction, LuaNumber, LuaStringOrNil, LuaType } from '../types';
import { isArray, isObject } from "../utils";
import { callFunc } from '../modFunc';
import { LuaScope } from '../scope';
import { Node } from 'luaparse';
import { loadNode } from '../parser';
import { addLint, get_arg_vtype } from '../vtype';

const NgxTimerRes = [ LuaNumber, LuaStringOrNil ] as LuaType[];

(NgxTimerRes as any).$args = function(i: number, args: Node[] = [], _g: LuaScope) {

    if (i === 0) {
        return LuaNumber;
    }

    let funt = loadNode(args[1], _g);   // 第 2 个参数为函数
    let argx = args.slice(2);           // 去掉前 2 个参数

    if (i === 1) {
        const nodev = args.length > 1 && args[args.length-1];
        let vararg = nodev && nodev.type === "VarargLiteral";

        // 最少参数个数检查
        const argsMin = typeof funt?.argsMin === "number" ? funt?.argsMin : 0;
        if (argsMin && argsMin - 1 > argx.length && !vararg) {
            addLint(args[1], "", _g, `最少需要 ${ argsMin - 1 } 个参数`);
        }

        return LuaFunction;
    } else if (i > 1) {
        return get_arg_vtype(funt, i-2+1, argx, _g);
    }

};

export const NgxTimerLib : { [key: string] : LuaType[] }  = {
    at      : NgxTimerRes,
    every   : NgxTimerRes,
};

export const NgxThreadLib : { [key: string] : Function } = {
    spawn  : ngx_thread_spawn,
    wait   : ngx_thread_wait,
};

// 模拟 ngx.thread.spawn 接口
function ngx_thread_spawn(funt: any, ...args: any[]) {
    let res = callFunc(funt, ...args);
    return {
        type : "thread",
        readonly: true,
        result: isArray(res) ? res : [res]
    };
}

ngx_thread_spawn.$args = function(i: number, args: Node[] = [], _g: LuaScope) {

    let funt = loadNode(args[0], _g);   // 第 1 个参数为函数
    let argt = args.slice(1);           // 去掉前 1 个参数

    if (i === 0) {
        const nodev = args.length > 1 && args[args.length-1];
        let vararg = nodev && nodev.type === "VarargLiteral";

        // 最少参数个数检查
        const argsMin = typeof funt?.argsMin === "number" ? funt?.argsMin : 0;
        if (argsMin && argsMin > argt.length && !vararg) {
            addLint(args[0], "", _g, `最少需要 ${ argsMin } 个参数`);
        }

        return LuaFunction;

    } else if (i > 0) {
        return get_arg_vtype(funt, i-1, argt, _g);
    }

};

// 模拟 ngx.thread.wait 接口
function ngx_thread_wait(thread: any) {
    if (isObject(thread) && isArray(thread.result)) {
        return [ LuaBoolean, ...thread.result ];
    }
}
