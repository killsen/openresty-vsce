# Lua 调试(Debug)

Lua 提供了 debug 库用于提供创建我们自定义调试器的功能。Lua 本身并未有内置的调试器，但很多开发者共享了他们的 Lua 调试器代码。

Lua 中 debug 库包含以下函数：

## debug.debug

**语法:** *debug.debug()*

进入一个用户交互模式，运行用户输入的每个字符串。
使用简单的命令以及其它调试设置，用户可以检阅全局变量和局部变量，改变变量的值，计算一些表达式，等等。
输入一行仅包含 cont 的字符串将结束这个函数，这样调用者就可以继续向下运行。

注意，debug.debug 输入的命令在文法上并没有内嵌到任何函数中，因此不能直接去访问局部变量。

## debug.getfenv

**语法:** *debug.getfenv(object)*

返回对象的环境变量。

## debug.setfenv

**语法:** *debug.setfenv(f, table)*

设置一个函数的环境：
 * 当第一个参数为一个函数时，表示设置该函数的环境
 * 当第一个参数为一个数字时，为1代表当前函数，2代表调用自己的函数，3代表调用自己的函数的函数，以此类推

## debug.gethook

**语法:** *debug.gethook([thread])*

返回三个表示线程钩子设置的值：当前钩子函数，当前钩子掩码，当前钩子计数（debug.sethook 设置的那些）。

## debug.getinfo

**语法:** *debug.getinfo ([thread,] f [, what])*

返回关于一个函数信息的表。你可以直接提供该函数，也可以用一个数字 f 表示该函数。数字 f 表示运行在指定线程的调用栈对应层次上的函数：0 层表示当前函数（getinfo 自身）；1 层表示调用 getinfo 的函数（除非是尾调用，这种情况不计入栈）；等等。如果 f 是一个比活动函数数量还大的数字，getinfo 返回 nil。

只有字符串 what 中有描述要填充哪些项，返回的表可以包含 lua_getinfo 能返回的所有项。what 默认是返回提供的除合法行号表外的所有信息。对于选项 'f' ，会在可能的情况下，增加func 域保存函数自身。对于选项 'L' ，会在可能的情况下，增加activelines 域保存合法行号表。

例如,表达式 debug.getinfo(1,"n")返回带有当前函数名字信息的表（如果找的到名字的话），表达式 debug.getinfo(print) 返回关于 print 函数的包含有所有能提供信息的表。

## debug.getlocal

**语法:** *debug.getlocal ([thread,] f, local)*

此函数返回在栈的 f 层处函数的索引为 local 的局部变量的名字和值。这个函数不仅用于访问显式定义的局部变量，也包括形参、临时变量等。

第一个形参或是定义的第一个局部变量的索引为 1 ，然后遵循在代码中定义次序，以次类推。其中只计算函数当前作用域的活动变量。负索引指可变参数；-1 指第一个可变参数。如果该索引处没有变量，函数返回 nil。若指定的层次越界，抛出错误。（你可以调用 debug.getinfo 来检查层次是否合法。）

以 '(' （开括号）打头的变量名表示没有名字的变量（比如是循环控制用到的控制变量，或是去除了调试信息的代码块）。

参数 f 也可以是一个函数。这种情况下，getlocal 仅返回函数形参的名字。

## debug.getmetatable

**语法:** *debug.getmetatable(value)*

返回给定 value 的元表。若其没有元表则返回 nil 。

## debug.getregistry

**语法:** *debug.getregistry()*

返回注册表表，这是一个预定义出来的表， 可以用来保存任何 C 代码想保存的 Lua 值。

## debug.getupvalue

**语法:** *debug.getupvalue (f, up)*

此函数返回函数 f 的第 up 个上值的名字和值。 如果该函数没有那个上值，返回 nil 。
以 '(' （开括号）打头的变量名表示没有名字的变量 （去除了调试信息的代码块）。

## debug.getuservalue

**语法:** *debug.getuservalue (u)*

返回关联在 u 上的 Lua 值。如果 u 并非用户数据，返回 nil。

## debug.sethook

**语法:** *debug.sethook ([thread,] hook, mask [, count])*

将一个函数作为钩子函数设入。字符串 mask 以及数字 count 决定了钩子将在何时调用。掩码是由下列字符组合成的字符串，每个字符有其含义：

 * 'c': 每当 Lua 调用一个函数时，调用钩子；
 * 'r': 每当 Lua 从一个函数内返回时，调用钩子；
 * 'l': 每当 Lua 进入新的一行时，调用钩子。 此外，传入一个不为零的 count ，钩子将在每运行 count 条指令时调用。

如果不传入参数，debug.sethook 关闭钩子。

当钩子被调用时，第一个参数是触发这次调用的事件："call" （或 "tail call"），"return"，"line"， "count"。
对于行事件，钩子的第二个参数是新的行号。在钩子内，你可以调用 getinfo ，指定第 2 层，来获得正在运行的函数的详细信息（0 层指 getinfo 函数，1 层指钩子函数）。

## debug.setlocal

**语法:** *debug.setlocal ([thread,] level, local, value)*

这个函数将 value 赋给栈上第 level 层函数的第 local 个局部变量。如果没有那个变量，函数返回 nil 。
如果 level 越界，抛出一个错误。（你可以调用 debug.getinfo 来检查层次是否合法。）否则，它返回局部变量的名字。

关于变量索引和名字，参见 debug.getlocal。

## debug.setmetatable

**语法:** *debug.setmetatable (value, table)*

将 value 的元表设为 table （可以是 nil）。 返回 value。

## debug.setupvalue

**语法:** *debug.setupvalue (f, up, value)*

这个函数将 value 设为函数 f 的第 up 个上值。
如果函数没有那个上值，返回 nil 否则，返回该上值的名字。

## debug.setuservalue

**语法:** *debug.setuservalue (udata, value)*

这个函数将 value 设为函数 f 的第 up 个上值。
如果函数没有那个上值，返回 nil 否则，返回该上值的名字。

## debug.traceback

**语法:** *debug.traceback ([thread,] [message [, level]])*

如果 message 有，且不是字符串或 nil，函数不做任何处理直接返回 message。否则，它返回调用栈的栈回溯信息。
字符串可选项 message 被添加在栈回溯信息的开头。数字可选项 level 指明从栈的哪一层开始回溯（默认为 1 ，即调用 traceback 的那里）。

## debug.upvalueid

**语法:** *debug.upvalueid (f, n)*

返回指定函数第 n个上值的唯一标识符（一个轻量用户数据）。

这个唯一标识符可以让程序检查两个不同的闭包是否共享了上值。若 Lua 闭包之间共享的是同一个上值（即指向一个外部局部变量），会返回相同的标识符。

## debug.upvaluejoin

**语法:** *debug.upvaluejoin (f1, n1, f2, n2)*

让 Lua 闭包 f1 的第 n1 个上值引用 Lua 闭包 f2 的第 n2 个上值。
