
import {
    // workspace,
    TextDocument, CancellationToken,
    DocumentSymbol, SymbolKind, Position, Range
} from 'vscode';

import {
    parse as luaparse, Node, Identifier,
    FunctionDeclaration, MemberExpression
} from "luaparse";

const DOC_SYMBOLS : {
    [key: string]: DocumentSymbol[];
} = {};

// const DOC_SAVED : {
//     [key: string] : boolean;
// } = {};

// /** 文档保存时 */
// workspace.onDidSaveTextDocument(function (event) {
//     console.log("onDidSaveTextDocument");
//     let fileName = event.fileName;
//     if (DOC_SYMBOLS[fileName]) {
//         DOC_SAVED[fileName] = true;
//     }
// });

/** 生成文档大纲 */
export function loadDocSymbols(doc: TextDocument, tok: CancellationToken) {

    let fileName = doc.fileName;
    let symbols: DocumentSymbol[] = [];
    let code = doc.getText();

    try {
        let chunk = luaparse(code, {
            wait: false,
            comments: false,
            scope: false,
            locations: true,
            ranges: false,
            extendedIdentifiers: false,
            luaVersion: 'LuaJIT'
        });

        chunk.body.forEach(node=>{
            switch (node.type) {
                case "FunctionDeclaration":
                    if (!node.identifier) { return; }
                    switch (node.identifier.type) {
                        case "Identifier": {
                            let args = genArgs(node);
                            let symbol = funcToSymbol(node.identifier, node, args);
                                symbol && symbols.push(symbol);
                            }
                            break;

                        case "MemberExpression": {
                            let args = genArgs(node);
                            let symbol = memberToSymbol(node.identifier, node, args);
                                symbol && symbols.push(symbol);
                            }
                            break;
                    }
                    break;

                case "LocalStatement":
                case "AssignmentStatement":
                    if (node.variables.length !== 1) { return; }
                    if (node.init.length !== 1) { return; }
                    if (node.init[0].type !== "FunctionDeclaration" ) { return; }

                    let varNode = node.variables[0];
                    switch (varNode.type) {
                        case "Identifier": {
                            let args = genArgs(node.init[0]);
                            let symbol = funcToSymbol(varNode, node, args);
                                symbol && symbols.push(symbol);
                            }
                            break;

                        case "MemberExpression": {
                            let args = genArgs(node.init[0]);
                            let symbol = memberToSymbol(varNode, node, args);
                                symbol && symbols.push(symbol);
                            }
                            break;
                    }

                default:
                    break;
            }
        });

    } catch (err) {
        if (err instanceof SyntaxError) {
            // console.log(err.message.split("\n")[0]);
        }
        return DOC_SYMBOLS[fileName];
    }

    DOC_SYMBOLS[fileName] = symbols;

    return symbols;

}

function genArgs(node: FunctionDeclaration) {

    return node.parameters.map(p=>{
        switch (p.type) {
            case "Identifier":  return p.name;
            case "VarargLiteral":   return p.raw;
        }
    }).join(", ");

}

function memberToSymbol(node: MemberExpression, nodeFunc: Node, args: string) {

    let base = node.base;
    if (base.type !== "Identifier" ) { return; }

    let name = base.name + " " + node.indexer + " " + node.identifier.name + " ( " + args + " )";
    let selectionRange = nodeToRange(node);

    let fullRange = nodeToRange(nodeFunc);
    if (!fullRange || !selectionRange) { return; }

    return new DocumentSymbol(name, "", SymbolKind.Function, fullRange, selectionRange);

}

function funcToSymbol(node: Identifier, nodeFunc: Node, args: string) {

    let name = node.name + " ( " + args + " )";
    let selectionRange = nodeToRange(node);
    let fullRange = nodeToRange(nodeFunc);
    if (!fullRange || !selectionRange) { return; }

    return new DocumentSymbol(name, "", SymbolKind.Function, fullRange, selectionRange);

}

function nodeToRange(node: Node) {

    let loc = node.loc;
    if (!loc) { return; }

    let start = new Position(loc.start.line-1, loc.start.column);
    let end = new Position(loc.end.line - 1, loc.end.column);
    return new Range(start, end);

}
