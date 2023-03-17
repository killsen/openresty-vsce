
import { Node, Statement, Comment } from 'luaparse';
import { getLuaTypeName, LuaAny, LuaCData, LuaModule, LuaNumber, LuaString } from './types';
import { newScope, getType, getValue, setValue, setChild, LuaScope, setValueTyped } from './scope';
import { callFunc, makeFunc, makeNormalCallFunc, makeSelfCallFunc, setArgsCall, setScopeCall } from './modFunc';
import { getItem, isArray, isDownScope, isInScope, isNil, isFalse, isObject, isTrue } from './utils';
import { addLint, check_vtype, get_node_vtype, get_vtype_inline, loadType, set_arg_vtype } from './vtype';
import { _getn } from './libs/TableLib';
import { maybeTypes } from './vtypeif';

/** 执行代码块：并返回最后一个返回值 */
export function loadBody(body: Statement[], _g: LuaScope, loc?: Node["loc"]) {

    if ( !isObject(_g) || body.length === 0 ) { return; }

    if(!getValue(_g, "$$return")) {
        setValue(_g, "$$return", [], true);  // 初始化返回值
    }

    // 光标所在位置
    let $$node: Node | undefined = getValue(_g, "$$node");
    if ($$node && loc && !isInScope({ loc }, $$node)) {
        $$node = undefined;  // 光标所在位置不在当前代码块内
    }

    // 类型声明注解:  1) t : T   2) t & T   3) t | T
    const comments: Comment[] | undefined = getValue(_g, "$$comments");
    const typeRegx = /---\s*(@?\w+)\s*([:|&])\s*(.+)/;

    let lastLine = loc?.start.line || 0;

    body.forEach(node=>{
        if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

        if ($$node && isDownScope(node, $$node)) {
            $$node = undefined;
            _g = newScope(_g);  // 光标下方代码：使用新的作用域
        }

        comments?.forEach(c => {
            const line = c.loc!.start.line;
            if (line > lastLine && line <= node.loc!.start.line) {
                const m = c.raw.match(typeRegx);
                if (m) {
                    const key = m[1].replace("@", "");
                    const typ = m[2] === ":" ? m[3] : `${m[1]} ${m[2]} ${m[3]}`;
                    const val = loadType(typ, _g, c.loc) as any;
                    if (val) {
                        setValueTyped(_g, "$type_" + key, val);

                        // 以大写字母开头的自定义类型注册到 $$types 中
                        if (key.match(/^[A-Z]/) && (m[2] === ":" || m[2] === "&")) {
                            val.type = key;
                            const $$types = getValue(_g, "$$types");
                            if ($$types) {
                                $$types[key] = val;
                                $$types["$"+key+"$"] = $$types["$"+key+"$"] || {
                                    $file: getValue(_g, "$file"),
                                    $loc: c.loc,
                                };
                            }
                        }
                    }
                }
            }
        });

        lastLine = node.loc!.end.line;

        try {
            loadNode(node, _g);
        } catch (e) {
            console.log(e);
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
    if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

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
        const vtypeInLine = get_vtype_inline(node, _g);  // 取得行内类型声明

        // -- @t : @MyType  //自定义类型
        // local t = { k=v, { k=v } }
        const vtypes = node.variables.map(n => get_node_vtype(n, _g));
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

        let lastV = res[res.length - 1];
        if (lastV && !lastV.$proxy && lastV.type === "...") {
            let v = res[res.length - 2];
            if (v && v.type !== "...") {
                for (let i = res.length - 1; i < node.variables.length; i++) {
                    res[i] = v;
                }
            }
        }

        // 待赋值的变量名（可能多个）
        node.variables.forEach((n, i) => {
            if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

            const v = i === 0 && vtypeInLine || res[i];

            switch (n.type) {
                case "Identifier": {
                    const vt = getType(_g, n.name);
                    if (vt) {  // 预设类型的变量才检查
                        check_vtype(vt, v, n, _g);
                    }

                    // local变量或者upvalue
                    setValue(_g, n.name, v, isLocal, n.loc);

                    // 找到光标所在的位置
                    if ($$node === n) { $$node.scope = _g; }

                    break;
                }

                case "MemberExpression": {
                    let k = n.identifier.name;
                    let t = loadNode(n.base, _g);

                    t = isArray(t) ? t[0] : t;

                    if (v instanceof Object && typeof v["()"] === "function" ){
                        // 生成请求参数类型
                        let $$req = getValue(_g, "$$req");
                        if ($$req && $$req[k]) {v["()"]["$$req"] = $$req[k];}

                        // 生成返回值类型 v21.11.25
                        let $$res = getValue(_g, "$$res");
                        if ($$res && $$res[k]) {v["()"]["$$res"] = $$res[k];}
                    }

                    let typeName = getLuaTypeName(t);
                    if (typeName === "string" || typeName === "number" || typeName === "boolean") {
                        addLint(n.identifier, "", _g, `类型“${ typeName }”上不存在属性“${ k }”`);
                    } else {
                        check_vtype(vtypes[i], v, n, _g);  // 类型检查
                        setChild(_g, t, n.indexer, k, v, n.identifier.loc);
                    }

                    // 找到光标所在的位置
                    if ($$node === n.identifier) {
                        let ti = getItem(t, [n.indexer]);
                        let mt = getItem(t, ["$$mt", ".", "__index", n.indexer]);
                        $$node.scope = {
                            ... isObject(mt) ? mt : {},
                            ... isObject(ti) ? ti : {},
                        };
                    }

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

                    check_vtype(vtypes[i], v, n, _g);  // 类型检查
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

            const args = node.arguments;
            if (args.length === 0) { return; }  // 没有返回值

            const resx = [] as any[];

            args.forEach((n, i) => {
                let vt = getType(_g, "return" + (i+1));

                // 注入返回值类型
                if (n.type === "TableConstructorExpression") { n.vtype = vt; }

                let v = loadNode(n, _g);
                if (isArray(v)) {
                    if (i === args.length - 1) {
                        resx.push(...v);
                        for (let j=i; j<resx.length; j++) {
                            vt = getType(_g, "return" + (j+1));
                            check_vtype(vt, resx[j], n, _g);  // 检查返回值类型
                        }
                    } else {
                        resx.push(v[0]);
                        check_vtype(vt, v[0], n, _g);  // 检查返回值类型
                    }
                } else {
                    resx.push(v);
                    check_vtype(vt, v, n, _g);  // 检查返回值类型
                }
            });

            if (resx.length === 1) {
                setReturn(resx[0], _g);     // 只有一个返回值
                return resx[0];
            } else if (resx.length > 1) {
                setReturn(resx, _g);        // 有多个返回值
                return resx;
            } else {
                return;                     // 没有返回值
            }

        }

        // 条件判断语句:  if (condition) then ... elseif (condition) then ... else ... end
        case 'IfStatement': {
            let ok_res : any;
            let elseG = _g;

            node.clauses.forEach((n, i) => {
                if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

                let thenG = newScope(elseG);
                elseG = newScope(elseG);

                if (n.type === "ElseClause") {
                    loadBody(n.body, elseG, n.loc);
                    return;
                }

                // 返回条件是否成立
                let ok = loadNode(n.condition, elseG);
                if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

                // 是否含有 return 语句
                let thenReturn = n.body.findIndex(d => d.type === "ReturnStatement") !== -1;

                let elseC = node.clauses[i+1];
                let elseReturn = elseC
                    && elseC.type === "ElseClause"
                    && elseC.body.findIndex(d => d.type === "ReturnStatement") !== -1;

                // if type 类型推导
                maybeTypes(n.condition, _g, thenG, elseG, thenReturn, elseReturn);

                setValue(thenG, "$$return", [], true);
                let res = loadBody(n.body, thenG, n.loc);
                setReturn(res, _g);

                if (isTrue(ok) && isFalse(ok_res)) {
                    ok_res = res;  // 条件成立时的返回值
                }
            });

            if (isTrue(ok_res)) {
                setReturn(ok_res, _g);  // 条件成立时的返回值
            }

        } break;

        // 循环语句
        case 'RepeatStatement':  // repeat ... until (condition)
        case 'WhileStatement':   // while(condition) do ... end
            loadNode(node.condition, _g);
            loadBody(node.body, newScope(_g), node.loc);
            break;

        // DO语句: do ... end
        case 'DoStatement':
            loadBody(node.body, newScope(_g), node.loc);
            break;

        // FOR语句: for i=1, 100, 1 do ... end
        case 'ForNumericStatement': {
            let newG = newScope(_g);
            setValue(newG, node.variable.name, {}, true, node.variable.loc);
            loadNode(node.start, newG);
            loadNode(node.end, newG);
            node.step && loadNode(node.step, newG);
            loadBody(node.body, newG, node.loc);
            break;
        }

        // FOR语句: for k, v in  pairs(t) do ... end
        //          for i, v in ipairs(t) do ... end
        case 'ForGenericStatement': {

            const arr = [] as any[];
            node.iterators.forEach((n, i) => {
                const res = loadNode(n, _g);
                if (isArray(res)) {
                    if (i === node.iterators.length - 1) {
                        arr.push(...res);
                    } else {
                        arr.push(res[0]);
                    }
                } else {
                    arr.push(res);
                }
            });

            // ipairs({1, 2, 3}) -> _iter, _obj = t, _next = 0
            let [_iter, _obj, _next] = arr;

            // 是否内置的 ipairs 或者 pairs
            let isPairs = isObject(_iter) && _iter.readonly;

            let runCount = 0;  // 运行次数

            while(runCount < 1000){  // 最多运行 1000 次, 避免死循环
                if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

                let res : any[];
                res = callFunc(_iter, _obj, _next);  // 执行迭代函数
                res = isArray(res) ? res :
                      isNil(res) ? [] : [res];

                if ( runCount > 0 ) {
                    if ( res.length === 0        ) { break; }  // 未返回数据
                    if ( res[0] === _next        ) { break; }  // 与上一的返回值相同
                    if (!isPairs) {
                        // 自定义的迭代函数需要检查是否返回空值
                        if ( res.some(v => isNil(v)) ) { break; }
                    }
                }

                _next = res[0];
                runCount++;

                const newG = newScope(_g);
                node.variables.forEach((v, i)=>{
                    const val = i < res.length ? res[i] : LuaAny;
                    setValue(newG, v.name, val, true, v.loc);

                    // 找到光标所在的位置
                    if ($$node === v) { $$node.scope = newG; }
                });

                if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

                loadBody(node.body, newG, node.loc);
            }

            break;
        }

        // 通过变量名取值
        case "Identifier": {
            // 找到光标所在的位置
            if ($$node === node) { $$node.scope = _g; }

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
                    if (l?.type === "cdata" || r?.type === "cdata") {return LuaCData;}
                    if (l?.type === "any"   || r?.type === "any") {return LuaAny;}
                    if (typeof l !== "number" || typeof r !== "number") {return LuaNumber;}
                    return  op === "+" ? l + r :
                            op === "-" ? l - r :
                            op === "*" ? l * r :
                            op === "/" ? l / r :
                            op === "^" ? l ^ r :
                            op === "%" ? l % r : 0 ;

                case "==":
                    return l === r || (l?.type === "null" && r?.type === "null");

                case "~=":
                    return l !== r && (l?.type !== "null" && r?.type !== "null");

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

            // self:func(...)
            if (funt && node.base.type === "MemberExpression" && node.base.indexer === ":") {
                funt.$$self = loadNode(node.base.base, _g);
            }

            let args: any[] = [];
            let vararg = false;

            node.arguments.forEach((arg, i) => {

                // 参数提示
                if ($$node && isInScope(arg, $$node)) {
                    setArgsCall(funt, i, _g);
                }

                set_arg_vtype(funt, arg, _g, node.arguments, i);  // 形参类型

                let t = loadNode(arg, _g);
                if (t instanceof Array) {
                    if (arg.type === "VarargLiteral") {
                        vararg = true;
                        args.push(...t);  // 可变参数全部传递 ...
                    } else {
                        args.push(t[0]);  // 返回数组传递第一项
                    }
                } else {
                    args.push(t);
                }

                check_vtype(arg.vtype, args[i], arg, _g);  // 比较实参与形参类型

            });

            // 最少参数个数检查
            const argsMin = typeof funt?.argsMin === "number" ? funt?.argsMin : 0;
            if (args.length < argsMin && !vararg) {
                addLint(node.base, "", _g, `最少需要 ${ argsMin } 个参数`);
            }

            return callFunc(funt, ...args);
        }

        // 运行函数: func "abc"
        case "StringCallExpression": {
            let funt = loadNode(node.base, _g);

            let n = node.argument;
            set_arg_vtype(funt, n, _g);  // 形参类型

            let argt = loadNode(n, _g);
            check_vtype(n.vtype, argt, n, _g);  // 比较实参与形参类型

            // 最少参数个数检查
            const argsMin = typeof funt?.argsMin === "number" ? funt?.argsMin : 0;
            if (argsMin > 1) {
                addLint(node.base, "", _g, `最少需要 ${ argsMin } 个参数`);
            }

            return callFunc(funt, argt);
        }

        // 运行函数 func { a=1, b=2, c=3 }
        case "TableCallExpression": {
            let funt = loadNode(node.base, _g);

            let n = node.arguments;
            set_arg_vtype(funt, n, _g);  // 形参类型

            let args = loadNode(n, _g);
            check_vtype(n.vtype, args, n, _g);  // 比较实参与形参类型

            // 最少参数个数检查
            const argsMin = typeof funt?.argsMin === "number" ? funt?.argsMin : 0;
            if (argsMin > 1) {
                addLint(node.base, "", _g, `最少需要 ${ argsMin } 个参数`);
            }

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

            const func = makeFunc(node, _g);  // 生成函数

            const funt: any = {
                "()"        : func,
                doc         : func.$$docs || "",
                args        : func.args,
                argsMin     : func.argsMin,
                $argx       : func.$argx,
                selfCall    : func.selfCall,  // 第一个参数是否 self 或 _
                selfArgs    : func.selfArgs,
                selfArgx    : func.selfArgx,

                "$file"     : $file,
                "$loc"      : node.loc,
                type        : "function",
                readonly    : true,
            };

            // 为 apicheck 提供待运行的函数
            const funcs = getValue(_g, "$$funcs") as Function[];
            funcs && funcs.push(func);

            // 检查变量是否在函数定义作用内
            if ($$node && isInScope(node, $$node)) {
                setValue(_g, "$$func", func, false);
            }

            let ni = node.identifier;
            if (ni) {
                switch (ni.type) {
                    case "Identifier":
                        setValue(_g, ni.name, funt, isLocal, ni.loc);  // local变量或者upvalue

                        // 找到光标所在的位置
                        if ($$node === ni) { $$node.scope = _g; }

                        return;

                    case "MemberExpression":
                    {
                        let k = ni.identifier.name;
                        let t = loadNode(ni.base, _g);

                        if (isArray(t)) { t = t[0]; } // 返回的可能是数组

                        // 生成请求参数类型
                        let $$req = getValue(_g, "$$req");
                        if ($$req && $$req[k]) {func["$$req"] = $$req[k];}

                        // 生成返回值类型 v21.11.25
                        let $$res = getValue(_g, "$$res");
                        if ($$res && $$res[k]) {func["$$res"] = $$res[k];}

                        setChild(_g, t, ni.indexer, k, funt, ni.identifier.loc);

                        // 找到光标所在的位置
                        if ($$node === ni.identifier) {
                            $$node.scope = t && t[ni.indexer] || {};
                        }

                        return;
                    }
                }
            }

            return funt;
        }

        // 索引表达式：table[key]
        case "IndexExpression": {
            let k = loadNode(node.index, _g);
            let t = loadNode(node.base, _g);
            return getIndex(t, k, _g);
        }

        // 成员变量表达式 table.key | table:key
        case "MemberExpression": {
            let k = node.identifier.name;
            let t = loadNode(node.base, _g);

            if (isArray(t)) { t = t[0]; } // 返回的可能是数组

            if (typeof t === "string" || t?.type === "string") {
                t = getValue(_g, "$type<@string>");  // 字符串类型
            } else if (t?.type === "file") {
                t = getValue(_g, "$type<@file>");  // 文件类型
            } else if (t?.type === "any") {
                return LuaAny;  // 任意类型
            }

            let ti = getItem(t, [node.indexer]);
            let mt = getItem(t, ["$$mt", ".", "__index", node.indexer]);

            // 找到光标所在的位置
            if ($$node === node.identifier) {
                $$node.scope = { ...mt, ...ti };
                if (k in $$node.scope) { return; }

                if (node.indexer === ".") {
                    // 生成函数 obj:func(abc) => obj.func(self, abc)
                    let funt = getItem(t, [":", k]) ||
                               getItem(t, ["$$mt", ".", "__index", ":", k]);
                    let info = getItem(t, [":", "$"+k+"$"]) ||
                               getItem(t, ["$$mt", ".", "__index", ":", "$"+k+"$"]);
                    funt = makeNormalCallFunc(funt);
                    if (funt) {
                        $$node.scope[k] = funt;
                        $$node.scope["$"+k+"$"] = info;
                    }

                } else if (node.indexer === ":") {
                    // 生成函数 obj.func(self, abc) => obj:func(abc)
                    let funt = getItem(t, [".", k]) ||
                               getItem(t, ["$$mt", ".", "__index", ".", k]);
                    let info = getItem(t, [".", "$"+k+"$"]) ||
                               getItem(t, ["$$mt", ".", "__index", ".", "$"+k+"$"]);
                    funt = makeSelfCallFunc(funt);
                    if (funt) {
                        $$node.scope[k] = funt;
                        $$node.scope["$"+k+"$"] = info;
                    }
                }

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

            if (node.indexer === ".") {
                // 生成函数 obj:func(abc) => obj.func(self, abc)
                let funt = makeNormalCallFunc (
                    getItem(t, [":", k]) ||
                    getItem(t, ["$$mt", ".", "__index", ":", k])
                );
                if (funt) { return funt; }

            } else if (node.indexer === ":") {
                // 生成函数 obj.func(self, abc) => obj:func(abc)
                let funt = makeSelfCallFunc (
                    getItem(t, [".", k]) ||
                    getItem(t, ["$$mt", ".", "__index", ".", k])
                );
                if (funt) { return funt; }
            }

            if (t?.basic || getLuaTypeName(t) !== "any" ) {
                // 为 apicheck 提供成员字段检查
                addLint(node.identifier, k, _g);
            }

        } break;

        // 对象或数组表达式 { a, b, c, k = v, [index] = value }
        case "TableConstructorExpression": {

            let t: LuaModule = { ".": {}, type: "table", $file, $loc: node.loc };
            let i = 1; // 下标从1开始：跟Lua保持一致

            node.fields.forEach((f, index) => {
                if ($$node?.scope) { return; }  // 光标所在位置已找到，则退出

                // 取得行内类型声明
                const vtypeInLine = get_vtype_inline(f, _g);
                let vtype : any;

                if (f.type === "TableKeyString") {
                    vtype = vtypeInLine ||
                            getItem(node.vtype, [".", f.key.name]) ||
                            getItem(node.vtype, [".", "*"]);

                } else if (f.type === "TableKey") {
                    vtype = vtypeInLine ||
                            getItem(node.vtype, [".", "*"]) ||
                            getItem(node.vtype, ["[]"]);

                } else if (f.type === "TableValue") {
                    vtype = vtypeInLine ||
                            getItem(node.vtype, [".", String(i)]) ||
                            getItem(node.vtype, ["[]"]) ||
                            getItem(node.vtype, [".", "*"]);
                }

                // 传递成员类型
                if (vtype && f.value.type === "TableConstructorExpression") {
                    f.value.vtype = vtype.vtype ? vtype.vtype : vtype;
                }

                switch (f.type) {
                    case "TableKey":           // 索引表达式 { [k] = v }
                    {
                        let k = loadNode(f.key, _g);
                        if (k instanceof Array) { k = k[0]; } // 返回数组取第一项

                        let v = loadNode(f.value, _g);
                        if (v instanceof Array) { v = v[0]; } // 返回数组取第一项

                        v = vtypeInLine || v;  //优先使用行内类型声明

                        check_vtype(vtype, v, f.key, _g);  // 类型检查

                        if (typeof k === "string" || typeof k === "number") {
                            setChild(_g, t, ".", k, v, f.key.loc);
                        }
                        break;
                    }

                    case "TableKeyString":      // 对象表达式 { k = v }
                    {
                        let scope = getItem(node.vtype, ["."]);  // 成员类型字段
                        if (isObject(scope)) {
                            if (!(f.key.name in scope) && !("*" in scope)) {
                                addLint(f.key, f.key.name, _g);  // 字段未定义
                            }
                        }

                        let v = loadNode(f.value, _g);
                        if (v instanceof Array) { v = v[0]; } // 返回数组取第一项

                        v = vtypeInLine || v;  //优先使用行内类型声明

                        check_vtype(vtype, v, f.key, _g);  // 类型检查
                        setChild(_g, t, ".", f.key.name, v, f.key.loc);

                        // 找到光标所在的位置
                        if ($$node === f.key) {
                            $$node.scope = scope || getItem(t, ["."]) || {};
                        }

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

                        v = vtypeInLine || v;  //优先使用行内类型声明

                        if (v instanceof Array) {  // 返回是数组
                            if (index === node.fields.length - 1) {
                                for (let item of v) {
                                    if (item?.nilable) { break; }  // 可能是空值则退出循环
                                    check_vtype(vtype, item, f.value, _g);  // 类型检查
                                    setChild(_g, t, ".", i++, item, f.loc);
                                }
                            } else {
                                v = v[0];  // 返回数组取第一项
                                check_vtype(vtype, v, f.value, _g);  // 类型检查
                                setChild(_g, t, ".", i++, v, f.loc);
                            }
                        } else {
                            check_vtype(vtype, v, f.value, _g);  // 类型检查
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

function getIndex(t: any, k: any, _g: LuaScope) {

    // 返回的可能是数组
    if (isArray(k)) { k = k[0]; }
    if (isArray(t)) { t = t[0]; }

    if (!isObject(t)) {return;}

    let vkey = getItem(t, [".", String(k)]);
    if (vkey !== undefined) { return vkey; }

    let varr = getItem(t, ["[]"]);        // 数组元素
    let vmap = getItem(t, [".", "*"]);
    let type = getLuaTypeName(k);

    if (type === "number" && varr) {
        return varr;
    } else if (type === "string" && vmap) {
        return vmap;
    } else if (varr || vmap) {
        return varr || vmap;
    }

    let mt = getItem(t, ["$$mt", ".", "__index"]);
    if (isObject(mt)) {
        varr = getItem(mt, ["[]"]);        // 数组元素
        vmap = getItem(mt, [".", "*"]);

        if (type === "number" && varr) {
            return varr;
        } else if (type === "string" && vmap) {
            return vmap;
        } else if (varr || vmap) {
            return varr || vmap;
        }

        // __index 元方法
        let r = callFunc(mt, t, k);
        if (r instanceof Array) { r = r[0]; }
        return r;
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
        b = isArray(b) ? b[0]: b;

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
