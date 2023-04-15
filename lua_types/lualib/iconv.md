Lua-iconv
=========

Lua-iconv: performs character set conversions in Lua
(c) 2005-11 Alexandre Erwin Ittner <alexandre@ittner.com.br>
Project page: http://ittner.github.com/lua-iconv/

Lua-iconv is POSIX 'iconv' binding for the Lua Programming Language. The
iconv library converts a sequence of characters from one codeset into a
sequence of corresponding characters in another codeset. The codesets
are those specified in the iconv.new() call that returned the conversion
descriptor, cd.

Lua-iconv 7 *requires* Lua 5.1 or Lua 5.2. For Lua 5.0, use the first
release (lua-iconv-r1).


iconv.new
---------

```lua
local cd, err = iconv.new(to, from)
local cd, err = iconv.open(to, from)
```

Opens a new conversion descriptor, from the 'from' charset to the
'to' charset. Concatenating "//TRANSLIT" to the first argument will
enable character transliteration and concatenating "//IGNORE" to
the first argument will cause iconv to ignore any invalid characters
found in the input string.

This function returns a new converter or nil on error.


iconv.open
----------

```lua
local cd, err = iconv.new(to, from)
local cd, err = iconv.open(to, from)
```

Opens a new conversion descriptor, from the 'from' charset to the
'to' charset. Concatenating "//TRANSLIT" to the first argument will
enable character transliteration and concatenating "//IGNORE" to
the first argument will cause iconv to ignore any invalid characters
found in the input string.

This function returns a new converter or nil on error.


cd:iconv
--------

```lua
local nstr, err = cd:iconv(str)
```

Converts the 'str' string to the desired charset. This method always
returns two arguments: the converted string and an error code, which
may have any of the following values:

* nil:
    No error. Conversion was successful.

* iconv.ERROR_NO_MEMORY:
    Failed to allocate enough memory in the conversion process.

* iconv.ERROR_INVALID:
    An invalid character was found in the input sequence.

* iconv.ERROR_INCOMPLETE:
    An incomplete character was found in the input sequence.

* iconv.ERROR_FINALIZED:
    Trying to use an already-finalized converter. This usually means
    that the user was tweaking the garbage collector private methods.

* iconv.ERROR_UNKNOWN:
    There was an unknown error.
