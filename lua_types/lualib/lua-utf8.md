# UTF-8 module for Lua 5.x

[![Build Status](https://travis-ci.org/starwing/luautf8.svg?branch=master)](https://travis-ci.org/starwing/luautf8)
[![Coverage Status](https://coveralls.io/repos/github/starwing/luautf8/badge.svg?branch=master)](https://coveralls.io/github/starwing/luautf8?branch=master)

This module adds UTF-8 support to Lua.

It use data extracted from
[Unicode Character Database](http://www.unicode.org/reports/tr44/),
and tested on Lua 5.2.3, Lua 5.3.0 and LuaJIT.

parseucd.lua is a pure Lua script generate unidata.h, to support convert
characters and check characters' category.

It mainly used to compatible with Lua's own string module, it passed all
string and pattern matching test in lua test suite[2].

It also adds some useful routines against UTF-8 features, such as:
- a convenient interface to escape Unicode sequence in string.
- string insert/remove, since UTF-8 substring extract may expensive.
- calculate Unicode width, useful when implement e.g. console emulator.
- a useful interface to translate Unicode offset and byte offset.
- checking UTF-8 strings for validity and removing invalid byte sequences.

Note that to avoid conflict with the Lua5.3's buitin library 'utf8',
this library produce a file like lua-utf8.dll or lua-utf8.so. so use
it like this:

```lua
local utf8 = require 'lua-utf8'
```

in your codes :-(

[2]: http://www.lua.org/tests/5.2/


## LuaRocks Installation

`luarocks install luautf8`

It's now full-compatible with Lua5.3's utf8 library, so replace this
file (and headers) with lua5.3 source's lutf8lib.c is also okay.

## Usage

Many routines are same as Lua's string module:
- `utf8.byte`
- `utf8.char`
- `utf8.find`
- `utf8.gmatch`
- `utf8.gsub`
- `utf8.len`
- `utf8.lower`
- `utf8.match`
- `utf8.reverse`
- `utf8.sub`
- `utf8.upper`

The document of these functions can be find in Lua manual[3].

[3]: http://www.lua.org/manual/5.2/manual.html#6.4


Some routines in string module needn't support Unicode:
- `string.dump`
- `string.format`
- `string.rep`

They are NOT in utf8 module.

Some routines are the compatible for Lua 5.3's basic UTF-8 support
library:
- `utf8.offset`
- `utf8.codepoint`
- `utf8.codes`

See Lua5.3's manual to get usage.

Some routines are new, with some Unicode-spec functions:


## utf8.byte (s [, i [, j]])
Returns the internal numerical codes of the characters s[i], s[i+1], ..., s[j]. The default value for i is 1; the default value for j is i. These indices are corrected following the same rules of function string.sub.
Numerical codes are not necessarily portable across platforms.

## utf8.char (···)
Receives zero or more integers. Returns a string with length equal to the number of arguments, in which each character has the internal numerical code equal to its corresponding argument.
Numerical codes are not necessarily portable across platforms.

## utf8.find (s, pattern [, init [, plain]])
Looks for the first match of pattern in the string s. If it finds a match, then find returns the indices of s where this occurrence starts and ends; otherwise, it returns nil. A third, optional numerical argument init specifies where to start the search; its default value is 1 and can be negative. A value of true as a fourth, optional argument plain turns off the pattern matching facilities, so the function does a plain "find substring" operation, with no characters in pattern being considered magic. Note that if plain is given, then init must be given as well.

If the pattern has captures, then in a successful match the captured values are also returned, after the two indices.

## utf8.gsub (s, pattern, repl [, n])
Returns a copy of s in which all (or the first n, if given) occurrences of the pattern have been replaced by a replacement string specified by repl, which can be a string, a table, or a function. gsub also returns, as its second value, the total number of matches that occurred. The name gsub comes from Global SUBstitution.

## utf8.gmatch (s, pattern)
Returns an iterator function that, each time it is called, returns the next captures from pattern over the string s. If pattern specifies no captures, then the whole match is produced in each call.

## utf8.match (s, pattern [, init])
Looks for the first match of pattern in the string s. If it finds one, then match returns the captures from the pattern; otherwise it returns nil. If pattern specifies no captures, then the whole match is returned. A third, optional numerical argument init specifies where to start the search; its default value is 1 and can be negative.

## utf8.len (s)
Receives a string and returns its length. The empty string "" has length 0. Embedded zeros are counted, so "a\000bc\000" has length 5.

## utf8.lower (s)
Receives a string and returns a copy of this string with all uppercase letters changed to lowercase. All other characters are left unchanged. The definition of what an uppercase letter is depends on the current locale.

## utf8.reverse (s)
Returns a string that is the string s reversed.

## utf8.sub (s, i [, j])
Returns the substring of s that starts at i and continues until j; i and j can be negative. If j is absent, then it is assumed to be equal to -1 (which is the same as the string length). In particular, the call string.sub(s,1,j) returns a prefix of s with length j, and string.sub(s, -i) returns a suffix of s with length i.
If, after the translation of negative indices, i is less than 1, it is corrected to 1. If j is greater than the string length, it is corrected to that length. If, after these corrections, i is greater than j, the function returns the empty string.

## utf8.upper (s)
Receives a string and returns a copy of this string with all lowercase letters changed to uppercase. All other characters are left unchanged. The definition of what a lowercase letter is depends on the current locale.


## utf8.escape(str) -> utf8 string
escape a str to UTF-8 format string. It support several escape format:

 * `%ddd` - which ddd is a decimal number at any length:
   change Unicode code point to UTF-8 format.
 * `%{ddd}` - same as `%nnn` but has bracket around.
 * `%uddd` - same as `%ddd`, u stands Unicode
 * `%u{ddd}` - same as `%{ddd}`
 * `%xhhh` - hexadigit version of `%ddd`
 * `%x{hhh}` same as `%xhhh`.
 * `%?` - '?' stands for any other character: escape this character.

### Examples:
```lua
local u = utf8.escape
print(u"%123%u123%{123}%u{123}%xABC%x{ABC}")
print(u"%%123%?%d%%u")
```

## utf8.charpos (s [[, charpos], index]) -> charpos, code point
convert UTF-8 position to byte offset.
if only `index` is given, return byte offset of this UTF-8 char index.
if both `charpos` and `index` is given, a new `charpos` will be
calculated, by add/subtract UTF-8 char `index` to current `charpos`.
in all cases, it returns a new char position, and code point (a
number) at this position.

## utf8.next (s [, charpos[, index]]) -> charpos, code point
iterate though the UTF-8 string s.
If only s is given, it can used as a iterator:
```lua
for pos, code in utf8.next, "utf8-string" do
   -- ...
end
```
if only `charpos` is given, return the next byte offset of in string.
if `charpos` and `index` is given, a new `charpos` will be calculated, by
add/subtract UTF-8 char offset to current charpos.
in all case, it return a new char position (in bytes), and code point
(a number) at this position.

## utf8.insert (s [, idx], substring) -> new_string
insert a substring to s. If idx is given, insert substring before char at
this index, otherwise substring will concat to s. idx can be negative.


## utf8.remove (s [, start[, stop]]) -> new_string
delete a substring in s. If neither start nor stop is given, delete the
last UTF-8 char in s, otherwise delete char from start to end of s. if
stop is given, delete char from start to stop (include start and stop).
start and stop can be negative.


## utf8.width (s [, ambi_is_double[, default_width]]) -> width
calculate the width of UTF-8 string s. if ambi_is_double is given, the
ambiguous width character's width is 2, otherwise it's 1.
fullwidth/doublewidth character's width is 2, and other character's width
is 1.
if default_width is given, it will be the width of unprintable character,
used display a non-character mark for these characters.
if s is a code point, return the width of this code point.


## utf8.widthindex (s, location[, ambi_is_double[, default_width]]) -> idx, offset, width
return the character index at given location in string s. this is a
reverse operation of utf8.width().
this function return a index of location, and a offset in in UTF-8
encoding. e.g. if cursor is at the second column (middle) of the wide
char, offset will be 2. the width of character at idx is returned, also.


## utf8.title (s) -> new_string
convert UTF-8 string s to title-case used to compare by ignore case.
if s is a number, it's treat as a code point and return a convert code
point (number). utf8.lower/utf8.upper has the same extension.

## utf8.fold (s) -> new_string
convert UTF-8 string s to folded case used to compare by ignore case.
if s is a number, it's treat as a code point and return a convert code
point (number). utf8.lower/utf8.upper has the same extension.


## utf8.ncasecmp (a, b) -> [-1,0,1]
compare a and b without case, -1 means a < b, 0 means a == b and 1 means a > b.


## utf8.isvalid (s) -> boolean
check whether s is a valid UTF-8 string or not.


## utf8.clean (s [, replacement_string]) -> cleaned_string, was_valid
replace any invalid UTF-8 byte sequences in s with the replacement string.
if no replacement string is provided, the default is "�" (REPLACEMENT CHARACTER U+FFFD).
note that *any* number of consecutive invalid bytes will be replaced by a single copy of the replacement string.
the 2nd return value is true if the original string was already valid (meaning no replacements were made).


## utf8.invalidoffset (s [, init]) -> offset
return the byte offset within s of the first invalid UTF-8 byte sequence.
(1 is the first byte of the string.)
if s is a valid UTF-8 string, return nil.
the optional numeric argument init specifies where to start the search; its default value is 1 and can be negative.


## Improvement needed

- add Lua 5.3 spec test-suite.
- more test case.
- grapheme-compose support, and affect in utf8.reverse and utf8.width
- Unicode normalize algorithm implement.

## License

It use same license with Lua: http://www.lua.org/license.html
