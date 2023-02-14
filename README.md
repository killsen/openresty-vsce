# 欢迎使用 OpenResty Lua 代码补全插件

## 功能 (Features)

* 本插件仅支持 Windows 操作系统
* 支持 io, math, os, string, table 内置库代码补全
* 支持 coroutine, debug, package 内置库代码补全
* 支持 [ffi](https://luajit.org/ext_ffi_api.html), [jit](https://luajit.org/ext_jit.html), [bit](https://bitop.luajit.org/api.html) LuaJit内置库代码补全
* 支持 [ngx](https://github.com/iresty/nginx-lua-module-zh-wiki#nginx-api-for-lua), [ndk](https://github.com/iresty/nginx-lua-module-zh-wiki#ndkset_vardirective) OpenResty内置库代码补全
* 支持 [lfs](https://lunarmodules.github.io/luafilesystem/manual.html), [cjson](https://github.com/openresty/lua-cjson), [utf8](https://github.com/starwing/luautf8), [iconv](https://github.com/ittner/lua-iconv/), [date](https://tieske.github.io/date/) 等第三方库代码补全
* 支持 require 文件路径补全及定义跳转
* 支持 local 及 upvalue 变量补全及定义跳转
* 支持部分第三方库类型推导, 部分面向对象库默认使用 new 方法作为构造函数
* 支持文档大纲
* 支持 Attach 调试 ([EmmyLuaDebugger](https://github.com/EmmyLua/EmmyLuaDebugger))
* 支持静态检查  ([LuaCheck](https://github.com/mpeterv/luacheck))
* 支持自定义类型声明 [演示代码](https://raw.githubusercontent.com/killsen/openresty-appx/main/nginx/testing/typed.lua)

## 类型声明演示代码

```lua
-- 本插件仅在文件打开或保存时进行类型检查

-- 简单类型声明 ----------------------------
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

abc = true      -- 不能将类型 “boolean” 分配给类型 “number”
ngx.say(abc)

--  复杂类型声明 ----------------------------
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


## 依赖 (Dependences)

* [LuaParse](https://github.com/fstirlitz/luaparse)
* [LuaCheck](https://github.com/mpeterv/luacheck)
* [EmmyLuaDebugger](https://github.com/EmmyLua/EmmyLuaDebugger)
* [OpenResty](https://openresty.org/)
* [OpenResty ORPM](https://github.com/killsen/openresty-orpm)

## 截图 (Screenshots)

![screenshots](https://raw.githubusercontent.com/killsen/openresty-vsce/master/images/screenshots.png)

![screenshots](https://raw.githubusercontent.com/killsen/openresty-vsce/master/images/typed.png)

