# date

LuaDate v2.2
Lua Date and Time module for Lua 5.x.
https://tieske.github.io/date/

## date (...)
创建日期时间对象

* date(): 不指定参数
* date(num_time): 传入时间戳
* date(tbl_date)：传入对象表达式
* date(str_date)：传入日期格式字符串
* date(true)：返回 UTC time
* date(false)：返回 local time
* date(int_year, var_month, int_day, [num_hour], [num_min], [num_sec], [int_ticks])

```lua
local a = date(2006, 8, 13)
assert(a == date("Sun Aug 13 2006"))

local b = date("Jun 13 1999")
assert(b == date(1999, 6, 13))

local c = date(1234483200)
assert(c == date("Feb 13 2009"))

local d = date {
    year    = 2022,
    month   = 10,
    day     = 1,
    hour    = 12,
    min     = 30,
    sec     = 0,
}
assert(d == date("2022-10-01 12:30:00"))

local e = date()
assert(e)
```

## date.isodate(int_year, int_week, int_wday)
传入年，年的第几周，周的第几日创建日期对象

## date.diff(var_date1, var_date2)
返回两个日期的差异对象
```lua
-- get the days between two dates
d = date.diff("Jan 7 1563", date(1563, 1, 2))
assert(d:spandays()==5)
```

## date.epoch()
新纪元时间 Epoch 是以 1970-01-01 00:00:00 UTC 为标准的时间，
将目标时间与 1970-01-01 00:00:00时间的差值以秒来计算。
```lua
assert(date.epoch()==date("jan 1 1970"))
```

## date.isleapyear(var_year)
是否润年
```lua
d = date(1776, 1, 1)
assert(date.isleapyear(d))
assert(date.isleapyear(d:getyear()))
assert(date.isleapyear(1776))
```

## date.getcenturyflip()
返回全局设置 century_flip: 0 ~ 100 之间, 默认值为 0

## date.setcenturyflip(century_flip)
修改全局设置 century_flip: 0 ~ 100 之间

```lua
-- 两位数年将视为 19xx
date.setcenturyflip(0)  -- 默认值
assert(date("01-01-00")==date(1900,01,01))
assert(date("01-01-50")==date(1950,01,01))
assert(date("01-01-99")==date(1999,01,01))

-- 两位数年将视为 20xx
date.setcenturyflip(100)
assert(date("01-01-00")==date(2000,01,01))
assert(date("01-01-50")==date(2050,01,01))
assert(date("01-01-99")==date(2099,01,01))

-- 两位数年: 小于50将视为 20xx，大于或等于50将视为 19xx
date.setcenturyflip(50)
assert(date("01-01-00")==date(2000,01,01))
assert(date("01-01-49")==date(2049,01,01))
assert(date("01-01-50")==date(1950,01,01))
assert(date("01-01-99")==date(1999,01,01))
```

## spandays()
返回相差天数

## spanhours()
返回相差小时数

## spanminutes()
返回相差分钟数

## spanseconds()
返回相差秒数

## spanticks()
返回相差微秒数

## copy()
克隆日期对象

## fmt(str_code)
输出格式化日期字符串

* '%y'	两位年份，如 00 - 99
* '%Y'	四位年份，如 2020
* '%m'	两位月份，如 01 - 12
* '%d'	月份第几天，如 1 - 31
* '%H'	24小时制两位小时，如 00 - 23
* '%I'	12小时制两位小时，如 01 - 12
* '%M'	两位分钟，如 00 - 59
* '%S'	两位秒数，如 00 - 59

* '%a'	星期几英文缩写，如 Sun
* '%A'	星期几英文全称，如 Sunday
* '%b'	月份的英文缩写，如 Dec
* '%B'	月份的英文全称，如 December
* '%C'	两位年份，如 19, 20, 30
* '%g'	ISO两位年份，如 00 (79)
* '%G'	ISO四位年份，如 0000 (1979)
* '%h'	月份的英文缩写，如 Dec
* '%j'	三位年的第几天，如 001 - 366
* '%p'	AM/PM
* '%u'	ISO星期几，如 1 - 7
* '%U'	星期天为第一天的第几周
* '%V'	ISO 8601 week of the year, from 01 (48)
* '%w'	星期几，星期天为0
* '%W'	星期一为第一天的第几周
* '%z'	时区偏差，如 +1000, -0230
* '%Z'	时区名称
* '%\b'	Year, if year is in BCE, prints the BCE Year representation, otherwise result is similar to "%Y" (1 BCE, 40 BCE) #
* '%\f'	Seconds including fraction (59.998, 01.123) #

* '%%'	percent character %

* '%r'	12-hour time, from 01:00:00 AM (06:55:15 AM); same as "%I:%M:%S %p"
* '%R'	hour:minute, from 01:00 (06:55); same as "%I:%M"
* '%T'	24-hour time, from 00:00:00 (06:55:15); same as "%H:%M:%S"
* '%D'	month/day/year from 01/01/00 (12/02/79); same as "%m/%d/%y"
* '%F'	year-month-day (1979-12-02); same as "%Y-%m-%d"
* '%c'	The preferred date and time representation; same as "%x %X"
* '%x'	The preferred date representation, same as "%a %b %d %\b"
* '%X'	The preferred time representation, same as "%H:%M:%\f"

* '${iso}'	    Iso format, same as "%Y-%m-%dT%T"
* '${http}'	    http format, same as "%a, %d %b %Y %T GMT"
* '${ctime}'	ctime format, same as "%a %b %d %T GMT %Y"
* '${rfc850}'	RFC850 format, same as "%A, %d-%b-%y %T GMT"
* '${rfc1123}'	RFC1123 format, same as "%a, %d %b %Y %T GMT"
* '${asctime}'	asctime format, same as "%a %b %d %T %Y"

## tolocal()
转成本地时间

## toutc()
转成utc时间

## addyears(int_years)
添加年数

## addmonths(int_months)
添加月数

## adddays(int_days)
添加天数

## addhours(num_hours)
添加小时数

## addminutes(num_minutes)
添加分钟数

## addseconds(num_sec)
添加秒数

## addticks(num_ticks)
添加微秒数

## getyear()
取得年

## getmonth()
取得月

## getday()
取得日

## gethours()
取得小时

## getminutes()
取得分钟

## getseconds()
取得秒

## getticks()
取得微秒

## getdate()
取得年，月，日

## gettime()
取得小时，分钟，秒，微秒

## getyearday()
取得年的第几天

## getweeknumber()
取得年的第几周

## getweekday()
取得星期几

## getisodate()
取得 ISO 年，年的第几周，周的第几日

## getisoyear()
取得 ISO 年

## getisoweeknumber()
取得 ISO 年的第几周

## getisoweekday()
取得 ISO 周的第几日

## getbias()
取得时区

## getclockhour()
取得时针指向的数字，1-12

## getfracsec()
返回秒数(含微秒数)

## setyear(int_year, var_month, int_mday)
修改年，月，日

## setmonth(var_month, int_mday)
修改月，日

## setday(int_mday)
修改日

## sethours(num_hour, num_min, num_sec, num_ticks)
修改小时，分钟，秒，微秒

## setminutes(num_min, num_sec, num_ticks)
修改分钟，秒，微秒

## setseconds(num_sec, num_ticks)
修改秒，微秒

## setticks(num_ticks)
修改微秒

## setisoyear(int_year, int_week, int_wday)
修改 ISO 年，年的第几周，周的第几日

## setisoweeknumber(int_week, int_wday)
修改 ISO 年的第几周，周的第几日

## setisoweekday(int_wday)
修改 ISO 周的第几日
