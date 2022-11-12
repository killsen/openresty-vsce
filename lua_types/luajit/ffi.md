# ffi

## ffi.C

This is the default C library namespace — note the uppercase 'C'. It binds to the default set of symbols or libraries on the target system. These are more or less the same as a C compiler would offer by default, without specifying extra link libraries.

On POSIX systems, this binds to symbols in the default or global namespace. This includes all exported symbols from the executable and any libraries loaded into the global namespace. This includes at least libc, libm, libdl (on Linux), libgcc (if compiled with GCC), as well as any exported symbols from the Lua/C API provided by LuaJIT itself.

On Windows systems, this binds to symbols exported from the *.exe, the lua51.dll (i.e. the Lua/C API provided by LuaJIT itself), the C runtime library LuaJIT was linked with (msvcrt*.dll), kernel32.dll, user32.dll and gdi32.dll.

## ffi.cdef(def)

Adds multiple C declarations for types or external symbols (named variables or functions). def must be a Lua string. It's recommended to use the syntactic sugar for string arguments as follows:

```lua
ffi.cdef[[
typedef struct foo { int a, b; } foo_t;  // Declare a struct and typedef.
int dofoo(foo_t *f, int n);  /* Declare an external C function. */
]]
```

The contents of the string (the part in green above) must be a sequence of C declarations, separated by semicolons. The trailing semicolon for a single declaration may be omitted.

Please note, that external symbols are only declared, but they are not bound to any specific address, yet. Binding is achieved with C library namespaces (see below).

C declarations are not passed through a C pre-processor, yet. No pre-processor tokens are allowed, except for #pragma pack. Replace #define in existing C header files with enum, static const or typedef and/or pass the files through an external C pre-processor (once). Be careful not to include unneeded or redundant declarations from unrelated header files.

## ffi.load

```lua
clib = ffi.load(name [,global])
```

This loads the dynamic library given by name and returns a new C library namespace which binds to its symbols. On POSIX systems, if global is true, the library symbols are loaded into the global namespace, too.

If name is a path, the library is loaded from this path. Otherwise name is canonicalized in a system-dependent way and searched in the default search path for dynamic libraries:

On POSIX systems, if the name contains no dot, the extension .so is appended. Also, the lib prefix is prepended if necessary. So ffi.load("z") looks for "libz.so" in the default shared library search path.

On Windows systems, if the name contains no dot, the extension .dll is appended. So ffi.load("ws2_32") looks for "ws2_32.dll" in the default DLL search path.

## ffi.new

```lua
cdata = ffi.new(ct [,nelem] [,init...])
cdata = ctype([nelem,] [init...])
```

Creates a cdata object for the given ct. VLA/VLS types require the nelem argument. The second syntax uses a ctype as a constructor and is otherwise fully equivalent.

The cdata object is initialized according to the rules for initializers, using the optional init arguments. Excess initializers cause an error.

Performance notice: if you want to create many objects of one kind, parse the cdecl only once and get its ctype with ffi.typeof(). Then use the ctype as a constructor repeatedly.

Please note, that an anonymous struct declaration implicitly creates a new and distinguished ctype every time you use it for ffi.new(). This is probably not what you want, especially if you create more than one cdata object. Different anonymous structs are not considered assignment-compatible by the C standard, even though they may have the same fields! Also, they are considered different types by the JIT-compiler, which may cause an excessive number of traces. It's strongly suggested to either declare a named struct or typedef with ffi.cdef() or to create a single ctype object for an anonymous struct with ffi.typeof().

## ffi.typeof(ct)

```lua
ctype = ffi.typeof(ct)
```

Creates a ctype object for the given ct.

This function is especially useful to parse a cdecl only once and then use the resulting ctype object as a constructor.

## ffi.cast(ct, init)

```lua
cdata = ffi.cast(ct, init)
```

Creates a scalar cdata object for the given ct. The cdata object is initialized with init using the "cast" variant of the C type conversion rules.

This functions is mainly useful to override the pointer compatibility checks or to convert pointers to addresses or vice versa.

## ffi.metatype(ct, metatable)

```lua
ctype = ffi.metatype(ct, metatable)
```

Creates a ctype object for the given ct and associates it with a metatable. Only struct/union types, complex numbers and vectors are allowed. Other types may be wrapped in a struct, if needed.

The association with a metatable is permanent and cannot be changed afterwards. Neither the contents of the metatable nor the contents of an __index table (if any) may be modified afterwards. The associated metatable automatically applies to all uses of this type, no matter how the objects are created or where they originate from. Note that predefined operations on types have precedence (e.g. declared field names cannot be overridden).

All standard Lua metamethods are implemented. These are called directly, without shortcuts, and on any mix of types. For binary operations, the left operand is checked first for a valid ctype metamethod. The __gc metamethod only applies to struct/union types and performs an implicit ffi.gc() call during creation of an instance.

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

Fills the data pointed to by dst with len constant bytes, given by c. If c is omitted, the data is zero-filled.

Performance notice: ffi.fill() may be used as a faster (inlinable) replacement for the C library function memset(dst, c, len). Please note the different order of arguments!

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
