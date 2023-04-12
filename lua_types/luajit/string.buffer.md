# string.buffer

* https://repo.or.cz/w/luajit-2.0.git/blob_plain/v2.1:/doc/ext_buffer.html

The string buffer library allows high-performance manipulation of string-like data.

Unlike Lua strings, which are constants, string buffers are mutable sequences of 8-bit (binary-transparent) characters. Data can be stored, formatted and encoded into a string buffer and later converted, extracted or decoded.

The convenient string buffer API simplifies common string manipulation tasks, that would otherwise require creating many intermediate strings. String buffers improve performance by eliminating redundant memory copies, object creation, string interning and garbage collection overhead. In conjunction with the FFI library, they allow zero-copy operations.

The string buffer library also includes a high-performance serializer for Lua objects.

## buffer.new
```lua
local buf = buffer.new([size [,options]])
local buf = buffer.new([options])
```
Creates a new buffer object.

The optional size argument ensures a minimum initial buffer size. This is strictly an optimization when the required buffer size is known beforehand. The buffer space will grow as needed, in any case.

The optional table options sets various serialization options.
```lua
local options = {
  dict = { "commonly", "used", "string", "keys" },
}
local buf_enc = buffer.new(options)
local buf_dec = buffer.new(options)

local function encode(obj)
  return buf_enc:reset():encode(obj):get()
end

local function decode(str)
  return buf_dec:set(str):decode()
end
```

## buf:reset
```lua
buf = buf:reset()
```
Reset (empty) the buffer. The allocated buffer space is not freed and may be reused.

## buf:free
```lua
buf = buf:free()
```
The buffer space of the buffer object is freed. The object itself remains intact, empty and may be reused.

Note: you normally don't need to use this method. The garbage collector automatically frees the buffer space, when the buffer object is collected. Use this method, if you need to free the associated memory immediately.

## buf:put
```lua
buf = buf:put([str|num|obj] [,…])
```
Appends a string str, a number num or any object obj with a __tostring metamethod to the buffer. Multiple arguments are appended in the given order.

Appending a buffer to a buffer is possible and short-circuited internally. But it still involves a copy. Better combine the buffer writes to use a single buffer.

## buf:putf
```lua
buf = buf:putf(format, …)
```
Appends the formatted arguments to the buffer. The format string supports the same options as string.format().

## buf:putcdata
```lua
buf = buf:putcdata(cdata, len)
```
Appends the given len number of bytes from the memory pointed to by the FFI cdata object to the buffer. The object needs to be convertible to a (constant) pointer.

## buf:set
```lua
buf = buf:set(str)
buf = buf:set(cdata, len)
```
This method allows zero-copy consumption of a string or an FFI cdata object as a buffer. It stores a reference to the passed string str or the FFI cdata object in the buffer. Any buffer space originally allocated is freed. This is not an append operation, unlike the buf:put*() methods.

After calling this method, the buffer behaves as if buf:free():put(str) or buf:free():put(cdata, len) had been called. However, the data is only referenced and not copied, as long as the buffer is only consumed.

In case the buffer is written to later on, the referenced data is copied and the object reference is removed (copy-on-write semantics).

The stored reference is an anchor for the garbage collector and keeps the originally passed string or FFI cdata object alive.

## buf:reserve
```lua
ptr, len = buf:reserve(size)
```
The reserve method reserves at least size bytes of write space in the buffer. It returns an uint8_t * FFI cdata pointer ptr that points to this space.

The available length in bytes is returned in len. This is at least size bytes, but may be more to facilitate efficient buffer growth. You can either make use of the additional space or ignore len and only use size bytes.

## buf:commit
```lua
buf = buf:commit(used)
```
The commit method appends the used bytes of the previously returned write space to the buffer data.

This pair of methods allows zero-copy use of C read-style APIs:
```lua
local MIN_SIZE = 65536
repeat
  local ptr, len = buf:reserve(MIN_SIZE)
  local n = C.read(fd, ptr, len)
  if n == 0 then break end -- EOF.
  if n < 0 then error("read error") end
  buf:commit(n)
until false
```
The reserved write space is not initialized. At least the used bytes must be written to before calling the commit method. There's no need to call the commit method, if nothing is added to the buffer (e.g. on error).

## buf:skip
```lua
buf = buf:skip(len)
```
Skips (consumes) len bytes from the buffer up to the current length of the buffer data.

## buf:get
```lua
str, … = buf:get([len|nil] [,…])
```
Consumes the buffer data and returns one or more strings. If called without arguments, the whole buffer data is consumed. If called with a number, up to len bytes are consumed. A nil argument consumes the remaining buffer space (this only makes sense as the last argument). Multiple arguments consume the buffer data in the given order.

Note: a zero length or no remaining buffer data returns an empty string and not nil.

## buf:tostring
```lua
str = buf:tostring()
str = tostring(buf)
```
Creates a string from the buffer data, but doesn't consume it. The buffer remains unchanged.

Buffer objects also define a __tostring metamethod. This means buffers can be passed to the global tostring() function and many other functions that accept this in place of strings. The important internal uses in functions like io.write() are short-circuited to avoid the creation of an intermediate string object.

## buf:ref
```lua
ptr, len = buf:ref()
```
Returns an uint8_t * FFI cdata pointer ptr that points to the buffer data. The length of the buffer data in bytes is returned in len.

The returned pointer can be directly passed to C functions that expect a buffer and a length. You can also do bytewise reads (local x = ptr[i]) or writes (ptr[i] = 0x40) of the buffer data.

In conjunction with the skip method, this allows zero-copy use of C write-style APIs:
```lua
repeat
  local ptr, len = buf:ref()
  if len == 0 then break end
  local n = C.write(fd, ptr, len)
  if n < 0 then error("write error") end
  buf:skip(n)
until n >= len
```
Unlike Lua strings, buffer data is not implicitly zero-terminated. It's not safe to pass ptr to C functions that expect zero-terminated strings. If you're not using len, then you're doing something wrong.

## buf:encode
```lua
str = buffer.encode(obj)
buf = buf:encode(obj)
```
Serializes (encodes) the Lua object obj. The stand-alone function returns a string str. The buffer method appends the encoding to the buffer.

obj can be any of the supported Lua types — it doesn't need to be a Lua table.

This function may throw an error when attempting to serialize unsupported object types, circular references or deeply nested tables.

## buf:decode
```lua
obj = buffer.decode(str)
obj = buf:decode()
```
The stand-alone function deserializes (decodes) the string str, the buffer method deserializes one object from the buffer. Both return a Lua object obj.

The returned object may be any of the supported Lua types — even nil.

This function may throw an error when fed with malformed or incomplete encoded data. The stand-alone function throws when there's left-over data after decoding a single top-level object. The buffer method leaves any left-over data in the buffer.

Attempting to deserialize an FFI type will throw an error, if the FFI library is not built-in or has not been loaded, yet.

## buffer.encode
```lua
str = buffer.encode(obj)
buf = buf:encode(obj)
```
Serializes (encodes) the Lua object obj. The stand-alone function returns a string str. The buffer method appends the encoding to the buffer.

obj can be any of the supported Lua types — it doesn't need to be a Lua table.

This function may throw an error when attempting to serialize unsupported object types, circular references or deeply nested tables.

## buffer.decode
```lua
obj = buffer.decode(str)
obj = buf:decode()
```
The stand-alone function deserializes (decodes) the string str, the buffer method deserializes one object from the buffer. Both return a Lua object obj.

The returned object may be any of the supported Lua types — even nil.

This function may throw an error when fed with malformed or incomplete encoded data. The stand-alone function throws when there's left-over data after decoding a single top-level object. The buffer method leaves any left-over data in the buffer.

Attempting to deserialize an FFI type will throw an error, if the FFI library is not built-in or has not been loaded, yet.
