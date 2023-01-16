
import { LuaModule } from './types';
import { window, workspace } from 'vscode';
import { watch as _watch } from 'fs';

// 模块缓存
const MOD_LOADED = new Map<string, LuaModule>();

// 引用关系
const MOD_DEPENDS = new Map<string, string[]>();

/** 取得模块缓存 */
export function getModCache(fileName: string) {
    return MOD_LOADED.get(fileName);
}

/** 更新模块缓存 */
export function setModCache(fileName: string, mod: LuaModule) {
    MOD_LOADED.set(fileName, mod);
}

/** 设置模块引用关系 */
export function setDepend(fileName: string, dependFile: string){
    if (fileName === dependFile) {return;}
    if (fileName.endsWith(".editing")) {return;}

    let arr = MOD_DEPENDS.get(fileName);
    if (arr?.includes(dependFile)) {
        return;  // 避免互相引用
    }

    arr = MOD_DEPENDS.get(dependFile);
    if (!arr) {
        arr = [];
        MOD_DEPENDS.set(dependFile, arr);
    }
    if (!arr.includes(fileName)) {
        arr.push(fileName);
    }

}

let count = 1;  // 清理次数

/** 清理模块缓存 */
export function cleanUp(fileName: string){

    let mod = MOD_LOADED.get(fileName);
    if (mod) {
        MOD_LOADED.delete(fileName);

        const text = "清理模块：" + (count++) + "\t" + fileName;
        console.log(text);
        window.setStatusBarMessage(text);
    }

    let arr = MOD_DEPENDS.get(fileName);
    if (arr) {
        MOD_DEPENDS.delete(fileName);
        arr.forEach(cleanUp);
    }

}

/** 文档保存时 */
workspace.onDidSaveTextDocument(function (event) {
    cleanUp(event.fileName);
});

const WATCH_FILES = new Map<string, true>();

/** 监听文件变化 */
export function watchFile(fileName : string) {

    if (WATCH_FILES.has(fileName)) { return; }

    WATCH_FILES.set(fileName, true);

    _watch(fileName, ()=>{
        // console.log("监听文件: ", fileName);
        cleanUp(fileName);  // 清理模块缓存
    });

}
