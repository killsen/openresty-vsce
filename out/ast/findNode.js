"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNode = void 0;
const astVisitor_1 = require("./astVisitor");
const lua = require("luaparse");
const vscode = require("vscode");
function findNode(code, range) {
    let nodeFound;
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
        astVisitor_1.visitAST(chunk, {
            onEnterNode(node) {
                step++;
            },
            onExitNode(node) {
                step--;
            },
            onVisitNode(node) {
                if (nodeFound) {
                    return;
                }
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
    }
    catch (e) {
        // console.log(e);
    }
    return nodeFound;
}
exports.findNode = findNode;
//# sourceMappingURL=findNode.js.map