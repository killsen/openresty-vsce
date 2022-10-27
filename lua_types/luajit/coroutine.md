
Lua 协同程序(coroutine)
=======================

Lua 协同程序(coroutine)与线程比较类似：拥有独立的堆栈，独立的局部变量，独立的指令指针，同时又与其它协同程序共享全局变量和其它大部分东西。

协同是非常强大的功能，但是用起来也很复杂。

线程和协同程序区别：
* 线程与协同程序的主要区别在于，一个具有多个线程的程序可以同时运行几个线程，而协同程序却需要彼此协作的运行。
* 在任一指定时刻只有一个协同程序在运行，并且这个正在运行的协同程序只有在明确的被要求挂起的时候才会被挂起。
* 协同程序有点类似同步的多线程，在等待同一个线程锁的几个线程有点类似协同。

[返回目录]

coroutine.create
----------------
**语法:** *co = coroutine.create(f)*

**环境:** *rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, init_by_lua&#42;, ngx.timer.&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

通过一个 Lua 函数创建一个用户的 Lua 协程，并返回一个协程对象。、

类似标准的 Lua [coroutine.create](http://www.lua.org/manual/5.1/manual.html#pdf-coroutine.create) API，但它是在 ngx_lua 创建的 Lua 协程环境中运行。

该 API 在 [init_by_lua*](#init_by_lua) 的环境中可用，是从 `0.9.2` 开始的。

该 API 在`v0.6.0`版本首次引入。

[返回目录](#nginx-api-for-lua)

coroutine.resume
----------------
**语法:** *ok, ... = coroutine.resume(co, ...)*

**环境:** *rewrite_by_lua*, access_by_lua*, content_by_lua*, init_by_lua*, ngx.timer.*, header_filter_by_lua*, body_filter_by_lua**

恢复以前挂起或刚创建的用户 Lua 协程对象的执行。
Resume the executation of a user Lua coroutine object previously yielded or just created.

类似标准的 Lua [coroutine.resume](http://www.lua.org/manual/5.1/manual.html#pdf-coroutine.resume) API，但它是在 ngx_lua 创建的 Lua 协程环境中运行。

该 API 在 [init_by_lua*](#init_by_lua) 的环境中可用，是从 `0.9.2` 开始的。

该 API 在 `v0.6.0` 版本首次引入。

[返回目录](#nginx-api-for-lua)

coroutine.yield
---------------
**语法:** *... = coroutine.yield(...)*

**环境:** *rewrite_by_lua*, access_by_lua*, content_by_lua*, init_by_lua*, ngx.timer.*, header_filter_by_lua*, body_filter_by_lua**

挂起当前用户 Lua 协程的执行。

类似标准的 Lua [coroutine.yield](http://www.lua.org/manual/5.1/manual.html#pdf-coroutine.yield) API，但它是在 ngx_lua 创建的 Lua 协程环境中运行。

该 API 在 [init_by_lua*](#init_by_lua) 的环境中可用，是从 `0.9.2` 开始的。

该 API 在 `v0.6.0` 版本首次引入。

[返回目录](#nginx-api-for-lua)

coroutine.wrap
--------------
**语法:** *co = coroutine.wrap(f)*

**环境:** *rewrite_by_lua*, access_by_lua*, content_by_lua*, init_by_lua*, ngx.timer.*, header_filter_by_lua*, body_filter_by_lua**

类似标准的 Lua [coroutine.wrap](http://www.lua.org/manual/5.1/manual.html#pdf-coroutine.wrap) API，但它是在 ngx_lua 创建的 Lua 协程环境中运行。

该 API 在 [init_by_lua*](#init_by_lua) 的环境中可用，是从 `0.9.2` 开始的。

该 API 在 `v0.6.0` 版本首次引入。

[返回目录](#nginx-api-for-lua)

coroutine.running
-----------------
**语法:** *co = coroutine.running()*

**环境:** *rewrite_by_lua*, access_by_lua*, content_by_lua*, init_by_lua*, ngx.timer.*, header_filter_by_lua*, body_filter_by_lua**

与标准的 Lua [coroutine.running](http://www.lua.org/manual/5.1/manual.html#pdf-coroutine.running) API 相同。

该 API 在 [init_by_lua*](#init_by_lua) 的环境中可用，是从 `0.9.2` 开始的。

该 API 在 `v0.6.0` 版本首次引入。

[返回目录](#nginx-api-for-lua)

coroutine.status
----------------
**语法:** *status = coroutine.status(co)*

**环境:** *rewrite_by_lua*, access_by_lua*, content_by_lua*, init_by_lua*, ngx.timer.*, header_filter_by_lua*, body_filter_by_lua**

与标准的 Lua [coroutine.status](http://www.lua.org/manual/5.1/manual.html#pdf-coroutine.status) API 相同。

该 API 在 [init_by_lua*](#init_by_lua) 的环境中可用，是从 `0.9.2` 开始的。

该 API 在 `v0.6.0` 版本首次引入。

[返回目录](#nginx-api-for-lua)
