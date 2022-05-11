

import { visitAST } from "./astVisitor";
import * as lua from "luaparse";
import * as vscode from 'vscode';

export function printAst(code: string, range?: vscode.Range) {

    try{

        let chunk = lua.parse(code, {
            wait: false,
            comments: true,
            scope: true,
            locations: true,
            ranges: true,
            extendedIdentifiers: false,
            luaVersion: 'LuaJIT'
        });

        console.log(chunk);
        console.log(range);

        let step = 0;

        visitAST(chunk, {
            onEnterNode(node: lua.Node) {
                step++;
            },
            onExitNode(node: lua.Node) {
                step--;
            },
            onVisitNode(node: lua.Node) {
                let loc = node.loc;
                if (loc && range) {
                    let start = new vscode.Position(loc.start.line-1, loc.start.column);
                    let end = new vscode.Position(loc.end.line-1, loc.end.column);
                    let nodeRange = new vscode.Range(start, end);
                    if (nodeRange.isEqual(range)) {
                        console.log("node found:", node);
                    }
                }
                console.log(" ".repeat(step * 4) + node.type);
            },
        });

    }catch(e){
        console.log(e);
    }

}
