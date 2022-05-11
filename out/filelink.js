"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkText = exports.getFileLink = void 0;
const ngx = require("./lua/ngx");
const upValues_1 = require("./lua/upValues");
const vscode_1 = require("vscode");
const modLoader_1 = require("./lua/modLoader");
const utils_1 = require("./lua/utils");
/** 取得文件链接 */
function getFileLink(doc, pos, tok) {
    let path = ngx.getPath(doc.fileName);
    if (!path)
        return;
    let links = getModLink(doc, pos, [/[$](\w+\.)*\w+/]) ||
        getModLink(doc, pos, [/['"]?[%#](\w+\.)*\w+(\[\])?['"]?/, /[%#](\w+\.)*\w+/]) ||
        getModLink(doc, pos, [/\b(_load|require)\s*\,?\s*\(?\s*["']\S+["']\s*\)?/, /(\w+\.)*\w+/]);
    if (links)
        return links;
    return getDefineLink(doc, pos);
}
exports.getFileLink = getFileLink;
/** 取得模块链接 */
function getModLink(doc, pos, regexList) {
    let path = ngx.getPath(doc.fileName);
    if (!path)
        return;
    let range;
    for (let regex of regexList) {
        range = doc.getWordRangeAtPosition(pos, regex);
        if (!range)
            return;
    }
    if (!range)
        return; //不匹配则退出
    let text = doc.getText(range);
    let file = ngx.getModFile(path, text);
    if (!file)
        return []; //文件不存在则返回空数组
    let link = {
        originSelectionRange: range,
        targetUri: vscode_1.Uri.file(file),
        targetRange: new vscode_1.Range(new vscode_1.Position(0, 0), new vscode_1.Position(0, 0)),
    };
    return [link];
}
/** 取得链接文本 */
function getLinkText(doc, pos, regx1, regx2, regx0) {
    let path = ngx.getPath(doc.fileName);
    if (!path)
        return;
    if (regx0) {
        let r0 = doc.getWordRangeAtPosition(pos, regx0);
        if (!r0) {
            return;
        }
    }
    let r1 = doc.getWordRangeAtPosition(pos, regx1);
    if (!r1) {
        return;
    }
    let r2 = doc.getWordRangeAtPosition(pos, regx2);
    if (!r2) {
        return;
    }
    let range;
    if (r1.isEqual(r2)) {
        range = r1;
    }
    else if (r1.contains(r2)) {
        range = new vscode_1.Range(r1.start, r2.end);
    }
    else {
        return;
    }
    return doc.getText(range);
}
exports.getLinkText = getLinkText;
/** 取得变量链接 */
function getDefineLink(doc, pos) {
    let path = ngx.getPath(doc.fileName);
    if (!path)
        return;
    let t;
    // 自定义类型跳转 "@OrderInfo"
    let rangeSel = doc.getWordRangeAtPosition(pos, /[@]\w+/);
    if (rangeSel) {
        let text = doc.getText(rangeSel).replace("@", "");
        let key = "$" + text + "$";
        let mod = modLoader_1.loadModuleByCode(path, doc.getText());
        let types = mod && mod["$types"];
        t = types && types[key];
    }
    else {
        t = upValues_1.getDefine(doc, pos);
    }
    if (!utils_1.isObject(t))
        return;
    let file = t['$file'];
    if (typeof file === "string") {
        // 当前编辑中的文件
        if (file.endsWith(".editing"))
            file = "";
    }
    else {
        file = "";
    }
    let loc = t['$loc'];
    if (!file && !loc)
        return;
    let targetRange = loc && new vscode_1.Range(new vscode_1.Position(loc['start']['line'] - 1, loc['start']['column']), new vscode_1.Position(loc['end']['line'] - 1, loc['end']['column'])) || new vscode_1.Range(new vscode_1.Position(0, 0), new vscode_1.Position(0, 0));
    let link = {
        originSelectionRange: rangeSel,
        targetUri: vscode_1.Uri.file(file || doc.fileName),
        targetRange,
    };
    return [link];
}
//# sourceMappingURL=filelink.js.map