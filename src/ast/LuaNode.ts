
import * as lua from 'luaparse';
import { visitAST } from './astVisitor';

export class LuaScope {
    global?: LuaScope;
    locals: LuaVariable[] = [];
    node: lua.Node;

    // 构造函数
    constructor(node: lua.Node) {
        console.log(node);
        this.node = node;
        let step = 0;

        visitAST(this.node, {
            onEnterNode(node: lua.Node) {
                step++;
                // console.log("onEnterNode", node.type);
            },
            onExitNode(node: lua.Node) {
                step--;
                // console.log("onExitNode", node.type);
            },
            onVisitNode(node: lua.Node) {
                console.log(" ".repeat(step*4)+ node.type);
                // console.log("onVisitNode", node.type);
            },
        });

    }

}

export class LuaVariable {

    name: string = "";
    doc: string = "";
    type: string = "any";
    node: lua.Node;

    value?: LuaString | LuaNumber | LuaTable | LuaFunction;

    // 构造函数
    constructor(node: lua.Node) {
        this.node = node;
    }

}

export class LuaString {
    node: lua.StringLiteral;
    value: string;
    constructor(node: lua.StringLiteral) {
        this.node = node;
        this.value = node.value;
    }
}

export class LuaNumber {
    node: lua.NumericLiteral;
    value: number;
    constructor(node: lua.NumericLiteral) {
        this.node = node;
        this.value = node.value;
    }
}

export class LuaBoolean {
    node: lua.BooleanLiteral;
    value: boolean;
    constructor(node: lua.BooleanLiteral) {
        this.node = node;
        this.value = node.value;
    }
}

export class LuaTable {
    node: lua.TableConstructorExpression;
    value: { [key: string]: LuaString | LuaNumber | LuaTable | LuaFunction | LuaVariable };

    constructor(node: lua.TableConstructorExpression) {
        this.node = node;
        this.value = {};
    }
}

export class LuaFunction {

    node: lua.FunctionDeclaration;

    args: string = "";
    selfCall: boolean = false;
    selfArgs: string = "";
    resArgs: string = "";

    constructor(node: lua.FunctionDeclaration) {
        this.node = node;
    }

}
