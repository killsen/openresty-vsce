
import { TextDocument, Position, ProviderResult, Hover, MarkdownString } from 'vscode';
import { getLuaTypeName } from './lua/types';
import { getDefineScope } from './lua/upValues';

/** 取得悬停提示 */
export function getHover(doc: TextDocument, pos: Position) : ProviderResult<Hover> {

    const defineScope = getDefineScope(doc, pos);
    if ( !defineScope ) { return; }
    const { scope, name } = defineScope;

    const docs = getHoverText(name, scope);
    return { contents : [ docs ] };

}

function getVarValue(v: unknown) {

    if (typeof v === "number" || typeof v === "boolean") {
        return ` = ${ v }`;

    } else if (typeof v === "string") {
        let s = v;
        if (s.length > 20) {
            s = s.substring(0, 20) + "...";
        }
        if (!s.includes('"')) {
            return ` = "${ s }"`;
        } else if (!s.includes("'")) {
            return ` = '${ s }'`;
        } else {
            return ` = [[${ s }]]`;
        }
    } else {
        return "";
    }

}

/** 取得提示内容 */
export function getHoverText(name: string, scope: any) : MarkdownString {

    const md = new MarkdownString();

    let t = scope[name];
    if (t === undefined) { t = scope["*"]; }
    if (t === undefined) { return md; }

    if (typeof t?.doc === "string" && t.doc.includes("##")) {
        return new MarkdownString(t?.doc);
    }

    const isGlobal = scope["$global"];
    const isParam  = scope["$param_" + name];
    const isLocal  = scope["$local_" + name];
    const isFunction = t?.type === "function" || (t && t["()"]);

    const docs = [ "```lua" ];

    if (isFunction) {
        const args = typeof t?.$argx === "string" && t?.$argx || t?.args || "()";
        docs.push(`function ${ name } ${ args }`);
    } else {
        let vt = scope["$type_" + name];
        let type = isFunction ? typeof t?.$argx === "string" ? t?.$argx : t?.args
                 : typeof t?.type  === "string" ? t?.type
                 : typeof vt?.type === "string" ? vt?.type
                 : getLuaTypeName(t);
        let pref = isFunction ? "function"
                 : isParam    ? "parameter"
                 : isLocal    ? "local"
                 : isGlobal   ? "global"
                 : "property";

        if (type === "lib" || type === "api") {
            type = "table";
        }

        if (type === "keyword") {
            docs.push(`(keyword) ${ name }`);
        } else {
            const vals = getVarValue(t);
            docs.push(`(${ pref }) ${ name }: ${ type }${ vals }`);
        }
    }

    docs.push("```");

    if (typeof t?.doc === "string") {
        docs.push(t?.doc);
    }

    // let contents = getContents(name, t);
    return new MarkdownString(docs.join("\n"));

}
