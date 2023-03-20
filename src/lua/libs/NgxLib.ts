
import { LuaBoolean, LuaNumber, LuaStringOrNil, LuaType } from '../types';
import { isArray, isObject } from "../utils";
import { callFunc } from '../modFunc';
import { LuaScope } from '../scope';
import { Node } from 'luaparse';
import { get_arg_vtype_callback } from '../vtype';

const NgxTimerRes = [ LuaNumber, LuaStringOrNil ] as LuaType[];

(NgxTimerRes as any).$args = function(i: number, args: Node[] = [], _g: LuaScope) {
    return i === 0 ? LuaNumber : get_arg_vtype_callback(i, args, _g, 1, 1);
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
    return get_arg_vtype_callback(i, args, _g, 0, 0);
};

// 模拟 ngx.thread.wait 接口
function ngx_thread_wait(thread: any) {
    if (isObject(thread) && isArray(thread.result)) {
        return [ LuaBoolean, ...thread.result ];
    }
}
