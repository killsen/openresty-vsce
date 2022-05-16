
import { TextDocument, Position, CancellationToken,  MarkdownString, SignatureHelpTriggerKind,
    SignatureHelpContext, SignatureHelp, SignatureInformation, ParameterInformation } from 'vscode';
import { getUpValues } from './lua/upValues';

/** 取得参数提示 */
export function getSignature(doc: TextDocument, pos: Position, tok: CancellationToken, ctx: SignatureHelpContext) {

    // console.log("getSignature");

    let scope = getUpValues(doc, pos);
    if (!scope) {return;}

    let t = scope ["$$call"];
    if (!(t instanceof Object)) {return;}
    if (!t.args || t.args==="()") {return;}

    let index = t.index || 0;
    let args: string = t.args || "";

    const help = new SignatureHelp();
    const info = new SignatureInformation(args);

    if (args.startsWith("(")) {
        let arr = args.replace(/[()\s]/g, "").split(",");
        info.parameters = arr.map(s=>{
            return new ParameterInformation(s);
        });
    } else {
        info.parameters = [];
    }

    help.signatures = [info];
    help.activeSignature = 0;
    help.activeParameter = index;

    return help;

}
