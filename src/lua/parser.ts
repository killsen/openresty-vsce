
import { Node, Statement } from 'luaparse';
import { LuaModule } from './types';
import { newScope, getType, getValue, setValue, setChild, LuaScope } from './scope';
import { callFunc, makeFunc, parseFuncDoc, setScopeCall } from './modFunc';
import { getItem, isDownScope, isInScope, findKeys } from './utils';
import { Range, Position } from 'vscode';

/** 执行代码块：并返回最后一个返回值 */
export function loadBody(body: Statement[], _g: LuaScope, resArgs: any[] = []) {

    if (!(_g instanceof Object)) { return; }

    let $$node = getValue(_g, "$$node");

    body.forEach(node=>{

        if ($$node && $$node.scope) {
            return; // 光标所在位置已找到，则退出
        }

        if ($$node && isDownScope(node, $$node)) {
            $$node = undefined;
            _g = newScope(_g);  // 光标下方代码：使用新的作用域
        }

        switch (node.type) {
            case "ReturnStatement":
                resArgs.push(loadNode(node, _g));
                break;

            case 'IfStatement':
                node.clauses.forEach(n => {
                    switch (n.type) {
                        case "IfClause":
                        case 'ElseifClause':
                            loadNode(n.condition, _g);
                            loadBody(n.body, newScope(_g), resArgs);
                            break;
                        case 'ElseClause':
                            loadBody(n.body, newScope(_g), resArgs);
                    }
                });
                break;

            case 'RepeatStatement':
            case 'WhileStatement':
                loadNode(node.condition, _g);
                loadBody(node.body, newScope(_g), resArgs);
                break;

            case 'DoStatement':
                loadBody(node.body, newScope(_g), resArgs);
                break;

            default:
                loadNode(node, _g);
                break;

        }

    });

    if (resArgs.length>0) {
        return resArgs[resArgs.length - 1]; // 最后的返回值
    }

}

/** 加载代码节点 */
export function loadNode(node: Node, _g: any): any {

    if (!(_g instanceof Object)) { return; }

    // 模块文件路径
    let $file = getValue(_g, "$file");

    // 光标所在位置
    let $$node = getValue(_g, "$$node");
    if ($$node && $$node.scope) {
        // return; // 光标所在位置已找到，则退出
    }

    // console.log("onCreateNode", node.type, node);

    // 赋值表达式
    if (node.type === "LocalStatement" || node.type === "AssignmentStatement") {

        // 是否本地变量
        let isLocal = (node.type === "LocalStatement");

        // 返回值（可能多个）
        let res: any[] = [];
        if (node.init.length === 1) {
            let r = loadNode(node.init[0], _g);
            if (r instanceof Array) {
                res = r;
            } else {
                res = [r];
            }
        } else if (node.init.length > 1) {
            res = node.init.map(n => {
                return loadNode(n, _g);
            });
        } else {
            res = [];
        }

        // 待赋值的变量名（可能多个）
        node.variables.forEach((n, i) => {
            switch (n.type) {
                case "Identifier":
                    if (n === $$node) {
                        $$node.scope = _g; // 找到光标所在的位置
                        return;  // 退出
                    }
                    setValue(_g, n.name, res[i], isLocal, n.loc); // local变量或者upvalue
                    break;

                case "MemberExpression": {
                    let k = n.identifier.name;
                    let t = loadNode(n.base, _g);

                    // 找到光标所在的位置
                    if (n.identifier === $$node) {
                        if (t instanceof Object) {
                            $$node.scope = t["."] || {};
                        } else {
                            $$node.scope = {};
                        }
                        return;  // 退出
                    }

                    if (res[i] instanceof Object && typeof res[i]["()"] === "function" ){
                        // 生成请求参数类型
                        let $$req = getValue(_g, "$$req");
                        if ($$req && $$req[k]) {res[i]["()"]["$$req"] = $$req[k];}

                        // 生成返回值类型 v21.11.25
                        let $$res = getValue(_g, "$$res");
                        if ($$res && $$res[k]) {res[i]["()"]["$$res"] = $$res[k];}
                    }

                    setChild(_g, t, n.indexer, k, res[i], n.identifier.loc);
                    break;
                }

                case "IndexExpression": {
                    let k = loadNode(n.index, _g);
                    let t = loadNode(n.base, _g);

                    if (typeof k !== "string") {return;}

                    let indexer = ".";

                    // 迭代器产生的 key 可能包含点号(.)或冒号(:)
                    if (k.startsWith(".")) {
                        indexer = ".";
                        k = k.substring(1);
                    } else if (k.startsWith(":")) {
                        indexer = ":";
                        k = k.substring(1);
                    }

                    setChild(_g, t, indexer, k, res[i], n.index.loc);
                    break;
                }

                default:
                    break;
            }
        });

        // local t = {}
        if (node.variables.length === 1 && node.variables[0].type === "Identifier" &&
            node.init.length === 1 && node.init[0].type === "TableConstructorExpression") {

            // { } 参数补全及提示
            if ($$node && $$node.scope) {
                let type = getType(_g, node.variables[0].name);
                if (type instanceof Object) {
                    setScopeCall(type["."], $$node, _g);
                }
            }
        }

        return;
    }

    switch (node.type) {

        // 返回语句:  return ...
        case "ReturnStatement":
            if (node.arguments.length > 1) {
                return node.arguments.map(n => {
                    return loadNode(n, _g);
                });
            } else if (node.arguments.length === 1) {
                return loadNode(node.arguments[0], _g);
            } else {
                return;
            }

        // 条件判断语句:  if (condition) then ... elseif (condition) then ... else ... end
        case 'IfStatement':
            node.clauses.forEach(n => {
                switch (n.type) {
                    case "IfClause":
                    case 'ElseifClause':
                        loadNode(n.condition, _g);
                        loadBody(n.body, newScope(_g));
                        break;
                    case 'ElseClause':
                        loadBody(n.body, newScope(_g));
                }
            });
            break;

        // 循环语句
        case 'RepeatStatement':  // repeat ... until (condition)
        case 'WhileStatement':   // while(condition) do ... end
            loadNode(node.condition, _g);
            loadBody(node.body, newScope(_g));
            break;

        // DO语句: do ... end
        case 'DoStatement':
            loadBody(node.body, newScope(_g));
            break;

        // FOR语句: for i=1, 100, 1 do ... end
        case 'ForNumericStatement': {
            let newG = newScope(_g);
            setValue(newG, node.variable.name, {}, true, node.variable.loc);
            loadNode(node.start, newG);
            loadNode(node.end, newG);
            node.step && loadNode(node.step, newG);
            loadBody(node.body, newG);
            break;
        }

        // FOR语句: for k, v in  pairs(t) do ... end
        //          for i, v in ipairs(t) do ... end
        case 'ForGenericStatement': {
            let newG = newScope(_g);
            let iter: Function | undefined; // 迭代函数

            node.iterators.forEach(n=>{
                let t = loadNode(n, newG);
                if (t instanceof Array) {
                    t.forEach(v => {
                        if (typeof v === "function") {
                            iter = v;
                        }
                    });
                } else if(typeof t === "function") {
                    iter = t;
                }
            });

            let runCount = 0;  // 运行次数

            if (iter) { // 迭代函数
                while(1){
                    let res = iter(); // 执行迭代函数
                    if (!(res instanceof Array)) {break;}
                    runCount++;
                    node.variables.forEach((v, i)=>{
                        setValue(newG, v.name, res[i], true, v.loc);
                    });
                    loadBody(node.body, newG);
                }
            }

            // 一次都没有运行，跑一次代码
            if (runCount === 0) {
                node.variables.forEach(v => {
                    setValue(newG, v.name, null, true, v.loc);
                });
                loadBody(node.body, newG);
            }

            break;
        }

        // 通过变量名取值
        case "Identifier": {
            if (node === $$node) {
                $$node.scope = _g; // 找到光标所在的位置
                return function() {
                    return { $$node }; // 返回当前节点
                };
            } else {
                return getValue(_g, node.name);
            }
        }

        case "NilLiteral": return node.value;       // null
        case "BooleanLiteral": return node.value;   // ture | false
        case "NumericLiteral": return node.value;   // 数字

        case "StringLiteral": { // 字符串
                let raw = node.raw;
                if (raw.startsWith("'") || raw.startsWith('"')) {
                    return raw.substring(1, raw.length-1);
                } else {
                    let index = raw.indexOf("[", 1) + 1;
                    return raw.substring(index, raw.length-index);
                }
            }

        // 逻辑运算符表达式: "or" | "and"
        case "LogicalExpression":
        {
            let left = loadNode(node.left, _g);
            let right = loadNode(node.right, _g);
            switch (node.operator) {
                case "and":  return right;
                case "or":   return left;
            }
            break;
        }

        // 二元运算符表达式: "+" | "-" | "*" | "%" | "^" | "/" | "//" | "&" | "|" | "~" |
        //                  "<<" | ">>" | ".." | "~=" | "=="  | "<" | "<=" | ">" | ">="
        case "BinaryExpression":
            loadNode(node.left, _g);
            loadNode(node.right, _g);
            break;

        // 一元运算符表达式: "not" | "-" | "~" | "#"
        case "UnaryExpression":
            loadNode (node.argument, _g);
            break;

        // 运行语句
        case "CallStatement":
            return loadNode(node.expression, _g);

        // 运行函数: func(a, b, c)
        case "CallExpression": {
            let funt = loadNode(node.base, _g);
            let argt = node.arguments.map((arg, i) => {

                // 参数提示
                if (typeof funt !== "function" && (funt instanceof Object) && $$node && isInScope(arg, $$node)) {
                    setValue(_g, "$$call", { args: funt.args, doc: funt.doc, index: i }, false);
                }

                let t = loadNode(arg, _g);
                if (t instanceof Array) {
                    return t[0];
                } else {
                    return t;
                }
            });

            return callFunc(funt, ...argt);
        }

        // 运行函数: func "abc"
        case "StringCallExpression": {
            let funt = loadNode(node.base, _g);
            let argt = loadNode(node.argument, _g);
            return callFunc(funt, argt);
        }

        // 运行函数 func { a=1, b=2, c=3 }
        case "TableCallExpression": {
            let funt = loadNode(node.base, _g);
            let argt = loadNode(node.arguments, _g);

            // { } 参数补全及提示
            if ($$node && $$node.scope && funt instanceof Object) {
                let keys = findKeys(argt, "$$node", $$node);
                if (keys) {
                    // console.log(keys);

                    // api 请求参数 req字段
                    if (funt.$req instanceof Object) {
                        let scope = getItem(funt.$req, keys);
                        setScopeCall(scope, $$node, _g);

                    // dao 请求参数：row字段
                    } else if (funt.$dao instanceof Object && funt.$dao.row instanceof Object) {
                        let scope = funt.$dao.row;
                        setScopeCall(scope, $$node, _g);

                    } else {
                        let func = funt["()"];
                        if (typeof func === "function") {
                            setValue(_g, "$$keys", keys, true);
                            func["$$gggg"] = _g;
                        }
                    }
                }
            }

            return callFunc(funt, argt);
        }

        // 函数定义
        case "FunctionDeclaration": {

            let isLocal = node.isLocal; // 是否本地变量

            let args = node.parameters.map(p => {
                switch (p.type) {
                    case "Identifier": return p.name;
                    case "VarargLiteral": return p.raw;
                }
            });

            let fun: any = {
                ["()"]: makeFunc(node, _g),  // 生成函数
                doc: parseFuncDoc(node, _g),  // 生成文档
                args: "(" + args.join(", ") + ")",
                "$file": $file,
                "$loc": node.loc,
            };

            // 为 apicheck 提供待运行的函数
            let funcs = getValue(_g, "$$funcs");
            if (funcs) {
                funcs.push(fun["()"]);
            }

            // 检查变量是否在函数定义作用内
            if ($$node && isInScope(node, $$node)) {
                setValue(_g, "$$func", fun["()"], false);
            }

            // 第一个参数是否 self
            let isSelfCall = args[0] === "self" || args[0] === "_";
            if (isSelfCall) {
                args.splice(0, 1);
                fun["selfCall"] = true;
                fun["selfArgs"] = "(" + args.join(", ") + ")";
            }

            let ni = node.identifier;
            if (ni) {
                switch (ni.type) {
                    case "Identifier":
                        setValue(_g, ni.name, fun, isLocal, ni.loc);  // local变量或者upvalue
                        return;

                    case "MemberExpression":
                    {
                        let k = ni.identifier.name;
                        let t = loadNode(ni.base, _g);

                        // 生成请求参数类型
                        let $$req = getValue(_g, "$$req");
                        if ($$req && $$req[k]) {fun["()"]["$$req"] = $$req[k];}

                        // 生成返回值类型 v21.11.25
                        let $$res = getValue(_g, "$$res");
                        if ($$res && $$res[k]) {fun["()"]["$$res"] = $$res[k];}

                        setChild(_g, t, ni.indexer, k, fun, ni.identifier.loc);
                        return;
                    }
                }
            }

            return fun;
        }

        // 索引表达式：中括号([])
        case "IndexExpression": {
            let t = loadNode(node.base, _g);
            let k = loadNode(node.index, _g);

            if (t instanceof Array) { t = t[0]; } // 返回的可能是数组

            if (t instanceof Object) {
                if (t["[]"]) {
                    return t["[]"];  // 数组
                }
                let ti = t["."] = t["."] || {};
                if (ti instanceof Object) {
                    return k in ti ? ti[k] : ti["*"];
                }
            }
        } break;

        // 成员变量表达式 object.key
        case "MemberExpression": {
            let k = node.identifier.name;
            let t = loadNode(node.base, _g);

            if (t instanceof Array) { t = t[0]; } // 返回的可能是数组

            // 找到光标所在的位置
            if (node.identifier === $$node) {
                if (t instanceof Object) {
                    $$node.scope = t[node.indexer] || {};
                } else {
                    $$node.scope = {};
                }
                return function() {};  // 返回空函数
            }

            if (t instanceof Object) {
                let ti = t[node.indexer];
                if (!(ti instanceof Object)) {
                    // ti = t[node.indexer] = {};
                    return;
                }

                let r = k in ti ? ti[k] : ti["*"];
                if (r === undefined && !(k in ti)) {

                    // 为 apicheck 提供成员字段检查
                    let lints = getValue(_g, "$$lints");
                    if (lints) {
                        let n = node.identifier as any;
                        if(!n["_linted_"]){
                            n["_linted_"] = true;
                            let start = n.loc!.start;
                            let end   = n.loc!.end;
                            lints.push({
                                range: new Range(
                                    new Position(start.line-1, start.column),
                                    new Position(end.line-1, end.column)
                                ),
                                message: `字段未定义 '${ k }'`,
                                severity: 1,
                            });
                        }
                    }
                }

                return r;
            }
        } break;

        // 对象或数组表达式 { a, b, c, k = v, [index] = value }
        case "TableConstructorExpression": {

            let t: LuaModule = { ".": {}, $file, $loc: node.loc };
            let i = 1; // 下标从1开始：跟Lua保持一致

            node.fields.forEach(f => {
                let v = loadNode(f.value, _g);
                if (v instanceof Array) { v = v[0]; } // 返回的可能是数组

                switch (f.type) {
                    case "TableKey":           // 索引表达式 { [k] = v }
                    {
                        let k = loadNode(f.key, _g);
                        if (k instanceof Array) { k = k[0]; } // 返回的可能是数组
                        if (typeof k === "string" || typeof k === "number") {
                            setChild(_g, t, ".", k, v, f.key.loc);
                        }
                        break;
                    }

                    case "TableKeyString":      // 对象表达式 { k = v }
                        setChild(_g, t, ".", f.key.name, v, f.key.loc);
                        break;

                    case "TableValue":          // 数组表达式 { a, b, c }
                        setChild(_g, t, ".", i++, v, f.loc);
                        break;
                }
            });

            return t;
        }

        default: // 默认返回
            return { ".": {}, $file, $loc: node.loc };
    }

}
