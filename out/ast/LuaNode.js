"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LuaFunction = exports.LuaTable = exports.LuaBoolean = exports.LuaNumber = exports.LuaString = exports.LuaVariable = exports.LuaScope = void 0;
const astVisitor_1 = require("./astVisitor");
class LuaScope {
    // 构造函数
    constructor(node) {
        this.locals = [];
        console.log(node);
        this.node = node;
        let step = 0;
        astVisitor_1.visitAST(this.node, {
            onEnterNode(node) {
                step++;
                // console.log("onEnterNode", node.type);
            },
            onExitNode(node) {
                step--;
                // console.log("onExitNode", node.type);
            },
            onVisitNode(node) {
                console.log(" ".repeat(step * 4) + node.type);
                // console.log("onVisitNode", node.type);
            },
        });
    }
}
exports.LuaScope = LuaScope;
class LuaVariable {
    // 构造函数
    constructor(node) {
        this.name = "";
        this.doc = "";
        this.type = "any";
        this.node = node;
    }
}
exports.LuaVariable = LuaVariable;
class LuaString {
    constructor(node) {
        this.node = node;
        this.value = node.value;
    }
}
exports.LuaString = LuaString;
class LuaNumber {
    constructor(node) {
        this.node = node;
        this.value = node.value;
    }
}
exports.LuaNumber = LuaNumber;
class LuaBoolean {
    constructor(node) {
        this.node = node;
        this.value = node.value;
    }
}
exports.LuaBoolean = LuaBoolean;
class LuaTable {
    constructor(node) {
        this.node = node;
        this.value = {};
    }
}
exports.LuaTable = LuaTable;
class LuaFunction {
    constructor(node) {
        this.args = "";
        this.selfCall = false;
        this.selfArgs = "";
        this.resArgs = "";
        this.node = node;
    }
}
exports.LuaFunction = LuaFunction;
//# sourceMappingURL=LuaNode.js.map