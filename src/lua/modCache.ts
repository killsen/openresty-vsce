
import { LuaModule } from './types';
import { window, workspace } from 'vscode';
import { watch as _watch } from 'fs';

// 模块缓存
const MOD_LOADED : {
    [key: string] : LuaModule
} = {};

// 引用关系
const MOD_DEPENDS: {
    [key: string] : string[];
} = {};

/** 取得模块缓存 */
export function getModCache(fileName: string) {
    return MOD_LOADED[fileName];
}

/** 更新模块缓存 */
export function setModCache(fileName: string, mod: LuaModule) {
    MOD_LOADED[fileName] = mod;
}

/** 设置模块引用关系 */
export function setDepend(fileName: string, dependFile: string){
    if (fileName === dependFile) {return;}
    if (fileName.endsWith(".editing")) {return;}

    const map = MOD_DEPENDS;
    if (map[fileName]) {
        if (map[fileName].includes(dependFile)) {
            return;  // 避免互相引用
        }
    }

    map[dependFile] = map[dependFile] || [];
    if (!map[dependFile].includes(fileName)) {
        map[dependFile].push(fileName);
    }

}

let count = 1;  // 清理次数

/** 清理模块缓存 */
export function cleanUp(fileName: string){

    let mod = MOD_LOADED[fileName];
    if (mod) {
        delete MOD_LOADED[fileName];

        const text = "清理模块：" + (count++) + "\t" + fileName;
        console.log(text);
        window.setStatusBarMessage(text);
    }

    let depends = MOD_DEPENDS[fileName];
    if (depends) {
        delete MOD_DEPENDS[fileName];
        depends.forEach(file=>{
            cleanUp(file);
        });
    }

}

/** 文档保存时 */
workspace.onDidSaveTextDocument(function (event) {
    cleanUp(event.fileName);
});

const WATCH_FILES : any = {};

/** 监听文件变化 */
export function watchFile(file : string) {

    if (WATCH_FILES[file]) {return;}
        WATCH_FILES[file] = true;

    _watch(file, ()=>{
        // console.log("监听文件: ", file);
        cleanUp(file);  // 清理模块缓存
    });

}
