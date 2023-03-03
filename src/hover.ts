
import { TextDocument, Position } from 'vscode';
import { getDefineScope } from './lua/upValues';

/** 取得悬停提示 */
export function getHover(doc: TextDocument, pos: Position) {

    const defineScope = getDefineScope(doc, pos);
    if ( !defineScope ) { return; }
    const { scope, name } = defineScope;

    let t = scope[name];
    if (t === undefined) { t = scope["*"]; }
    if (t === undefined) { return; }

    let contents = getContents(name, t);
    return { contents };

}

/** 取得提示内容 */
export function getContents(name: string, t: any) : string[] {

    if (t instanceof Object) {
        if (t.type === "lib" || t.type === "api") {return [t.doc];}

        let doc: string = typeof t.doc === "string" ? t.doc : "";
        let docs: string[] = [];

        if (typeof t.type === "string" && t.type !== "table" && !doc) {
            doc = `${ name } : \`${ t.type }\``;  // 提示变量类型
            return [ doc ];
        }

        if (doc.includes("{{name}}")) {
            doc = doc.replace("{{name}}", name);  // 替换函数名
            return [ doc ];
        }

        if (doc.includes("\n")) {
            return [ doc ];
        }

        doc = funcToDoc(name, t) || "";
        if (doc) {
            docs.push(doc);
        } else {
            docs.push("## " + name);
        }

        doc = objectToDoc(name + " . ", t["."]) || "";
        doc && docs.push(doc);

        doc = objectToDoc(name + " : ", t[":"]) || "";
        doc && docs.push(doc);

        return docs;

    } else {

        if (t === null) {
            t = "nil";
        } else if (t === undefined) {
            t = "any";

        } else if (typeof t === "string") {
            if (t.length > 20) {
                t = t.substring(0, 20) + "...";
            }
            if (!t.includes('"')) {
                t = `"${ t }"`;
            } else if (!t.includes("'")) {
                t = `'${ t }'`;
            } else {
                t = `[[${ t }]]`;
            }
        }

        return [`${ name } = \`${ t }\``];

    }

}

function funcToDoc(name: string, t: any){

    if (!(t instanceof Object)) {return;}

    let docs : string[] = [];

    if (t.args || typeof t["()"] === "function") {
        let args = t.args || "()";
        let doc = "### " + name + " " + args;
        docs.push(doc);

        let resArgs: string = t.resArgs;
        if (typeof resArgs === "string" && resArgs) {
            docs.push("返回值：");
            resArgs.split("\n").forEach(s=>{
                s = "* " + s;
                if (!docs.includes(s)) {docs.push(s);}
            });
        }
    }

    return docs.join("\n");

}

function objectToDoc(name: string, t: any) {

    if (!(t instanceof Object)) {return;}

    let docs: string[] = [];

    Object.keys(t).forEach(k=>{
        if (k.startsWith("$")) {return;}
        let v = t[k];
        if (v instanceof Object) {
            if (v.args || typeof v["()"] === "function") {
                let args = v.args || "()";
                return docs.push("* " + name + k + " " + args);
            }
        }

        docs.push("* " + name + k);
    });

    return docs.join("\n");

}
