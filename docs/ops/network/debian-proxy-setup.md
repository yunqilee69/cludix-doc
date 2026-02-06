# Debian 代理自动配置指南

本文档介绍如何在 Debian 系统中配置代理，实现开机后和 SSH 连接后自动配置代理。

## 目录

- [代理地址说明](#代理地址说明)
- [临时配置代理](#临时配置代理)
- [永久配置代理](#永久配置代理)
- [验证代理配置](#验证代理配置)

---

## 代理地址说明

**代理服务器地址：** `192.168.100.1:10808`

根据代理类型不同，配置方式如下：

| 代理类型 | 格式 | 示例 |
|---------|------|------|
| HTTP 代理 | `http://IP:PORT` | `http://192.168.100.1:10808` |
| SOCKS5 代理 | `socks5://IP:PORT` | `socks5://192.168.100.1:10808` |

---

## 临时配置代理

临时配置仅在当前终端会话有效，关闭终端后失效。

### 设置环境变量

```bash
# HTTP/HTTPS 代理
export http_proxy="http://192.168.100.1:10808"
export https_proxy="http://192.168.100.1:10808"

# 如果使用 SOCKS5 代理
export http_proxy="socks5://192.168.100.1:10808"
export https_proxy="socks5://192.168.100.1:10808"

# 不使用代理的地址（可选）
export no_proxy="localhost,127.0.0.1,192.168.*"
```

### 使用别名（推荐）

在 `~/.bashrc` 中添加别名，方便快速启用/禁用代理：

```bash
nano ~/.bashrc
```

添加以下内容：

```bash
# 代理快捷命令
alias proxy-on='export http_proxy="http://192.168.100.1:10808" && export https_proxy="http://192.168.100.1:10808" && echo "代理已启用"'
alias proxy-off='unset http_proxy && unset https_proxy && echo "代理已禁用"'
alias proxy-status='echo "HTTP代理: $http_proxy" && echo "HTTPS代理: $https_proxy"'
```

使配置生效：

```bash
source ~/.bashrc
```

使用方法：

```bash
proxy-on      # 启用代理
proxy-off     # 禁用代理
proxy-status  # 查看状态
```

---

## 永久配置代理

永久配置会在每次登录或 SSH 连接时自动生效。

### 方式一：编辑 ~/.bashrc（推荐）

编辑用户配置文件：

```bash
nano ~/.bashrc
```

在文件末尾添加：

```bash
# 代理自动配置
export http_proxy="http://192.168.100.1:10808"
export https_proxy="http://192.168.100.1:10808"
export no_proxy="localhost,127.0.0.1,::1,192.168.*"
```

使配置生效：

```bash
source ~/.bashrc
```

### 方式二：编辑 ~/.profile

如果使用其他 Shell（如 zsh），可以配置 `~/.profile`：

```bash
nano ~/.profile
```

添加：

```bash
# 代理配置
export http_proxy="http://192.168.100.1:10808"
export https_proxy="http://192.168.100.1:10808"
export no_proxy="localhost,127.0.0.1,::1"
```

重新登录使配置生效。

## 验证代理配置

### 1. 查看环境变量

```bash
echo $http_proxy
echo $https_proxy
```

### 2. 测试网络连接

```bash
# 测试外部网站
curl -I https://www.google.com

# 查看当前 IP
curl ifconfig.me
```

### 3. 使用别名检查

```bash
proxy-status
```

