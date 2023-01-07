# 升级日志

## v1.7.0

* 优化元表解析
    * 支持 __index, __call 解析
    * 支持 setmetatable, getmetatable, rawget, rawset
* 优化参数 self 解析
* 优化可变参数 ... 解析
* 支持解析部分一元表达式和二元表达式

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
