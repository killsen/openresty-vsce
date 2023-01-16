
import { LuaBoolean } from '../types';
import { isArray, isObject } from "../utils";
import { callFunc } from '../modFunc';

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

// 模拟 ngx.thread.wait 接口
function ngx_thread_wait(thread: any) {
    if (isObject(thread) && isArray(thread.result)) {
        return [ LuaBoolean, ...thread.result ];
    }
}
