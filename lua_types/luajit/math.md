# math

Lua - 数学库
https://www.w3schools.cn/lua/lua_math_library.asp

## math.huge

值 HUGE_VAL，大于或等于任何其他数值的值。

## math.pi

圆周率 π 的值 3.1415926535898

## math.abs (x)

返回 x 的绝对值。

## math.acos (x)

返回 x 的反余弦值（以弧度为单位）。

## math.asin (x)

返回 x 的反正弦（以弧度为单位）。

## math.atan (x)

返回 x 的反正切（以弧度为单位）。

## math.atan2 (y, x)

返回 y/x 的反正切（以弧度为单位），但使用两个参数的符号来查找结果的象限。 （它还可以正确处理 x 为零的情况。）

## math.ceil (x)

返回大于或等于 x 的最小整数。

## math.cos (x)

返回 x 的余弦（假定为弧度）。

## math.cosh (x)

返回 x 的双曲余弦值。

## math.deg (x)

返回以度为单位的角度 x（以弧度为单位）。

## math.exp (x)

返回值 e 幂 x。

## math.floor (x)

返回小于或等于 x 的最大整数。

## math.fmod (x, y)

返回 x 除以 y 的余数，该余数将商向零舍入。

## math.frexp (x)

返回 m 和 e 使得 x = m2e, e 是一个整数并且 m 的绝对值在 [0.5, 1) 范围内（或者当 x 为零时为零）。

## math.ldexp (m, e)

返回 m2e（e 应该是一个整数）。

## math.log (x)

返回 x 的自然对数。

## math.log10 (x)

返回 x 的以 10 为底的对数。

## math.max (x, ...)

返回其参数中的最大值。

## math.min (x, ...)

返回其参数中的最小值。

## math.modf (x)

返回两个数字，x 的整数部分和 x 的小数部分。

## math.pow (x, y)

返回 xy。 （您也可以使用表达式 x^y 来计算此值。）

## math.rad (x)

返回以弧度为单位的角度 x（以度为单位）。

## math.random ([m [, n]])

此函数是 ANSI C 提供的简单伪随机生成器函数 rand 的接口。当不带参数调用时，返回范围 [0,1) 内的统一伪随机实数。 当使用整数 m 调用时，math.random 返回范围 [1, m] 内的统一伪随机整数。 当使用两个整数 m 和 n 调用时，math.random 返回范围 [m, n] 内的统一伪随机整数。

## math.randomseed (x)

将 x 设置为伪随机生成器的"种子"：相等的种子产生相等的数字序列。

## math.sin (x)

返回 x 的正弦值（假定为弧度）。

## math.sinh (x)

返回 x 的双曲正弦值。

## math.sqrt (x)

返回 x 的平方根。 （您也可以使用表达式 x^0.5 来计算此值。）

## math.tan (x)

返回 x 的正切（假定为弧度）。

## math.tanh (x)

返回 x 的双曲正切。
