# 欢迎使用 OpenResty Lua 代码补全插件

## 安装 (Install)

* 本插件尚未发布，请通过 vsix 文件手工安装
* 请将 *.api 接口声明文件放到 nginx/api 目录下

## 功能 (Features)

* 支持 require 文件跳转
* 支持 _load 文件跳转
* 支持变量定义跳转
* 支持全局库（api）代码补全
* 本地变量（upvalue）代码补全
* 支持有限制的 api 声明类型推导
* 支持 dao 模块类型推导
* 支持引用模块类型推导
* 支持本地变量类型推导
* 支持文档大纲

## 依赖 (Dependences)

* [luaparse](https://github.com/oxyc/luaparse)
* [luacheck](https://github.com/mpeterv/luacheck)
* [lua-fmt](https://github.com/trixnz/lua-fmt)

## 相关资源

* [VSCode插件开发全攻略](http://blog.haoji.me/vscode-plugin-overview.html)
* [VS Code 插件开发文档](https://www.bookstack.cn/read/VS-Code-Extension-Doc-ZH/README.md)
* [从零开始开发一款属于你的 Visual Studio Code 插件](https://www.bilibili.com/video/BV1CJ411v7CU/)

## 快速开始

```PowerShell

# 克隆本仓库
git clone git@gitee.com:sumdoo/openresty-vsce.git
cd openresty-vsce

# 清除文件
# rimraf .\node_modules\
# rimraf .\out\

# 依赖安装
yarn

# 覆盖文件
copy .\ast.d.ts   .\node_modules\@types\luaparse\lib\ast.d.ts

# 监听文件并编译ts文件
# yarn watch

# 打包
# yarn package

```
