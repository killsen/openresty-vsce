
import { LuaBoolean, LuaFunction, LuaNumber, LuaStringOrNil, LuaType } from '../types';
import { isArray, isObject } from "../utils";
import { callFunc } from '../modFunc';
import { LuaScope } from '../scope';
import { Node } from 'luaparse';
import { loadNode } from '../parser';
import { get_arg_vtype } from '../vtype';

const NgxTimerRes = [ LuaNumber, LuaStringOrNil ] as LuaType[];

(NgxTimerRes as any).$args = function(i: number, args: Node[] = [], _g: LuaScope) {

    if (i === 0) {
        return LuaNumber;
    } else if (i === 1) {
        return LuaFunction;
    } else if (i > 1) {
        let funt = loadNode(args[1], _g);   // 第 2 个参数为函数
        let argx = args.slice(2);           // 去掉前 2 个参数
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

    if (i === 0) {
        return LuaFunction;
    } else if (i > 0) {
        let funt = loadNode(args[0], _g);   // 第 1 个参数为函数
        let argx = args.slice(1);           // 去掉前 1 个参数
        return get_arg_vtype(funt, i-1, argx, _g);
    }

};

// 模拟 ngx.thread.wait 接口
function ngx_thread_wait(thread: any) {
    if (isObject(thread) && isArray(thread.result)) {
        return [ LuaBoolean, ...thread.result ];
    }
}
