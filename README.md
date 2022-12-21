# 欢迎使用 OpenResty Lua 代码补全插件

## 功能 (Features)

* 支持 io, math, os, string, table 内置库代码补全
* 支持 coroutine, debug, package 内置库代码补全
* 支持 ffi, jit, bit LuaJit内置库代码补全
* 支持 ngx, ndk OpenResty内置库代码补全
* 支持 lfs, cjson, utf8, iconv 等 clib 库代码补全
* 支持 require 文件路径补全及定义跳转
* 支持 local 及 upvalue 变量补全及定义跳转
* 支持部分第三方库类型推导, 部分面向对象库默认使用 new 方法作为构造函数
* 支持文档大纲
* 支持 Attach 调试 ([EmmyLuaDebugger](https://github.com/EmmyLua/EmmyLuaDebugger))
* 支持静态检查  ([LuaCheck](https://github.com/mpeterv/luacheck))

## 依赖 (Dependences)

* [LuaParse](https://github.com/fstirlitz/luaparse)
* [LuaCheck](https://github.com/mpeterv/luacheck)
* [EmmyLuaDebugger](https://github.com/EmmyLua/EmmyLuaDebugger)
* [OpenResty](https://openresty.org/)
* [OpenResty ORPM](https://github.com/killsen/openresty-orpm)

## 截图 (Screenshots)

![screenshots](https://raw.githubusercontent.com/killsen/openresty-vsce/master/images/screenshots.png)

