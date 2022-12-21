# bit

https://bitop.luajit.org/index.html

Lua BitOp is a C extension module for Lua 5.1/5.2 which adds bitwise operations on numbers.

Lua BitOp is Copyright © 2008-2012 Mike Pall. Lua BitOp is free software, released under the MIT license (same license as the Lua core).

## bit.tobit(x) -> number

Normalizes a number to the numeric range for bit operations and returns it. This function is usually not needed since all bit operations already normalize all of their input arguments. Check the operational semantics for details.

```lua
print(0xffffffff)                --> 4294967295 (*)
print(bit.tobit(0xffffffff))     --> -1
printx(bit.tobit(0xffffffff))    --> 0xffffffff
print(bit.tobit(0xffffffff + 1)) --> 0
print(bit.tobit(2^40 + 1234))    --> 1234
```

(*) See the treatment of [hex literals](https://bitop.luajit.org/semantics.html#hexlit) for an explanation why the printed numbers in the first two lines differ (if your Lua installation uses a double number type).

## bit.tohex(x [,n]) -> string

Converts its first argument to a hex string. The number of hex digits is given by the absolute value of the optional second argument. Positive numbers between 1 and 8 generate lowercase hex digits. Negative numbers generate uppercase hex digits. Only the least-significant 4*|n| bits are used. The default is to generate 8 lowercase hex digits.

```lua
print(bit.tohex(1))              --> 00000001
print(bit.tohex(-1))             --> ffffffff
print(bit.tohex(0xffffffff))     --> ffffffff
print(bit.tohex(-1, -8))         --> FFFFFFFF
print(bit.tohex(0x21, 4))        --> 0021
print(bit.tohex(0x87654321, 4))  --> 4321
```

## bit.bnot(x) -> number

Returns the bitwise **not** of its argument.

```lua
print(bit.bnot(0))            --> -1
printx(bit.bnot(0))           --> 0xffffffff
print(bit.bnot(-1))           --> 0
print(bit.bnot(0xffffffff))   --> 0
printx(bit.bnot(0x12345678))  --> 0xedcba987
```

## bit.bor(x1 [,x2...]) -> number

Returns the bitwise **or** of all of its arguments.
Note that more than two arguments are allowed.

```lua
print(bit.bor(1, 2, 4, 8))                --> 15
printx(bit.band(0x12345678, 0xff))        --> 0x00000078
printx(bit.bxor(0xa5a5f0f0, 0xaa55ff00))  --> 0x0ff00ff0
```

## bit.band(x1 [,x2...]) -> number

Returns the bitwise **and** of all of its arguments.
Note that more than two arguments are allowed.

```lua
print(bit.bor(1, 2, 4, 8))                --> 15
printx(bit.band(0x12345678, 0xff))        --> 0x00000078
printx(bit.bxor(0xa5a5f0f0, 0xaa55ff00))  --> 0x0ff00ff0
```

## bit.bxor(x1 [,x2...]) -> number

Returns the bitwise **xor** of all of its arguments.
Note that more than two arguments are allowed.

```lua
print(bit.bor(1, 2, 4, 8))                --> 15
printx(bit.band(0x12345678, 0xff))        --> 0x00000078
printx(bit.bxor(0xa5a5f0f0, 0xaa55ff00))  --> 0x0ff00ff0
```

## bit.lshift(x, n) -> number

Returns the bitwise **logical left-shift** of its first argument by the number of bits given by the second argument.

Logical shifts treat the first argument as an unsigned number and shift in 0-bits.

Only the lower 5 bits of the shift count are used (reduces to the range [0..31]).

```lua
print(bit.lshift(1, 0))              --> 1
print(bit.lshift(1, 8))              --> 256
print(bit.lshift(1, 40))             --> 256
print(bit.rshift(256, 8))            --> 1
print(bit.rshift(-256, 8))           --> 16777215
print(bit.arshift(256, 8))           --> 1
print(bit.arshift(-256, 8))          --> -1
printx(bit.lshift(0x87654321, 12))   --> 0x54321000
printx(bit.rshift(0x87654321, 12))   --> 0x00087654
printx(bit.arshift(0x87654321, 12))  --> 0xfff87654
```

## bit.rshift(x, n) -> number

Returns the bitwise **logical right-shift** of its first argument by the number of bits given by the second argument.

Logical shifts treat the first argument as an unsigned number and shift in 0-bits.

Only the lower 5 bits of the shift count are used (reduces to the range [0..31]).

```lua
print(bit.lshift(1, 0))              --> 1
print(bit.lshift(1, 8))              --> 256
print(bit.lshift(1, 40))             --> 256
print(bit.rshift(256, 8))            --> 1
print(bit.rshift(-256, 8))           --> 16777215
print(bit.arshift(256, 8))           --> 1
print(bit.arshift(-256, 8))          --> -1
printx(bit.lshift(0x87654321, 12))   --> 0x54321000
printx(bit.rshift(0x87654321, 12))   --> 0x00087654
printx(bit.arshift(0x87654321, 12))  --> 0xfff87654
```

## bit.arshift(x, n) -> number

Returns the bitwise **arithmetic right-shift** of its first argument by the number of bits given by the second argument.

Arithmetic right-shift treats the most-significant bit as a sign bit and replicates it.

Only the lower 5 bits of the shift count are used (reduces to the range [0..31]).

```lua
print(bit.lshift(1, 0))              --> 1
print(bit.lshift(1, 8))              --> 256
print(bit.lshift(1, 40))             --> 256
print(bit.rshift(256, 8))            --> 1
print(bit.rshift(-256, 8))           --> 16777215
print(bit.arshift(256, 8))           --> 1
print(bit.arshift(-256, 8))          --> -1
printx(bit.lshift(0x87654321, 12))   --> 0x54321000
printx(bit.rshift(0x87654321, 12))   --> 0x00087654
printx(bit.arshift(0x87654321, 12))  --> 0xfff87654
```

## bit.rol(x, n) -> number

Returns the bitwise **left rotation** of its first argument by the number of bits given by the second argument. Bits shifted out on one side are shifted back in on the other side.

Only the lower 5 bits of the rotate count are used (reduces to the range [0..31]).

```lua
printx(bit.rol(0x12345678, 12))   --> 0x45678123
printx(bit.ror(0x12345678, 12))   --> 0x67812345
```

## bit.ror(x, n) -> number

Returns either the bitwise **right rotation** of its first argument by the number of bits given by the second argument. Bits shifted out on one side are shifted back in on the other side.

Only the lower 5 bits of the rotate count are used (reduces to the range [0..31]).

```lua
printx(bit.rol(0x12345678, 12))   --> 0x45678123
printx(bit.ror(0x12345678, 12))   --> 0x67812345
```

## bit.bswap(x) -> number

Swaps the bytes of its argument and returns it. This can be used to convert little-endian 32 bit numbers to big-endian 32 bit numbers or vice versa.

```lua
printx(bit.bswap(0x12345678)) --> 0x78563412
printx(bit.bswap(0x78563412)) --> 0x12345678
```
