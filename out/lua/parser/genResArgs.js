"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genResArgs = void 0;
function genResArg(node) {
    return node.arguments.map(n => {
        switch (n.type) {
            case "Identifier": return n.name;
            case "StringLiteral": return n.raw;
            case "NilLiteral": return n.raw;
            case "BooleanLiteral": return n.raw;
            case "NumericLiteral": return n.raw;
            case "TableConstructorExpression": {
                let args = n.fields.map(f => {
                    switch (f.type) {
                        case "TableKey": return "[]";
                        case "TableKeyString": return f.key.name;
                        case "TableValue": return "{}";
                    }
                }).join(", ");
                return "table { " + args + "} ";
            }
            case "FunctionDeclaration": {
                let args = n.parameters.map(p => {
                    switch (p.type) {
                        case "Identifier": return p.name;
                        case "VarargLiteral": return p.raw;
                    }
                }).join(", ");
                return "function ( " + args + " )";
            }
            default: return "any";
        }
    }).join(", ");
}
/** 生成返回语句 */
function genResArgs(body, resArgs) {
    resArgs = resArgs || [];
    for (let i = 0; i < body.length; i++) {
        let node = body[i];
        switch (node.type) {
            case "ReturnStatement":
                let res = genResArg(node);
                if (res) {
                    res = "-> " + res;
                    if (!resArgs.includes(res))
                        resArgs.push(res);
                }
                break;
            case 'IfStatement':
                node.clauses.forEach(n => {
                    genResArgs(n.body, resArgs);
                });
                break;
            case 'RepeatStatement':
            case 'WhileStatement':
            case 'ForGenericStatement':
            case 'ForNumericStatement':
            case 'DoStatement':
                genResArgs(node.body, resArgs);
                break;
            default:
                break;
        }
    }
    return resArgs.join("\n");
}
exports.genResArgs = genResArgs;
//# sourceMappingURL=genResArgs.js.map