
import { LuaBoolean, LuaFunction } from '../types';
import { isArray, isObject } from "../utils";
import { callFunc } from '../modFunc';
import { LuaScope } from '../scope';
import { Node } from 'luaparse';
import { loadNode } from '../parser';
import { get_arg_vtype } from '../vtype';

export const NgxThreadLib = {
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
        let funt = loadNode(args[0], _g);
        args = [...args];
        args.shift();
        return get_arg_vtype(funt, i-1, args, _g);
    }

};

// 模拟 ngx.thread.wait 接口
function ngx_thread_wait(thread: any) {
    if (isObject(thread) && isArray(thread.result)) {
        return [ LuaBoolean, ...thread.result ];
    }
}
