# 升级日志

## v1.8.6

### 完善行内类型注解, 演示代码如下:

```lua

local function test(argt)
-- @argt    : { aaa: number, bbb: number }  // 参数类型
-- @return  : @argt & { ccc: string }       // 返回类型

    return {
        aaa = argt.aaa,
        bbb = argt.bbb,
        ccc = "ccc",
        ddd = "ddd", -- 提示: 字段未定义 'ddd'
    }

end

local res = test { aaa = 111, bbb = 222 }

ngx.say("aaa", res.aaa)
ngx.say("bbb", res.bbb)
ngx.say("ccc", res.ccc)

res.ddd = "DDD"  -- 提示: 字段未定义 'ddd'

--- res : res & { ddd : string }  // 新增 ddd 字段

res.ddd = "DDD"  -- 不再提示

--- res : res | { aaa, bbb, ccc }  // 只保留 aaa, bbb, ccc 字段

res.ddd = "DDD"  -- 提示: 字段未定义 'ddd'

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
