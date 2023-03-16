# 升级日志

## v1.10.7

* 完善 coroutine, debug 参数类型声明
* 新增支持 pick<T, K>, omit<T, K> 选取或去除类型中某些项，演示代码如下：
```lua
-- 本插件仅在文件打开或保存时进行类型检查

--- T1 : { aaa, bbb, ccc }
--- T2 : pick<T1, aaa, bbb>  // pick 选取类型中某些项
--- T3 : omit<T1, aaa, bbb>  // omit 去除类型中某些项

local t1 = {} --> T1
ngx.say(t1.aaa, t1.bbb, t1.ccc)

local t2 = {} --> T2
ngx.say(t2.aaa, t2.bbb, t2.ccc)  -- 成员字段 “ccc” 不存在或属性未定义

local t3 = {} --> T3
ngx.say(t3.aaa, t3.bbb, t3.ccc)  -- 成员字段 “aaa” “bbb” 不存在或属性未定义

```

## v1.10.4

* 优化部分代码并修复部分bug
* 完善元表元方法解析，新增支持多种函数调用方式及参数对齐，演示代码如下：
```lua

local _M = { }
local mt = { __index = _M }

-- 可以通过以下两种方式调用该构造函数: _M.new(init) 或 _M(init)
function _M.new(init)
    local obj = {
        abc = init,
        xyz = init * 2,
    }
    return setmetatable(obj, mt)
end

-- 添加 __call 元方法以支持 _M(init) 调用
setmetatable(_M, {
    __call = function(_, init)
        return _M.new(init)
    end
})

-- 可以通过以下两种方式调用该方法: obj:call(xyz) 或 obj.call(obj, xyz)
function _M.call (self, xyz)
    return {
        abc = self.abc,
        xyz = self.xyz + xyz,
    }
end

local obj = _M.new(100)
ngx.say(obj.abc, ", ", obj.xyz)  -- 100, 200

local res = obj.call(obj, 200)
ngx.say(res.abc, ", ", res.xyz)  -- 100, 400

obj = _M(300)
ngx.say(obj.abc, ", ", obj.xyz)  -- 300, 600

res = obj:call(400)
ngx.say(res.abc, ", ", res.xyz)  -- 300, 1000

```

## v1.9.4

* 新增支持多返回值类型声明及检查，演示代码如下：
```lua
-- 本插件仅在文件打开或保存时进行类型检查

local function str_to_num(str)
-- @str    : string
-- @return : boolean, number

    local num = tonumber(str)

    if type(num) == "number" then
        return true, num
    else
        return "not ok",        -- 不能将类型 “string” 分配给类型 “boolean”
               "not number"     -- 不能将类型 “string” 分配给类型 “number”
    end

end

local ok, num = str_to_num("123")

ngx.say(ok)   -- 返回值 ok  类型为 “boolean”
ngx.say(num)  -- 返回值 num 类型为 “number”

```

## v1.9.3

* 新增支持 if type 类型推导，演示代码如下：
```lua
-- 本插件仅在文件打开或保存时进行类型检查

local _M = {}

function _M.test1(arg)

    if type(arg) ~= "string" then
        ngx.say("arg 类型不是 string : ", tostring(arg))
        return  -- 这里退出了
    end

    ngx.say("arg 类型是 string :", arg:upper())

end

function _M.test2(arg)
-- @arg : number | string | boolean

    if type(arg) == "number" then
        ngx.say("arg 类型是 number : ", arg + 100)

    elseif type(arg) == "boolean" then
        ngx.say("arg 类型是 boolean : ", not not arg)

    else
        ngx.say("arg 类型是 string : ", arg:upper())
    end

end

return _M

```

## v1.9.2

* ngx, ndk, table, string, math, package 内置库接口新增参数类型声明
* 新增支持 ngx.timer.at, ngx.timer.every 参数类型推导，演示代码如下：
```lua
-- 本插件仅在文件打开或保存时进行类型检查

local function test(premature, user_arg1, user_arg2)
-- @premature : boolean
-- @user_arg1 : number
-- @user_arg2 : string
    ngx.log(ngx.ERR, "premature", premature)
    ngx.log(ngx.ERR, "user_arg1", user_arg1)
    ngx.log(ngx.ERR, "user_arg2", user_arg2)
end

local user_arg1 = 123
local user_arg2 = 456

ngx.timer.at(0, test, user_arg1, user_arg2)
-- user_arg2 参数类型错误: 不能将类型 “number” 分配给类型 “string”

```

## v1.9.1

* 新增 package 接口文档
* 新增支持 ngx.thread.spaw, ngx.thread.wait 类型推导，演示代码如下：
```lua

local function test(ccc)
    return {
        aaa = 111,
        bbb = 222,
        ccc = ccc
    }
end

local co = ngx.thread.spawn(test, 333)
local ok, res = ngx.thread.wait(co)

ngx.say(ok)
ngx.say(res.aaa)  -- 输出 111
ngx.say(res.bbb)  -- 输出 222
ngx.say(res.ccc)  -- 输出 333
ngx.say(res.ddd)  -- 成员字段 “ddd” 不存在或属性未定义

```

## v1.8.9

### 类型声明新增支持联合类型及交叉类型, 演示代码如下:

```lua
-- 本插件仅在文件打开或保存时进行类型检查

--  联合类型及交叉类型 ----------------------------
--- T1 : number | string     // 联合类型
--- T2 : string | boolean    // 联合类型
--- T3 : T1 & T2             // 交叉类型

--- abc : T3
local abc

abc = 123       -- 不能将类型 “number” 分配给类型 “string”
ngx.say(abc)

abc = "abc"
ngx.say(abc)

abc = true      -- 不能将类型 “boolean” 分配给类型 “string”
ngx.say(abc)

```

## v1.8.8

### 赋值语句新增类型检查, 演示代码如下:

```lua
-- 本插件仅在文件打开或保存时进行类型检查

-- 显式声明变量 xzy 的类型为 “number”
--- xyz : number
local xyz

xyz = 123
ngx.say(xyz)

-- 错误提示：不能将类型 “string” 分配给类型 “number”
xyz = "abc"
ngx.say(xyz)

-- 忽略检查：将 “boolen” 类型当做 “any” 类型分配给类型 “number”
xyz = true  --> any
ngx.say(xyz)

```

## v1.8.7

### 行内类型注解新增支持复杂类型声明, 演示代码如下:

```lua

--  复杂类型声明
--- HttpOption : { uri, method?, body?, query? }    //声明类型 HttpOption
--- HttpOption & { headers?: map<string> }          //添加字段 headers
--- HttpOption & { ssl_verify?: boolean  }          //添加字段 ssl_verify

-- http 请求
local function request(option)
-- @option : @HttpOption  //声明参数类型

    local http  = require "resty.http"
    local httpc = http.new()

    local  res, err = httpc:request_uri(option.uri, option)
    return res, err
end

local opt = {}  --> @HttpOption
-- 类似 TypeScript 写法:
-- let opt = {} as HttpOption
-- 下面的 opt 对象就支持成员字段补全了

opt.uri     = "https://www.baidu.com"
opt.method  = "POST"
opt.body    = "{}"
opt.headers = {
    ["Content-Type"] = "application/json"
}

local res, err = request(opt)
if not res then
    ngx.say(err)
elseif (res.status == 200) then
    ngx.say(res.body)
end

-- 直接调用函数也是有参数类型成员字段补全的
local res, err = request { uri = "https://www.baidu.com", method = "GET" }
if not res then
    ngx.say(err)
elseif (res.status == 200) then
    ngx.say(res.body)
end

```

## v1.8.5

* 完善行内类型注解
* 优化 pcall 解析以支持元表 __call 元方法
* 优化迭代器 pairs, ipairs 解析
* 完善部分 api 声明及文档
* 新增支持类型声明 map<T>
* table.insert( arr, {} ) 根据第一个参数 arr 的类型推导最后一个参数的类型

## v1.7.5

* 优化元表解析
    * 支持 __index, __call 解析
    * 支持 setmetatable, getmetatable, rawget, rawset
* 优化参数 self 解析
* 优化可变参数 ... 解析
* 支持解析部分一元表达式和二元表达式
* 优化解析函数内条件语句中的 return 语句返回值
* 完善 string 库接口声明及代码补全
* 完善 table 库接口声明及代码补全
* 新增支持全局变量 _G

## v1.6.0

* 新增支持自定义类型声明 [演示代码](https://raw.githubusercontent.com/killsen/openresty-appx/main/nginx/testing/typed.lua)

![screenshots](https://raw.githubusercontent.com/killsen/openresty-vsce/master/images/typed.png)

## v1.2.0

* 新增支持 luacheck

## v1.1.2

* 新增支持 .orpmrc 配置文件

## v1.1.1

* 新增 OpenResty: Attach 调试

## v1.0.0

* 支持 io, math, os, string, table 等内置库代码补全
* 支持 ngx, ndk 等 openresty 库代码补全
* 支持 lfs, cjson 等 clib 库代码补全
* 支持 require 文件路径补全及定义跳转
* 支持 upvalue 变量补全及定义跳转
* 支持部分第三方库类型推导
* 支持文档大纲
