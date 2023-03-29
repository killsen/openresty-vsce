
# 如何使用本插件运行代码和调试

## 准备工作

* 安装 [OpenResty Lua 代码补全插件](https://marketplace.visualstudio.com/items?itemName=killsen.openresty-vsce)
* 下载最新版本 [OpenResty](https://openresty.org/cn/download.html) 并解压

```PowerShell
Invoke-WebRequest -OutFile .\openresty-1.21.4.1-win64.zip -Uri "https://openresty.org/download/openresty-1.21.4.1-win64.zip"
Expand-Archive -Path .\openresty-1.21.4.1-win64.zip -DestinationPath .\ -Force
cd .\openresty-1.21.4.1-win64
code .
```

* 修改 conf/nginx.conf 配置文件，新增 /debug 路径，以下为最简化的 nginx.conf 配置文件示例：
```conf
master_process off; # 不启用主进程
worker_processes 1; # 工作进程数量
events {
    worker_connections  1024;
}
http {
    include mime.types;
    server {
        listen 80;
        location / {
            root   html;
            index  index.html index.htm;
        }
        # VsCode 插件调试路径
        location = /debug {
            allow           127.0.0.1;
            deny            all;
            access_log      off;
            content_by_lua  "loadfile(ngx.var.http_debugger)()";
        }
    }
}
```

## 启动 nginx

```PowerShell
# 启动 nginx
Start-Process .\nginx.exe -NoNewWindow

# 关闭全部 nginx 进程
# Get-Process -Name "nginx*" | Stop-Process -PassThru
```

## 运行代码

* 创建 lua 文件并编写代码，一个非常简单的示例如下：

```lua
local abc = ngx.localtime()
local xyz = ngx.now()

return {
    abc = abc,
    xyz = xyz,
    fun = function() end
}
```

* 执行 openresty.action (默认快捷键 F5) 即可在 OpenResty 的环境下运行代码，并输出返回值：

```lua
{
        abc = "2023-03-29 16:42:17"
    ,   xyz = 1680079337.193
    ,   fun = function () end
    }
```

* 在空白处(不选中代码中某个变量)，执行 openresty.debug (默认快捷键 F4) 即可在 OpenResty 的环境下运行代码并输出该位置以上的 local 或 upvalue 变量，如上例代码运行后将输出以下内容：

```lua
-- local --------------------------

--[[1]] local abc = "2023-03-29 16:42:17"
--[[2]] local xyz = 1680079337.193

-- upvalue ------------------------
```

* 选中代码中某个变量后，执行 openresty.debug (默认快捷键 F4) 即可在 OpenResty 的环境下运行代码并输出该变量的值，如上例代码选中 abc 变量后执行该操作将输出以下内容：

```lua
abc = "2023-03-29 16:42:17"
```

## 调试代码

* 在 .vscode/lauch.json 配置文件中，新增启动项目 OpenResty: Attach

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "openresty_attach",
            "request": "attach",
            "name": "OpenResty: Attach",
            "pid": 0,
            "processName": "nginx.exe",
            "captureLog": false
        }
    ]
}
```

* 在 vscode 中切换到 “运行和调试(Ctrl+Shift+D)”，选中以上配置的启动项目，并点击“开始调试”

* 在代码中添加断点后，执行 openresty.action (默认快捷键 F5) 即可在 OpenResty 的环境下运行代码至该断点处


## 关闭 nginx

```PowerShell
# 启动 nginx
# Start-Process .\nginx.exe -NoNewWindow

# 关闭全部 nginx 进程
Get-Process -Name "nginx*" | Stop-Process -PassThru
```
