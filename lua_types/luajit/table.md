
table
=====

table 是 Lua 的一种数据结构用来帮助我们创建不同的数据类型，如：数组、字典等。

Lua table 使用关联型数组，你可以用任意类型的值来作数组的索引，但这个值不能是 nil。

Lua table 是不固定大小的，你可以根据自己需要进行扩容。

Lua也是通过table来解决模块（module）、包（package）和对象（Object）的。 例如string.format表示使用"format"来索引table string。

table.new
------------
**语法:** *table = table.concat (narray, nhash)*

用来预分配 table 空间。

table.clear
------------
**语法:** table.clear (table)*

用来高效的释放 table 空间。

table.concat
------------
**语法:** *str = table.concat (table [, sep [, start [, end]]])*

concat是concatenate(连锁, 连接)的缩写.
table.concat()函数列出参数中指定table的数组部分从start位置到end位置的所有元素, 元素间以指定的分隔符(sep)隔开。

table.insert
------------
**语法:** *table.insert (table, [pos,] value)*

在table的数组部分指定位置(pos)插入值为value的一个元素. pos参数可选, 默认为数组部分末尾。

table.maxn
----------
**语法:** *table.maxn (table)*

指定table中所有正数key值中最大的key值. 如果不存在key值为正数的元素, 则返回0。

table.remove
------------
**语法:** *table.remove (table [, pos])*

返回table数组部分位于pos位置的元素. 其后的元素会被前移. pos参数可选, 默认为table长度, 即从最后一个元素删起。

