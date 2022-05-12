
import * as ngx from './lua/ngx';
import { getDefine } from './lua/upValues';
import { LocationLink, Uri, Range, TextDocument, Position, CancellationToken } from 'vscode';
import { loadModuleByCode } from './lua/modLoader';
import { isObject } from './lua/utils';

/** 取得文件链接 */
export function getFileLink(doc: TextDocument, pos: Position, tok: CancellationToken) {

    let path = ngx.getPath(doc.fileName);
    if (!path) {return;}

    let links = getModLink(doc, pos, [ /[$](\w+\.)*\w+/ ]) ||
                getModLink(doc, pos, [ /['"]?[%#](\w+\.)*\w+(\[\])?['"]?/, /[%#](\w+\.)*\w+/ ]) ||
                getModLink(doc, pos, [ /\b(_load|require)\s*\,?\s*\(?\s*["']\S+["']\s*\)?/, /(\w+\.)*\w+/ ]);
    if (links) {return links;}

    return getDefineLink(doc, pos);

}

/** 取得模块链接 */
function getModLink(doc: TextDocument, pos: Position, regexList: RegExp[]) {

    let path = ngx.getPath(doc.fileName);
    if (!path) {return;}

    let range;
    for (let regex of regexList) {
        range = doc.getWordRangeAtPosition(pos, regex);
        if (!range) {return;}
    }
    if (!range) {return;}     //不匹配则退出

    let text = doc.getText(range);
    let file = ngx.getModFile(path, text);

    if (!file) {return [];}   //文件不存在则返回空数组

    let link: LocationLink = {
        originSelectionRange: range,
        targetUri: Uri.file(file),
        targetRange: new Range(new Position(0, 0), new Position(0, 0)),
    };
    return [link];

}

/** 取得链接文本 */
export function getLinkText(doc: TextDocument, pos: Position, regx1: RegExp, regx2: RegExp, regx0?: RegExp) {

    let path = ngx.getPath(doc.fileName);
    if (!path) {return;}

    if (regx0) {
        let r0 = doc.getWordRangeAtPosition(pos, regx0);
        if (!r0) { return; }
    }

    let r1 = doc.getWordRangeAtPosition(pos, regx1);
    if (!r1) { return; }

    let r2 = doc.getWordRangeAtPosition(pos, regx2);
    if (!r2) { return; }

    let range: Range;
    if (r1.isEqual(r2)) {
        range = r1;
    } else if (r1.contains(r2)) {
        range = new Range(r1.start, r2.end);
    } else {
        return;
    }

    return doc.getText(range);

}

/** 取得变量链接 */
function getDefineLink(doc: TextDocument, pos: Position) {

    let path = ngx.getPath(doc.fileName);
    if (!path) {return;}

    let t: any;

    // 自定义类型跳转 "@OrderInfo"
    let rangeSel = doc.getWordRangeAtPosition(pos, /[@]\w+/);
    if (rangeSel) {
        let text = doc.getText(rangeSel).replace("@", "");
        let key  = "$" + text + "$";
        let mod  = loadModuleByCode(path, doc.getText());
        let types = mod && mod["$types"] as any;
        t = types && types[key];
    } else {
        t = getDefine(doc, pos);
    }

    if (!isObject(t)) {return;}

    let file = t['$file'];
    if (typeof file === "string") {
        // 当前编辑中的文件
        if (file.endsWith(".editing")) {file = "";}
    }else{
        file = "";
    }

    let loc = t['$loc'];

    if (!file && !loc) {return;}

    let targetRange = loc && new Range(
        new Position(loc['start']['line'] - 1, loc['start']['column']),
        new Position(loc['end']['line'] - 1, loc['end']['column'])
    ) || new Range(
        new Position(0, 0),
        new Position(0, 0),
    );

    let link: LocationLink = {
        originSelectionRange: rangeSel,
        targetUri: Uri.file(file || doc.fileName),
        targetRange,
    };
    return [link];

}
