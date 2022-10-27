## template.template
[lua-resty-template](https://github.com/bungle/lua-resty-template)
是Lua和OpenResty中的模板渲染引擎。由Kong网关核心工程师bungle开源。

模板语法
-------
您可以在模板中使用以下标签：

* `{{ expression }}`：输出传递的值，转义 `html` 相关标签
* `{* expression *}`：输出传递的值
* `{% lua code   %}`：使用 `lua` 代码
* `{( template   )}`：引入 `html` 共用页面
* `{( base.html, { title = "Hello, World" } )}`：引入 `html` 共用页面，并传递相关值
* `{-verbatim-}...{-verbatim-}`/`{-raw-}...{-raw-}`：可原样输出模板语法
* `{# comments  #}`：在模板中使用注释，不会被执行和输出

从模板中，您可以访问context表中的所有内容，以及template表中的所有内容。在模板，您还可以访问context，并template通过在前面键

## template.new(config)
根据配置config，创建新环境下的template对象

```lua

-- 指定根目录（path)
template.new { root = "/nginx/html" }

-- 指定根路径（uri)
template.new { location = "/" }

-- 启用安全模式
template.new ( true )

```

## template.compile (view, cache_key?, is_text?)
编译模板或文件，生成 render 函数

```lua

local render = template.compile("template.html")   -- or
local render = template.compile([[<h1>{{message}}</h1>]])

local html = render { message = "Hello, World!" }
print(html)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.compile_file (file, cache_key?)
编译文件，生成 render 函数

```lua

-- 如果文件不存在，将抛出错误
local render = template.compile_file("template.html")
local html = render { message = "Hello, World!" }
print(html)

-- 如果文件内容是<h1>{{message}}</h1>，将输出：
-- <h1>Hello, World!</h1>

```

## template.compile_string (text, cache_key?)
编译模板，生成 render 函数

```lua

local render = template.compile_string([[<h1>{{message}}</h1>]])
local html = render { message = "Hello, World!" }
print(html)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## render({context})
执行渲染函数，返回 html

```lua

local render = template.compile("template.html")          -- or
local render = template.compile([[<h1>{{message}}</h1>]])

local html = render { message = "Hello, World!" }
print(html)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.render (view, {context}, cache_key?, is_text?)
编译模板或文件，并输出网页到客户端

```lua

local context = { message = "Hello, World!" }
template.render("template.html", context)  -- or
template.render([[<h1>{{message}}</h1>]], context)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.render_file (file, {context}, cache_key?)
编译文件，并输出网页到客户端

```lua

-- 如果文件不存在，将抛出错误
template.render_file(
    "template.html",
    { message = "Hello, World!" }
)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.render_string (text, {context}, cache_key?)
编译模板，并输出网页到客户端

```lua

template.render_string(
    [[<h1>{{message}}</h1>]],
    { message = "Hello, World!" }
)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.process (view, {context}, cache_key?, is_text?)
编译模板或文件，返回网页内容

```lua

local context = { message = "Hello, World!" }
local html = template.process("template.html", context)   -- or
local html = template.process([[<h1>{{message}}</h1>]], context)

print(html)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.process_file (file, {context}, cache_key?)
编译文件，返回网页内容

```lua

-- 如果文件不存在，将抛出错误
local html = template.process_file(
    "template.html",
    { message = "Hello, World!" }
)

print(html)

-- 将输出：
-- <h1>Hello, World!</h1>


```

## template.process_string (text, {context}, cache_key?)
编译模板，返回网页内容

```lua

local html = template.process_string(
    [[<h1>{{message}}</h1>]],
    { message = "Hello, World!" }
)

print(html)

-- 将输出：
-- <h1>Hello, World!</h1>

```

## template.parse (view, is_text)
编译模板或文件，返回生成的LUA代码

```lua

local lua_code = template.parse("template.html")   -- or
local lua_code = template.parse([[<h1>{{message}}</h1>]])

-- 输出 lua 代码
print(lua_code)

```

## template.parse_file (file)
编译文件，返回生成的LUA代码

```lua

-- 如果文件不存在，将抛出错误
local lua_code = template.parse_file("template.html")

-- 输出 lua 代码
print(lua_code)

```

## template.parse_string (text)
编译模板，返回生成的LUA代码

```lua

local lua_code = template.parse_string([[<h1>{{message}}</h1>]])

-- 输出 lua 代码
print(lua_code)

```
