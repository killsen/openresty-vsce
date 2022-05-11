"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchFile = exports.cleanUp = exports.setDepend = exports.setModCache = exports.getModCache = void 0;
const vscode_1 = require("vscode");
const fs_1 = require("fs");
// 模块缓存
const MOD_LOADED = {};
// 引用关系
const MOD_DEPENDS = {};
/** 取得模块缓存 */
function getModCache(fileName) {
    return MOD_LOADED[fileName];
}
exports.getModCache = getModCache;
/** 更新模块缓存 */
function setModCache(fileName, mod) {
    // 直接覆盖
    MOD_LOADED[fileName] = mod;
    // let oldMod: any = MOD_LOADED[fileName];
    // let newMod: any = mod;
    // if (oldMod) {
    //     Object.keys(oldMod).forEach(k=>{
    //         delete oldMod[k];
    //     });
    //     Object.keys(newMod).forEach(k=>{
    //         oldMod[k] = newMod[k];
    //     });
    // } else {
    //     MOD_LOADED[fileName] = newMod;
    // }
}
exports.setModCache = setModCache;
/** 设置模块引用关系 */
function setDepend(fileName, dependFile) {
    if (fileName === dependFile)
        return;
    MOD_DEPENDS[dependFile] = MOD_DEPENDS[dependFile] || [];
    MOD_DEPENDS[dependFile].push(fileName);
}
exports.setDepend = setDepend;
let count = 1; // 清理次数
/** 清理模块缓存 */
function cleanUp(fileName) {
    let mod = MOD_LOADED[fileName];
    if (mod) {
        delete MOD_LOADED[fileName];
        const text = "清理模块：" + (count++) + "\t" + fileName;
        console.log(text);
        vscode_1.window.setStatusBarMessage(text);
    }
    let depends = MOD_DEPENDS[fileName];
    if (depends) {
        delete MOD_DEPENDS[fileName];
        depends.forEach(file => {
            cleanUp(file);
        });
    }
}
exports.cleanUp = cleanUp;
/** 文档保存时 */
vscode_1.workspace.onDidSaveTextDocument(function (event) {
    cleanUp(event.fileName);
});
const WATCH_FILES = {};
/** 监听文件变化 */
function watchFile(file) {
    if (WATCH_FILES[file])
        return;
    WATCH_FILES[file] = true;
    fs_1.watch(file, () => {
        // console.log("监听文件: ", file);
        cleanUp(file); // 清理模块缓存
    });
}
exports.watchFile = watchFile;
//# sourceMappingURL=modCache.js.map