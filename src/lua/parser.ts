
import { Node, Statement, Comment } from 'luaparse';
import { LuaModule, LuaNumber, LuaString } from './types';
import { newScope, getType, getValue, setValue, setChild, LuaScope } from './scope';
import { callFunc, loadType, makeFunc, parseFuncDoc, setArgsCall, setScopeCall } from './modFunc';
import { getItem, isArray, isDownScope, isInScope, isNull, isObject, notNull } from './utils';
import { Range, Position, Diagnostic } from 'vscode';
import { _getn } from './libs/TableLib';

/** 执行代码块：并返回最后一个返回值 */
export function loadBody(body: Statement[], _g: LuaScope) {

    if (!(_g instanceof Object)) { return; }

    if(!getValue(_g, "$$return")) {
        setValue(_g, "$$return", [], true);  // 初始化返回值
    }

    // 光标所在位置
    let $$node: Node | undefined = getValue(_g, "$$node");

    body.forEach(node=>{

        if ($$node && $$node.scope) {
            return; // 光标所在位置已找到，则退出
        }

        if ($$node && isDownScope(node, $$node)) {
            $$node = undefined;
            _g = newScope(_g);  // 光标下方代码：使用新的作用域
        }

        try {
            loadNode(node, _g);
        } catch (e) {
            // console.log(e);
        }
    });

    return getReturn(_g);  // 获取返回值

}

/** 加载代码节点 */
export function loadNode(node: Node, _g: LuaScope): any {

    if (!(_g instanceof Object)) { return; }

    // 模块文件路径
    let $file = getValue(_g, "$file");

    // 光标所在位置
    let $$node: Node | undefined = getValue(_g, "$$node");
    if ($$node && $$node.scope) {
        return; // 光标所在位置已找到，则退出
    }

    // console.log("onCreateNode", node.type, node);

    // 仅声明本地变量未赋值: 默认值为null, 代表lua的<nil>值
    if (node.type === "LocalStatement" && node.init.length === 0) {
        node.variables.forEach(n => {
            setValue(_g, n.name, null, true, n.loc);
        });
        return;
    }

    // 赋值表达式
    if (node.type === "LocalStatement" || node.type === "AssignmentStatement") {

        // 是否本地变量
        const isLocal = (node.type === "LocalStatement");

        // local t = {}  --> @MyType
        const vtypeInLine = get_vtype_inline(node, _g);

        // -- @t : @MyType  //自定义类型
        // local t = { k=v, { k=v } }
        const vtypes = node.variables.map(n => get_vtype(n, _g));
        node.init.forEach((n, i) => {
            if (n.type === "TableConstructorExpression") {
                n.vtype = i === 0 && vtypeInLine || vtypes[i];  //关联类型
            }
        });

        // 返回值（可能多个）
        const res: any[] = [];
        node.init.forEach((n, i) => {
            const r = loadNode(n, _g);
            if (isArray(r)) {
                if (i === node.init.length - 1) {
                    res.push(...r);
                } else {
                    res.push(r[0]);
                }
            } else {
                res.push(r);
            }
        });

        // 待赋值的变量名（可能多个）
        node.variables.forEach((n, i) => {
            const v = i === 0 && vtypeInLine || res[i];

            switch (n.type) {
                case "Identifier": {
                    // 找到光标所在的位置
                    if ($$node === n) {
                        $$node.scope = _g;
                        return;  // 退出
                    }

                    // local变量或者upvalue
                    setValue(_g, n.name, v, isLocal, n.loc);
                    break;
                }

                case "MemberExpression": {
                    let k = n.identifier.name;
                    let t = loadNode(n.base, _g);

                    t = isArray(t) ? t[0] : t;

                    // 找到光标所在的位置
                    if ($$node === n.identifier) {
                        let ti = getItem(t, [n.indexer]);
                        let mt = getItem(t, ["$$mt", ".", "__index", n.indexer]);
                        $$node.scope = {
                            ... isObject(mt) ? mt : {},
                            ... isObject(ti) ? ti : {},
                        };
                        return;  // 退出
                    }

                    if (v instanceof Object && typeof v["()"] === "function" ){
                        // 生成请求参数类型
                        let $$req = getValue(_g, "$$req");
                        if ($$req && $$req[k]) {v["()"]["$$req"] = $$req[k];}

                        // 生成返回值类型 v21.11.25
                        let $$res = getValue(_g, "$$res");
                        if ($$res && $$res[k]) {v["()"]["$$res"] = $$res[k];}
                    }

                    setChild(_g, t, n.indexer, k, v, n.identifier.loc);
                    break;
                }

                case "IndexExpression": {
                    let k = loadNode(n.index, _g);
                    let t = loadNode(n.base, _g);

                    k = isArray(k) ? k[0] : k;
                    t = isArray(t) ? t[0] : t;

                    if (typeof k === "number") {k = String(k);}
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

                    setChild(_g, t, indexer, k, v, n.index.loc);
                    break;
                }

                default:
                    break;
            }
        });

        return;
    }

    switch (node.type) {

        // 返回语句:  return ...
        case "ReturnStatement": {
            const argt = node.arguments[0];
            if (argt && argt.type === "TableConstructorExpression") {
                argt.vtype = getType(_g, "return");  // 返回值类型
            }

            let $res;
            if (node.arguments.length > 1) {
                $res = node.arguments.map(n => loadNode(n, _g));
            } else if (node.arguments.length === 1) {
                $res = loadNode(argt, _g);
            }

            setReturn($res, _g);  // 设置返回值
            return $res;
        }

        // 条件判断语句:  if (condition) then ... elseif (condition) then ... else ... end
        case 'IfStatement': {
            let ok_res : any;

            for (let n of node.clauses) {
                switch (n.type) {
                    case "IfClause":
                    case 'ElseifClause': {
                        // 返回条件是否成立
                        let ok = loadNode(n.condition, _g);

                        let newG = newScope(_g);

                        // TODO: 【未完成】条件判断 type 类型推导
                        if (n.condition.type === "BinaryExpression") {
                            let { left, right, operator } = n.condition;
                            if (operator === "==" &&
                                left.type === "CallExpression" &&
                                left.base.type === "Identifier" &&
                                left.base.name === "type" &&
                                left.arguments.length === 1 &&
                                left.arguments[0].type === "Identifier" &&
                                right.type === "StringLiteral") {

                                let type = loadNode(right, _g);
                                if (type === "string") {
                                    let name = left.arguments[0].name;
                                    setValue(newG, name, LuaString, true, left.arguments[0].loc);
                                }
                            }
                        }

                        setValue(newG, "$$return", [], true);
                        let res = loadBody(n.body, newG);
                        setReturn(res, _g);

                        if (notNull(ok) && isNull(ok_res)) {
                            ok_res = res;  // 条件成立时的返回值
                        }
                        break;
                    }
                    case 'ElseClause':
                        loadBody(n.body, newScope(_g));
                }
            }

            if (notNull(ok_res)) {
                setReturn(ok_res, _g);  // 条件成立时的返回值
            }

        } break;

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

            // 找到光标所在的位置
            if ($$node === node) {
                $$node.scope = _g;
                return;  // 退出
            }

            return getValue(_g, node.name);
        }

        case "VarargLiteral": return getValue(_g, node.raw);  // ...
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
                case "or":   return (left===undefined || left===null || left===false) ? right : left;
            }
            break;
        }

        // 二元运算符表达式: "+" | "-" | "*" | "%" | "^" | "/" | "//" | "&" | "|" | "~" |
        //                  "<<" | ">>" | ".." | "~=" | "=="  | "<" | "<=" | ">" | ">="
        case "BinaryExpression": {
            let l = loadNode(node.left, _g);
            let r = loadNode(node.right, _g);
            let op = node.operator;

            switch (op) {
                case "..":
                    if (typeof l !== "string" && typeof l !== "number") {return LuaString;}
                    if (typeof r !== "string" && typeof r !== "number") {return LuaString;}
                    return `${ l }${ r }`;

                case "+": case "-": case "*": case "/": case "^": case "%":
                    if (typeof l !== "number" || typeof r !== "number") {return LuaNumber;}
                    return  op === "+" ? l + r :
                            op === "-" ? l - r :
                            op === "*" ? l * r :
                            op === "/" ? l / r :
                            op === "^" ? l ^ r :
                            op === "%" ? l % r : 0 ;

                case "==":
                    return l === r;

                case "~=":
                    return l !== r;

                case "<": case "<=": case ">": case ">=":
                    l = typeof l === "string" ? l : typeof l === "number" ? l : 0;
                    r = typeof r === "string" ? r : typeof r === "number" ? r : 0;
                    return  op === "<"  ? l <  r :
                            op === "<=" ? l <= r :
                            op === ">"  ? l >  r :
                            op === ">=" ? l >= r :  false;

                default:
                    return l || r;
            }
        }

        // 一元运算符表达式: "not" | "-" | "~" | "#"
        case "UnaryExpression": {
            let t = loadNode (node.argument, _g);
            t = isArray(t) ? t[0] : t;

            switch (node.operator) {
                case "not":
                    return t === false || t === null || t === undefined;

                case "-":
                    return typeof t !== "number" ? -t : LuaNumber;

                case "#":{
                    return _getn(t);  // 取得最大的连续数字索引
                }

                default:
                    return;
            }
        }

        // 运行语句
        case "CallStatement":
            return loadNode(node.expression, _g);

        // 运行函数: func(a, b, c)
        case "CallExpression": {
            let funt = loadNode(node.base, _g);
            if (!funt) {return;}

            let $$self;  // self:func(...)
            if (node.base.type === "MemberExpression" && node.base.indexer === ":") {
                $$self = loadNode(node.base.base, _g);
            }
            funt["$$self"] = $$self;

            let args: any[] = [];

            node.arguments.forEach((arg, i) => {

                // 参数提示
                if ($$node && isInScope(arg, $$node)) {
                    setArgsCall(funt, i, _g);
                }

                set_vtype(funt, arg, i);  // 形参类型

                let t = loadNode(arg, _g);
                if (t instanceof Array) {
                    if (arg.type === "VarargLiteral") {
                        args.push(...t);  // 可变参数全部传递 ...
                    } else {
                        args.push(t[0]);  // 返回数组传递第一项
                    }
                } else {
                    args.push(t);
                }
            });

            return callFunc(funt, ...args);
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
            if (!funt) {return;}

            set_vtype(funt, node.arguments);  // 形参类型

            let args = loadNode(node.arguments, _g);

            return callFunc(funt, args);
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

                        if (isArray(t)) { t = t[0]; } // 返回的可能是数组

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

        // 索引表达式：table[key]
        case "IndexExpression": {
            let k = loadNode(node.index, _g);
            let t = loadNode(node.base, _g);

            if (isArray(t)) { t = t[0]; } // 返回的可能是数组
            if (!isObject(t)) {return;}

            if ("[]" in t) {
                return t["[]"];  // 数组元素
            }

            let ti = getItem(t, ["."]);
            if (isObject(ti)) {
                if (k in ti) {return ti[k];}
                if ("*" in ti) {return ti["*"];}
            }

            let mt = getItem(t, ["$$mt", ".", "__index", "."]);
            if (isObject(mt)) {
                if (k in mt) {return mt[k];}
                if ("*" in mt) {return mt["*"];}
            } else {
                // __index 元方法
                let __index = getItem(t, ["$$mt", ".", "__index", "()"]);
                if (typeof __index === "function") {
                    let r = __index(t, k);
                    if (r instanceof Array) { r = r[0]; }
                    return r;
                }
            }

        } break;

        // 成员变量表达式 table.key | table:key
        case "MemberExpression": {
            let k = node.identifier.name;
            let t = loadNode(node.base, _g);

            if (isArray(t)) { t = t[0]; } // 返回的可能是数组

            // 字符串类型
            if (typeof t === "string" || t?.type === "string") {
                t = getValue(_g, "@string");
            }

            let ti = getItem(t, [node.indexer]);
            let mt = getItem(t, ["$$mt", ".", "__index", node.indexer]);

            // 找到光标所在的位置
            if ($$node === node.identifier) {
                $$node.scope = {
                    ... isObject(mt) ? mt : {},
                    ... isObject(ti) ? ti : {},
                };
                return;  // 退出
            }

            if (isObject(ti)) {
                if (k in ti) {return ti[k];}
                if ("*" in ti) {return ti["*"];}
            }

            if (isObject(mt)) {
                if (k in mt) {return mt[k];}
                if ("*" in mt) {return mt["*"];}
            } else {
                // __index 元方法
                let __index = getItem(t, ["$$mt", ".", "__index", "()"]);
                if (typeof __index === "function") {
                    let r = __index(t, k);
                    if (r instanceof Array) { r = r[0]; }
                    return r;
                }
            }

            if (isObject(ti) || isObject(mt)) {
                // 为 apicheck 提供成员字段检查
                addLint(node.identifier, k, _g);
            }

        } break;

        // 对象或数组表达式 { a, b, c, k = v, [index] = value }
        case "TableConstructorExpression": {

            let t: LuaModule = { ".": {}, $file, $loc: node.loc };
            let i = 1; // 下标从1开始：跟Lua保持一致

            node.fields.forEach((f, index) => {

                if (f.value.type === "TableConstructorExpression") {
                    if (f.type === "TableKeyString") {
                        f.value.vtype = getItem(node.vtype, [".", f.key.name]);  // 传递成员类型

                    } else if (f.type === "TableValue") {
                        f.value.vtype = getItem(node.vtype, ["[]"]);  // 传递数组成员类型

                    }
                }

                switch (f.type) {
                    case "TableKey":           // 索引表达式 { [k] = v }
                    {
                        let k = loadNode(f.key, _g);
                        if (k instanceof Array) { k = k[0]; } // 返回数组取第一项

                        let v = loadNode(f.value, _g);
                        if (v instanceof Array) { v = v[0]; } // 返回数组取第一项

                        if (typeof k === "string" || typeof k === "number") {
                            setChild(_g, t, ".", k, v, f.key.loc);
                        }
                        break;
                    }

                    case "TableKeyString":      // 对象表达式 { k = v }
                    {
                        let scope = getItem(node.vtype, ["."]);  // 成员类型字段
                        if (isObject(scope)) {
                            if (!(f.key.name in scope)) {
                                addLint(f.key, f.key.name, _g);  // 字段未定义
                            }
                        }

                        let v = loadNode(f.value, _g);
                        if (v instanceof Array) { v = v[0]; } // 返回数组取第一项

                        setChild(_g, t, ".", f.key.name, v, f.key.loc);
                        break;
                    }

                    case "TableValue":          // 数组表达式 { a, b, c }
                    {
                        // 找到光标所在位置
                        if ( f.value.type === "CallExpression" && f.value.base.isCursor ) {
                            let scope = getItem(node.vtype, ["."]);  // 成员类型字段
                            if (isObject(scope)) {
                                setScopeCall(scope, f.value.base, _g);  // 代码补全或跳转
                            }
                        }

                        let v = loadNode(f.value, _g);

                        if (v instanceof Array) {  // 返回是数组
                            if (index === node.fields.length - 1) {
                                v.forEach(item => {
                                    setChild(_g, t, ".", i++, item, f.loc);
                                });
                            } else {
                                v = v[0];  // 返回数组取第一项
                                setChild(_g, t, ".", i++, v, f.loc);
                            }
                        } else {
                            setChild(_g, t, ".", i++, v, f.loc);
                        }

                        break;
                    }
                }
            });

            return t;
        }

        default: // 默认返回
            return;
    }

}


// 设置返回值
function setReturn(val: any, _g: LuaScope) {
    if (val === null || val === undefined) {return;}
    const arr = getValue(_g, "$$return") as any[];
    if (!isArray(arr)) {return;}
    arr.push(val);
}

// 获取返回值
function getReturn(_g: LuaScope) {

    let arr = getValue(_g, "$$return") as any[];
    if (!isArray(arr) || arr.length === 0 ) {return;}

    if (arr.length === 1) {
        return arr[0];
    }

    // 对多个 return 语句的返回值进行排序: 优先选用复杂类型
    arr.sort((a: any, b: any) => {
        a = isArray(a) ? a[0]: a;
        b = isArray(a) ? b[0]: b;

        if (isObject(a) && !isObject(b)) {
            return 1;
        } else if (!isObject(a) && isObject(b)) {
            return -1;

        } else if (isObject(a) && isObject(b)) {
            // 都是对象: 优先选用有元表的类型
            let mta = getItem(a, ["$$mt"]);
            let mtb = getItem(b, ["$$mt"]);
            if (isObject(mta)) {
                return 1;
            } else if (isObject(mtb)) {
                return -1;
            } else {
                return 0;
            }

        } else {
            return 0;
        }
    });

    return arr[arr.length - 1]; // 最后的返回值

}


// 为 apicheck 提供成员字段检查
function addLint(n: Node, k: string, _g: LuaScope) {

    if (k.startsWith("_")) {return;}

    let lints = getValue(_g, "$$lints") as Diagnostic[];
    if(!lints) {return;}

    if (n.isLinted) {return;}
        n.isLinted = true;

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

function get_vtype_inline(n: Node, _g: LuaScope): any {

    let comments = getValue(_g, "$$comments") as Comment[];
    if (!comments) {return;}

    let c = comments.find(c => {
        return c.loc?.start.line === n.loc?.start.line;
    });

    if (c?.raw.startsWith("-->")) {
        console.log( c.raw );
        let typeName = c.raw.substring(3).trim();
        let t = loadType(typeName, _g);
        return t;
    }

}

// 获取参数类型
function get_vtype(n: Node, _g: LuaScope): any {

    if (n.type === "Identifier") {
        let t = getType(_g, n.name);
        if (t) { return t; }

        let v = getValue(_g, n.name);
        if (v?.readonly) { return v; }

    } else if (n.type === "MemberExpression") {
        const vtype = get_vtype(n.base, _g);
        if (vtype && vtype["type"] !== "any") {
            const t = vtype["."] || {};
            const k = n.identifier.name;
            if (!(k in t)) {
                addLint(n.identifier, k, _g);
            }
            return t[k] || {};
        }

    } else if (n.type === "IndexExpression") {
        const vtype = get_vtype(n.base, _g);
        if (vtype) {
            return vtype["[]"] || {};
        }
    }

}

const $dao_ext = {
    _order_by : { doc: "## _order_by \n\n `< string >` \n\n ### 排序 \n\n" },
    _group_by : { doc: "## _group_by \n\n `< string >` \n\n ### 汇总 \n\n" },
    _limit    : { doc: "## _limit    \n\n `< number | string >` \n\n ### 记录数 \n\n" },
};

// 设置形参类型
function set_vtype(funt: any, arg: Node, i = 0) {

    if (!funt) {return;}

    if (arg.type !== "TableConstructorExpression") {return;}

    if (i===0 && isObject(funt.$$req)) {
        // api 请求参数字段
        arg.vtype = funt.$$req;

    } else if (i===0 && isObject(funt.$dao) && isObject(funt.$dao.row)) {
        // dao 对象参数字段
        const row = funt.$dao.row;
        const doc = funt.doc || "" as string;

        if (/dao[:.](get|list)/g.test(doc)) {
            arg.vtype = {
                ["." ] : { ...row, ...$dao_ext },
                ["[]"] : { ".": {} },
            };
        }else if (/dao[:.](add|set)/g.test(doc)) {
            arg.vtype = {
                ["." ] : row,
                ["[]"] : { ".": row },
            };
        } else {
            arg.vtype = {
                ["." ] : row,
                ["[]"] : { ".": {} },
            };
        }

    } else {
        // 自定义类型参数字段
        let func = getItem(funt, ["()"]);
        if (func) {
            if (func.$argTypes) {
                arg.vtype = func.$argTypes[i];
            }
            return;
        }

        // 元表 __call 方法
        func = getItem(funt, ["$$mt", ".", "__call", "()"]);
        if (func) {
            if (func.$argTypes) {
                arg.vtype = func.$argTypes[i+1];  //参数向后位移一位哦！！
            }
        }
    }

}
