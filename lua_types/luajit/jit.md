# jit

https://luajit.org/ext_jit.html

The functions in this built-in module control the behavior of the JIT compiler engine.

Note that JIT-compilation is fully automatic — you probably won't need to use any of the following functions unless you have special needs.

## jit.on()

```lua
-- Turns the whole JIT compiler on (default).
jit.on()

-- enables JIT compilation for a Lua function.
jit.on(func|true [,true|false])
```

## jit.off()

```lua
-- Turns the whole JIT compiler off.
jit.off()

-- disables JIT compilation for a Lua function and
-- flushes any already compiled code from the code cache.
jit.off(func|true [,true|false])
```

## jit.flush()

```lua
-- Flushes the whole cache of compiled code.
jit.flush()

-- flushes the code, but doesn't affect the enable/disable status.
jit.flush(func|true [,true|false])

-- Flushes the root trace, specified by its number,
-- and all of its side traces from the cache.
-- The code for the trace will be retained as long as
-- there are any other traces which link to it.
jit.flush(tr)
```

## jit.status() -> status, ...

Returns the current status of the JIT compiler. The first result is either true or false if the JIT compiler is turned on or off.

The remaining results are strings for CPU-specific features and enabled optimizations.

## jit.version

Contains the LuaJIT version string.

## jit.version_num

Contains the version number of the LuaJIT core. Version xx.yy.zz is represented by the decimal number xxyyzz.

## jit.os

Contains the target OS name: "Windows", "Linux", "OSX", "BSD", "POSIX" or "Other".

## jit.arch

Contains the target architecture name: "x86", "x64", "arm", "ppc", "ppcspe", or "mips".

## jit.opt.start()

This submodule provides the backend for the -O command line option.

You can also use it programmatically, e.g.:

```lua
jit.opt.start(2) -- same as -O2
jit.opt.start("-dce")
jit.opt.start("hotloop=10", "hotexit=2")
```

Unlike in LuaJIT 1.x, the module is built-in and optimization is turned on by default! It's no longer necessary to run require("jit.opt").start(), which was one of the ways to enable optimization.
