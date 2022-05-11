

import { visitAST } from "./astVisitor";
import * as lua from "luaparse";
import * as vscode from 'vscode';

export function findNode(code: string, range: vscode.Range): lua.Node | undefined {

    let nodeFound: lua.Node | undefined;

    try {

        let chunk = lua.parse(code, {
            wait: false,
            comments: false,
            scope: false,
            locations: true,
            ranges: false,
            extendedIdentifiers: false,
            luaVersion: 'LuaJIT'
        });

        // console.log(chunk);
        // console.log(range);

        let step = 0;

        visitAST(chunk, {
            onEnterNode(node: lua.Node) {
                step++;
            },
            onExitNode(node: lua.Node) {
                step--;
            },
            onVisitNode(node: lua.Node) {
                if (nodeFound) {return;}
                // console.log(" ".repeat(step * 4) + node.type);
                let loc = node.loc;
                if (loc && range) {
                    let start = new vscode.Position(loc.start.line - 1, loc.start.column);
                    let end = new vscode.Position(loc.end.line - 1, loc.end.column);
                    let nodeRange = new vscode.Range(start, end);
                    if (nodeRange.isEqual(range)) {
                        nodeFound = node;
                        // console.log("node found:", node);
                    }
                }
            },
        });

    } catch (e) {
        // console.log(e);
    }

    return nodeFound;

}
