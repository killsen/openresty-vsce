"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printAst = void 0;
const astVisitor_1 = require("./astVisitor");
const lua = require("luaparse");
const vscode = require("vscode");
function printAst(code, range) {
    try {
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
        astVisitor_1.visitAST(chunk, {
            onEnterNode(node) {
                step++;
            },
            onExitNode(node) {
                step--;
            },
            onVisitNode(node) {
                let loc = node.loc;
                if (loc && range) {
                    let start = new vscode.Position(loc.start.line - 1, loc.start.column);
                    let end = new vscode.Position(loc.end.line - 1, loc.end.column);
                    let nodeRange = new vscode.Range(start, end);
                    if (nodeRange.isEqual(range)) {
                        console.log("node found:", node);
                    }
                }
                console.log(" ".repeat(step * 4) + node.type);
            },
        });
    }
    catch (e) {
        console.log(e);
    }
}
exports.printAst = printAst;
//# sourceMappingURL=astPrint.js.map