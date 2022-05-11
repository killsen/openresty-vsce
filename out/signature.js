"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignature = void 0;
const vscode_1 = require("vscode");
const upValues_1 = require("./lua/upValues");
/** 取得参数提示 */
function getSignature(doc, pos, tok, ctx) {
    // console.log("getSignature");
    let scope = upValues_1.getUpValues(doc, pos);
    if (!scope)
        return;
    let t = scope["$$call"];
    if (!(t instanceof Object))
        return;
    if (!t.args || t.args === "()")
        return;
    let index = t.index || 0;
    let args = t.args || "";
    const help = new vscode_1.SignatureHelp();
    const info = new vscode_1.SignatureInformation(args);
    if (args.startsWith("(")) {
        let arr = args.replace(/[\(\)\s]/g, "").split(",");
        info.parameters = arr.map(s => {
            return new vscode_1.ParameterInformation(s);
        });
    }
    else {
        info.parameters = [];
    }
    help.signatures = [info];
    help.activeSignature = 0;
    help.activeParameter = index;
    return help;
}
exports.getSignature = getSignature;
//# sourceMappingURL=signature.js.map