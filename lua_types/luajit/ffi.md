# ffi

## ffi.C

这是默认的 C 库命名空间--注意为大写的 C。它绑定到目标系统上的默认符号集或库。这些或多或少与 C 编译器默认提供的相同，而不指定额外的链接库。

在 POSIX 系统中，它绑定到默认或全局命名空间中的符号。这包括可执行文件中的所有导出符号以及加载到全局命名空间中的任意库。这至少包括 libc，libm，libdl（在 Linux 中），libgcc（如果使用 GCC 编译器），以及 LuaJIT 本身提供的 Lua/C API 中的任何导出符号。

## ffi.cdef(def)

声明 C 函数或者 C 的数据结构，数据结构可以是结构体、枚举或者是联合体，函数可以是 C 标准函数，或者第三方库函数，也可以是自定义的函数，注意这里只是函数的声明，并不是函数的定义。声明的函数应该要和原来的函数保持一致。

```lua
ffi.cdef[[
typedef struct foo { int a, b; } foo_t;  /* Declare a struct and typedef.   */
int printf(const char *fmt, ...);        /* Declare a typical printf function. */
]]
```
注意： 所有使用的库函数都要对其进行声明，这和我们写 C 语言时候引入 .h 头文件是一样的。

## ffi.load

```lua
clib = ffi.load(name [,global])
```

这将加载由 name 指定的动态库，并返回一个绑定到其符号的新 C 库命名空间。在 POSIX 系统中，如果 global 为 true，这个库的符号将会加载到全局命名空间中。

如果 name 是路径，该库将会从该路径中加载。否则，name 将以与系统相关的方式进行规范化，并按默认搜索路径来搜索动态库：在 POSIX 系统上，如果 name 不包含 '.'，则追加扩展名 .so。此外，如果需要，还会添加库的前缀。所以 ffi.load("z") 在默认的共享库路径中搜索 "libz.so"。

## ffi.new

如下 API 函数创建 cdata 对象（ctype() 返回 "cdata"）。所有创建的对象都是垃圾回收的。

```lua
cdata = ffi.new(ct [,nelem] [,init...])
cdata = ctype([nelem,] [init...])
```

开辟空间，第一个参数为 ctype 对象，ctype 对象最好通过 ctype = ffi.typeof(ct) 构建。

顺便一提，可能很多人会有疑问，到底 ffi.new 和 ffi.C.malloc 有什么区别呢？

如果使用 ffi.new 分配的 cdata 对象指向的内存块是由垃圾回收器 LuaJIT GC 自动管理的，所以不需要用户去释放内存。

如果使用 ffi.C.malloc 分配的空间便不再使用 LuaJIT 自己的分配器了，所以不是由 LuaJIT GC 来管理的，但是，要注意的是 ffi.C.malloc 返回的指针本身所对应的 cdata 对象还是由 LuaJIT GC 来管理的，也就是这个指针的 cdata 对象指向的是用 ffi.C.malloc 分配的内存空间。这个时候，你应该通过 ffi.gc() 函数在这个 C 指针的 cdata 对象上面注册自己的析构函数，这个析构函数里面你可以再调用 ffi.C.free，这样的话当 C 指针所对应的 cdata 对象被 Luajit GC 管理器垃圾回收时候，也会自动调用你注册的那个析构函数来执行 C 级别的内存释放。

请尽可能使用最新版本的 Luajit，x86_64 上由 LuaJIT GC 管理的内存已经由 1G->2G，虽然管理的内存变大了，但是如果要使用很大的内存，还是用 ffi.C.malloc 来分配会比较好，避免耗尽了 LuaJIT GC 管理内存的上限，不过还是建议不要一下子分配很大的内存。

```lua
local int_array_t = ffi.typeof("int[?]")
local bucket_v = ffi.new(int_array_t, bucket_sz)

local queue_arr_type = ffi.typeof("lrucache_pureffi_queue_t[?]")
local q = ffi.new(queue_arr_type, size + 1)
```

## ffi.typeof(ct)

创建一个 ctype 对象，会解析一个抽象的 C 类型定义。
该函数仅用于解析 cdecl 一次，然后使用生成的 ctype 对象作为构造函数。

```lua
local uintptr_t = ffi.typeof("uintptr_t")
local c_str_t = ffi.typeof("const char*")
local int_t = ffi.typeof("int")
local int_array_t = ffi.typeof("int[?]")
```

## ffi.cast(ct, init)

```lua
cdata = ffi.cast(ct, init)
```

创建一个 scalar cdata 对象。

```lua
local str = "abc"
local c_str_t = ffi.typeof("const char*")
local c_str = ffi.cast(c_str_t, str)       -- 转换为指针地址

local uintptr_t = ffi.typeof("uintptr_t")
tonumber(ffi.cast(uintptr_t, c_str))       -- 转换为数字
```

## ffi.metatype(ct, metatable)

```lua
ctype = ffi.metatype(ct, metatable)
```

为给定的 ct 创建一个 ctype 对象，并将其与 metatable 相关联。仅允许使用 struct/union 类型，复数和向量。如果需要，其他类型可以封装在 struct 中。

与 metatable 的关联是永久性的，之后不可更改。之后，metatable 的内容和 __index 表（如果有的话）的内容都不能被修改。无论对象如何创建或源自何处，相关地元表都会自动应用于此类型的所有用途。注意，对类型的预定义操作具有优先权（如，声明的字段名称不能被覆盖）。

## ffi.gc(cdata, finalizer)

```lua
cdata = ffi.gc(cdata, finalizer)
```
Associates a finalizer with a pointer or aggregate cdata object. The cdata object is returned unchanged.

This function allows safe integration of unmanaged resources into the automatic memory management of the LuaJIT garbage collector. Typical usage:

```lua
local p = ffi.gc(ffi.C.malloc(n), ffi.C.free)
...
p = nil -- Last reference to p is gone.
-- GC will eventually run finalizer: ffi.C.free(p)
```

A cdata finalizer works like the __gc metamethod for userdata objects: when the last reference to a cdata object is gone, the associated finalizer is called with the cdata object as an argument. The finalizer can be a Lua function or a cdata function or cdata function pointer. An existing finalizer can be removed by setting a nil finalizer, e.g. right before explicitly deleting a resource:

```lua
ffi.C.free(ffi.gc(p, nil)) -- Manually free the memory.
```

## ffi.sizeof(ct [,nelem])

```lua
size = ffi.sizeof(ct [,nelem])
```

Returns the size of ct in bytes. Returns nil if the size is not known (e.g. for "void" or function types). Requires nelem for VLA/VLS types, except for cdata objects.

## ffi.alignof(ct)

```lua
align = ffi.alignof(ct)
```

Returns the minimum required alignment for ct in bytes.

## ffi.offsetof(ct, field)

```lua
ofs [,bpos,bsize] = ffi.offsetof(ct, field)
```

Returns the offset (in bytes) of field relative to the start of ct, which must be a struct. Additionally returns the position and the field size (in bits) for bit fields.

## ffi.istype(ct, obj)

```lua
status = ffi.istype(ct, obj)
```

Returns true if obj has the C type given by ct. Returns false otherwise.

C type qualifiers (const etc.) are ignored. Pointers are checked with the standard pointer compatibility rules, but without any special treatment for void *. If ct specifies a struct/union, then a pointer to this type is accepted, too. Otherwise the types must match exactly.

Note: this function accepts all kinds of Lua objects for the obj argument, but always returns false for non-cdata objects.

## ffi.errno([newerr])

```lua
err = ffi.errno([newerr])
```

Returns the error number set by the last C function call which indicated an error condition. If the optional newerr argument is present, the error number is set to the new value and the previous value is returned.

This function offers a portable and OS-independent way to get and set the error number. Note that only some C functions set the error number. And it's only significant if the function actually indicated an error condition (e.g. with a return value of -1 or NULL). Otherwise, it may or may not contain any previously set value.

You're advised to call this function only when needed and as close as possible after the return of the related C function. The errno value is preserved across hooks, memory allocations, invocations of the JIT compiler and other internal VM activity. The same applies to the value returned by GetLastError() on Windows, but you need to declare and call it yourself.

## ffi.string(ptr [,len])

```lua
str = ffi.string(ptr [,len])
```

Creates an interned Lua string from the data pointed to by ptr.

If the optional argument len is missing, ptr is converted to a "char *" and the data is assumed to be zero-terminated. The length of the string is computed with strlen().

Otherwise ptr is converted to a "void *" and len gives the length of the data. The data may contain embedded zeros and need not be byte-oriented (though this may cause endianess issues).

This function is mainly useful to convert (temporary) "const char *" pointers returned by C functions to Lua strings and store them or pass them to other functions expecting a Lua string. The Lua string is an (interned) copy of the data and bears no relation to the original data area anymore. Lua strings are 8 bit clean and may be used to hold arbitrary, non-character data.

Performance notice: it's faster to pass the length of the string, if it's known. E.g. when the length is returned by a C call like sprintf().

## ffi.copy(dst, src [, len])

```lua
ffi.copy(dst, src, len)
ffi.copy(dst, str)
```

Copies the data pointed to by src to dst. dst is converted to a "void *" and src is converted to a "const void *".

In the first syntax, len gives the number of bytes to copy. Caveat: if src is a Lua string, then len must not exceed #src+1.

In the second syntax, the source of the copy must be a Lua string. All bytes of the string plus a zero-terminator are copied to dst (i.e. #src+1 bytes).

Performance notice: ffi.copy() may be used as a faster (inlinable) replacement for the C library functions memcpy(), strcpy() and strncpy().

## ffi.fill(dst, len [,c])

填充数据，此函数和 memset(dst, c, len) 类似，注意参数的顺序。

```lua
ffi.fill(self.bucket_v, ffi_sizeof(int_t, bucket_sz), 0)
ffi.fill(q, ffi_sizeof(queue_type, size + 1), 0)
```

## ffi.abi(param)

```lua
status = ffi.abi(param)
```

Returns true if param (a Lua string) applies for the target ABI (Application Binary Interface). Returns false otherwise. The following parameters are currently defined:

| Parameter | Description                           |
| :-------- | :------------------------------------ |
| 32bit     | 32 bit architecture                   |
| 64bit     | 64 bit architecture                   |
| le        | Little-endian architecture            |
| be        | Big-endian architecture               |
| fpu       | Target has a hardware FPU             |
| softfp    | softfp calling conventions            |
| hardfp    | hardfp calling conventions            |
| eabi      | EABI variant of the standard ABI      |
| win       | Windows variant of the standard ABI   |

## ffi.os

Contains the target OS name: "Windows", "Linux", "OSX", "BSD", "POSIX" or "Other".

## ffi.arch

Contains the target architecture name: "x86", "x64", "arm", "ppc", "ppcspe", or "mips".
