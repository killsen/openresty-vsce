
ndk.set_var
-----------
**语法:** *res = ndk.set_var.DIRECTIVE_NAME*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

该机制允许调用这类 nginx C 模块指令：使用 [Nginx Devel Kit](https://github.com/simpl/ngx_devel_kit) (NDK) 的 set_var 的子模块的`ndk_set_var_value` 实现。

例如，下列[set-misc-nginx-module](http://github.com/openresty/set-misc-nginx-module)指令是可以通过这个方式调用的：

* [set_quote_sql_str](http://github.com/openresty/set-misc-nginx-module#set_quote_sql_str)
* [set_quote_pgsql_str](http://github.com/openresty/set-misc-nginx-module#set_quote_pgsql_str)
* [set_quote_json_str](http://github.com/openresty/set-misc-nginx-module#set_quote_json_str)
* [set_unescape_uri](http://github.com/openresty/set-misc-nginx-module#set_unescape_uri)
* [set_escape_uri](http://github.com/openresty/set-misc-nginx-module#set_escape_uri)
* [set_encode_base32](http://github.com/openresty/set-misc-nginx-module#set_encode_base32)
* [set_decode_base32](http://github.com/openresty/set-misc-nginx-module#set_decode_base32)
* [set_encode_base64](http://github.com/openresty/set-misc-nginx-module#set_encode_base64)
* [set_decode_base64](http://github.com/openresty/set-misc-nginx-module#set_decode_base64)
* [set_encode_hex](http://github.com/openresty/set-misc-nginx-module#set_encode_base64)
* [set_decode_hex](http://github.com/openresty/set-misc-nginx-module#set_decode_base64)
* [set_sha1](http://github.com/openresty/set-misc-nginx-module#set_encode_base64)
* [set_md5](http://github.com/openresty/set-misc-nginx-module#set_decode_base64)

举例：

```lua

 local res = ndk.set_var.set_escape_uri('a/b');
 -- now res == 'a%2fb'
```

相似的，下列指令是由 [encrypted-session-nginx-module](http://github.com/openresty/encrypted-session-nginx-module) 提供，他们在 Lua 中也可以被调用：

* [set_encrypt_session](http://github.com/openresty/encrypted-session-nginx-module#set_encrypt_session)
* [set_decrypt_session](http://github.com/openresty/encrypted-session-nginx-module#set_decrypt_session)

这个特性需要 [ngx_devel_kit](https://github.com/simpl/ngx_devel_kit) 模块。

[返回目录](#nginx-api-for-lua)

ndk.set_var.set_quote_sql_str
-----------------------------

**语法:** *res = ndk.set_var.set_quote_sql_str(str)*

[返回目录]

ndk.set_var.set_quote_sql_str
-----------------------------

**语法:** *res = ndk.set_var.set_quote_sql_str(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_quote_sql_str](http://github.com/openresty/set-misc-nginx-module#set_quote_sql_str)

[返回目录]

ndk.set_var.set_quote_pgsql_str
-------------------------------

**语法:** *res = ndk.set_var.set_quote_pgsql_str(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_quote_pgsql_str](http://github.com/openresty/set-misc-nginx-module#set_quote_pgsql_str)

[返回目录]

ndk.set_var.set_quote_json_str
------------------------------

**语法:** *res = ndk.set_var.set_quote_json_str(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_quote_json_str](http://github.com/openresty/set-misc-nginx-module#set_quote_json_str)

[返回目录]

ndk.set_var.set_unescape_uri
-----------------------------

**语法:** *res = ndk.set_var.set_unescape_uri(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_unescape_uri](http://github.com/openresty/set-misc-nginx-module#set_unescape_uri)

[返回目录]

ndk.set_var.set_escape_uri
-----------------------------

**语法:** *res = ndk.set_var.set_escape_uri(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_escape_uri](http://github.com/openresty/set-misc-nginx-module#set_escape_uri)

[返回目录]

ndk.set_var.set_encode_base32
-----------------------------

**语法:** *res = ndk.set_var.set_encode_base32(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_encode_base32](http://github.com/openresty/set-misc-nginx-module#set_encode_base32)

[返回目录]

ndk.set_var.set_decode_base32
-----------------------------

**语法:** *res = ndk.set_var.set_decode_base32(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_decode_base32](http://github.com/openresty/set-misc-nginx-module#set_decode_base32)

[返回目录]

ndk.set_var.set_encode_base64
-----------------------------

**语法:** *res = ndk.set_var.set_encode_base64(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_encode_base64](http://github.com/openresty/set-misc-nginx-module#set_encode_base64)

[返回目录]

ndk.set_var.set_decode_base64
-----------------------------

**语法:** *res = ndk.set_var.set_decode_base64(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_decode_base64](http://github.com/openresty/set-misc-nginx-module#set_decode_base64)

[返回目录]

ndk.set_var.set_encode_hex
--------------------------

**语法:** *res = ndk.set_var.set_encode_hex(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_encode_hex](http://github.com/openresty/set-misc-nginx-module#set_encode_hex)

[返回目录]

ndk.set_var.set_decode_hex
--------------------------

**语法:** *res = ndk.set_var.set_decode_hex(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_decode_hex](http://github.com/openresty/set-misc-nginx-module#set_decode_hex)

[返回目录]

ndk.set_var.set_sha1
--------------------

**语法:** *res = ndk.set_var.set_sha1(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_sha1](http://github.com/openresty/set-misc-nginx-module#set_sha1)

[返回目录]

ndk.set_var.set_md5
-------------------

**语法:** *res = ndk.set_var.set_md5(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_md5](http://github.com/openresty/set-misc-nginx-module#set_md5)

[返回目录]

ndk.set_var.set_encrypt_session
-------------------------------

**语法:** *res = ndk.set_var.set_encrypt_session(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_encrypt_session](http://github.com/openresty/encrypted-session-nginx-module#set_encrypt_session)

[返回目录]

ndk.set_var.set_decrypt_session
-------------------------------

**语法:** *res = ndk.set_var.set_decrypt_session(str)*

**环境:** *init_worker_by_lua&#42;, set_by_lua&#42;, rewrite_by_lua&#42;, access_by_lua&#42;, content_by_lua&#42;, header_filter_by_lua&#42;, body_filter_by_lua&#42;, log_by_lua&#42;, ngx.timer.&#42;, balancer_by_lua&#42;, ssl_certificate_by_lua&#42;, ssl_session_fetch_by_lua&#42;, ssl_session_store_by_lua&#42;*

* [set_decrypt_session](http://github.com/openresty/encrypted-session-nginx-module#set_decrypt_session)

[返回目录]
