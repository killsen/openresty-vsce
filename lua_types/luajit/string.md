# string

Lua - 字符串
https://www.w3schools.cn/lua/lua_strings.asp

## string.byte (s [,i [, j]])

函数返回字符s[i], s[i+1], ···, s[j]的内部数字编码(ASCII码)，其中参数i的默认值是1，而参数j的默认值是i。需要注意的是该函数在返回的数字编码在跨平台方面不一定是可移植的。

## string.char (...)

将ASCII码转化为相对应字符，在功能上与函数string.byte()是互逆的。

接收0个或者多个参数，返回一个字符串，字符串长度等于参数个数，前提是每一参数作为ASCII码都有一个字符与之相对应，也就是说大部分的数字是无效的，这个函数参数的ASCII码在跨平台方面不一定是可移植的。

## string.dump (func)

返回一个包含所给函数二进制描述的字符串，以至于在此之后可以使用函数loadstring()利用所得到的字符串来返回一个函数拷贝，需要注意的是函数只能是Lua函数并且没有upvalues(外部局部变量)

## string.find (s, pattern [,i [,j]])

返回主字符串中 pattern 的开始索引和结束索引，如果没有找到，则返回 nil。

## string.format (s, ...)

返回一个格式化的字符串。

## string.gmatch (s, pattern)

返回一个迭代器函数，每一次调用这个函数，返回一个在字符串 s 找到的下一个符合 pattern 描述的子串。如果参数 pattern 描述的字符串没有找到，迭代函数返回 nil。

## string.gsub (s, pattern, replace [,n])

通过用 replace 替换 pattern 的出现来返回一个字符串。

## string.len (s)

返回字符串的长度。

## string.lower (s)

返回字符串的小写形式。

## string.match (s, pattern [,init])

在字符串s中查找满足参数pattern的匹配子串，如果找到了一个匹配就返回这个匹配子串，若没找到则返回nil，如果参数pattern没有指定匹配参数，则返回整个匹配字符串

## string.rep (s, n)

通过重复相同的字符串 n 次来返回一个字符串。

## string.reverse (s)

通过反转传递的字符串的字符来返回一个字符串。

## string.upper (s)

返回字符串的大写形式。
