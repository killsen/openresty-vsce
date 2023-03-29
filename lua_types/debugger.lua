
--[[
# 请在 nginx.conf 配置文件中加入调试路径:
location = /debug {
    content_by_lua "loadfile(ngx.var.http_debugger)()";
}
]]

local debug     = debug
local _encode   = require "cjson.safe".encode

-- 取得函数的形参列表
local function _args(fun)
    local args = {}
    local hook = function()
        local info = debug.getinfo(3)
        if info.name ~= 'pcall' then return end

        for i = 1, math.huge do
            local name = debug.getlocal(2, i)
            if name == '(*temporary)' or not name  then
                debug.sethook()
                error()
                return
            else
                args[i] = name
            end
        end
    end

    debug.sethook(hook, "c")
    pcall(fun)

    return args
end

local function _tojson(t, un_check)

    if not type(t)=="table" then return nil end

    if not un_check then
        for _, v in pairs(t) do
            if type(v)=="table" or
               type(v)=="function" then return nil end
            if type(v)=="string" and #v>50 then return nil end
        end
    end

    local json = _encode(t)
    if not json then return nil end

    json = ngx.re.gsub(json, [["(\w+)":]], "$1=")
    json = ngx.re.gsub(json, "\\,", ", ")
    json = ngx.re.gsub(json, "\\{", "{ ")
    json = ngx.re.gsub(json, "\\}", " }")
    json = ngx.re.gsub(json, "\\]", " }")
    json = ngx.re.gsub(json, "\\[", "{ ")

    return json

end

local function _quote(s)

    if #s<50 then -- 取得最短的输出
        local s1 = _encode(s)
              s1 = ngx.re.gsub(s1, [[\\']], [[']])
        local s2 = ngx.quote_sql_str(s)
              s2 = ngx.re.gsub(s2, [[\\"]], [["]])
        local s3 = string.format("%q", s)
              s3 = ngx.re.gsub(s3, [[\\']], [[']])
        if #s1<=#s2 and #s1<=#s3 then return s1 end
        if #s2<=#s1 and #s2<=#s3 then return s2 end
        if #s3<=#s1 and #s3<=#s2 then return s3 end
    end

    if not ngx.re.find(s, [=[[\[\]]]=]) then
        return "[[".. s .."]]"
    end

    local c
    for i=1, math.huge do
        c = string.rep("=",i)
        if not ngx.re.find(s, "\\["..c.."\\[") and
           not ngx.re.find(s, "\\]"..c.."\\]") then
            break
        end
    end
    return "["..c.."[".. s .."]"..c.."]"

end

local function _print(t, level)

    level = tonumber(level) or 1

    if t==nil then
        ngx.print "nil"
        return
    elseif type(t)=="string" then
        ngx.print(_quote(t))
        return
    elseif type(t)=="function" then
        local args = _args(t)
        ngx.print("function (", table.concat(args, ", "), ") end")
        return
    elseif type(t)~="table" then
        ngx.print(_encode(t) or tostring(t))
        return
    elseif level>5 then
        ngx.print( _tojson(t, true) or _encode(t) or tostring(t) )
        return
    end

    local json = _tojson(t)
    if json then ngx.print(json); return end

    local is_arr, maxn, keyn = true, 0, 0

    for i in pairs(t) do
        if type(i)=="number" then
            if i>maxn then maxn=i end
        else
            is_arr = false
        end
        if type(i)=="string" then
            if #i>keyn then keyn=#i end
        end
    end

    local tabs = string.rep("\t", level)

    ngx.say("{")

    if is_arr then
        for i=1, maxn do
            ngx.print(tabs, i>1 and "," or "", "\t")
            _print(t[i], level+1)
            ngx.say ""
        end
    else

        -- 对key进行排序
        local keys, fkeys, tkeys = {}, {}, {}
            for k, v in pairs(t) do
                -- 超过30个字符的key不输出
                if type(k)=="string" and #k<30 then
                    if type(v)=="function" then
                        table.insert(fkeys, k)
                    elseif type(v)=="table" then
                        table.insert(tkeys, k)
                    else
                        table.insert(keys, k)
                    end
                end
            end
        table.sort(keys); table.sort(fkeys); table.sort(tkeys)
        for _, k in ipairs(tkeys) do table.insert(keys, k) end
        for _, k in ipairs(fkeys) do table.insert(keys, k) end

        for i, k in ipairs(keys) do
            local v = t[k]
            ngx.print(tabs, i>1 and "," or "", "\t")
            if type(k)=="string" then
                ngx.print (k, string.rep(" ", keyn-#k) ," = ")
            else
                ngx.print ("[", tostring(k), "]", " = ")
            end
            _print(v, level+1)
            ngx.say ""
        end
    end

    ngx.say(tabs, "}")

end

local function _getlocal(level)
    ngx.say "\n-- local --------------------------\n"
    for i=1, math.huge do
        local name, value = debug.getlocal(level or 2, i)
        if not name or name == '(*temporary)' then return end
        ngx.print("--[[", i, "]]", " local ", name, " = ")
        _print(value)
        ngx.say ""
    end
end

local function _getupvalue(f)
    if type(f)~="function" then return end
    ngx.say "\n-- upvalue ------------------------\n"
    for i=1, math.huge do
        local name, value = debug.getupvalue(f, i)
        if not name then return end
        ngx.print("--[[", i, "]]", " local ", name, " = ")
        _print(value)
        ngx.say ""
    end
end

local function print_local()
    _getlocal(3)
    local info = debug.getinfo(2,"Slf")
    if info then _getupvalue(info.func) end
    ngx.exit(ngx.OK)
end

local function print_value(word, t)

    if type(t)~="table" then return end

    local only_one = true
        for i in pairs(t) do
            if type(i)~="number" or i>1 then
                only_one = false -- 检查是否多个值
            end
        end
    if only_one then t=t[1] end

    ngx.print (word, " = ")
    _print(t)

    ngx.exit(ngx.OK)
end

do
    if ngx.ctx["_DEBUGGING_"] then return end
       ngx.ctx["_DEBUGGING_"] = true

    ngx.header["content-type"] = "text/plain"
    ngx.header["language"    ] = "lua"

    local file_name, codes

    -- 取得待执行的lua文件
    file_name = ngx.var.http_file_name
    if not file_name and file_name == "" then return end

    if ngx.req.get_method() == "POST" then
        ngx.req.read_body()
        codes = ngx.req.get_body_data()
    end

    local fun, err, pok, obj

    if codes then
        fun, err = loadstring(codes)            -- 加载代码
    else
        fun, err = loadfile(file_name)          -- 加载文件
    end
    if not fun then return ngx.print(err) end   -- 输出错误信息

    rawset(_G, "_PRINT_LOCAL_", print_local)
    rawset(_G, "_PRINT_VALUE_", print_value)

    pok, obj = pcall(fun)

    rawset(_G, "_PRINT_LOCAL_", nil)
    rawset(_G, "_PRINT_VALUE_", nil)

    if not pok then return ngx.print(obj) end   -- 输出错误信息

    if type(obj) == "table" and type(obj._TESTING) == "function" then
        pok, obj = pcall(obj._TESTING)          -- 运行测试代码
    end

    if not pok then return ngx.print(obj) end   -- 输出错误信息

    if type(obj) == "string" then
        ngx.print(obj)
    elseif obj ~= nil then
        _print(obj)
    end

end
