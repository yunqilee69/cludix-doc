---
slug: /operations/frp-nat
title: FRP内网穿透
description: 介绍在Debian服务器中搭建FRP内网穿透
tags: [Debian]
date: 2025-12-11
---
介绍在Debian服务器中搭建 FRP 内网穿透，实现公网访问内网服务。

## 1. 快速开始

### 1.1 安装部署

```bash
# 下载 frp 0.67.0
wget https://github.com/fatedier/frp/releases/download/v0.67.0/frp_0.67.0_linux_amd64.tar.gz

# 解压
tar -zxvf frp_0.67.0_linux_amd64.tar.gz
cd frp_0.67.0_linux_amd64

# 创建安装目录
sudo mkdir -p /app/frp
```

### 1.2 目录结构

```
 /app/frp/
├── frps              # 服务端程序
├── frpc              # 客户端程序
├── frps.toml         # 服务端配置文件
├── frpc.toml         # 客户端配置文件
├── frps.log          # 服务端日志文件
└── frpc.log          # 客户端日志文件
```

## 2. 服务端配置

服务端部署在具有公网 IP 的服务器上，本文示例统一使用 `/app/frp` 作为部署目录。

官方配置参考文档：[代理配置](https://gofrp.org/zh-cn/docs/reference/proxy/)

配置文件与模板渲染说明：[配置文件](https://gofrp.org/zh-cn/docs/features/common/configure/)

### 2.1 服务端配置文件

```bash
# 创建服务端配置
sudo tee /app/frp/frps.toml > /dev/null <<EOF
bindPort = 7777
auth.method = "token"
auth.token = "your_secure_token_here"
webServer.port = 7778
webServer.user = "admin"
webServer.password = "your_web_password"
log.to = "./frps.log"
log.level = "info"
log.maxDays = 3
EOF
```

### 2.2 启动服务端

```bash
# 复制程序文件
sudo cp frps /app/frp/
sudo chmod +x /app/frp/frps

# 测试启动
cd /app/frp
sudo ./frps -c frps.toml

# 配置systemd服务
sudo tee /etc/systemd/system/frps.service > /dev/null <<EOF
[Unit]
Description=frp server
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/app/frp/frps -c /app/frp/frps.toml
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
sudo systemctl daemon-reload
sudo systemctl enable frps
sudo systemctl start frps
```

## 3. 客户端配置

客户端部署在内网机器上。

### 3.1 Debian 客户端配置文件

客户端连接服务端时，`serverPort` 需要与服务端 `bindPort` 保持一致。若需要为多个内网服务分配外部访问端口，可以从 `7900` 到 `8000` 按需逐个添加。

```bash
# 创建客户端配置
sudo tee /app/frp/frpc.toml > /dev/null <<EOF
serverAddr = "your_server_ip"
serverPort = 7777
auth.method = "token"
auth.token = "your_secure_token_here"
log.to = "./frpc.log"
log.level = "info"
log.maxDays = 3

# SSH代理
[[proxies]]
name = "ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 7900

# HTTP代理
[[proxies]]
name = "web"
type = "http"
localIP = "127.0.0.1"
localPort = 8080
customDomains = ["your_domain.com"]

# 其他 TCP 服务可以继续按顺序分配 7901~8000 端口
[[proxies]]
name = "mysql"
type = "tcp"
localIP = "127.0.0.1"
localPort = 3306
remotePort = 7901
EOF
```

### 3.2 Debian 客户端启动

```bash
# 复制程序文件
sudo cp frpc /app/frp/
sudo chmod +x /app/frp/frpc

# 测试启动
cd /app/frp
sudo ./frpc -c frpc.toml

# 配置systemd服务
sudo tee /etc/systemd/system/frpc.service > /dev/null <<EOF
[Unit]
Description=frp client
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/app/frp/frpc -c /app/frp/frpc.toml
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
sudo systemctl daemon-reload
sudo systemctl enable frpc
sudo systemctl start frpc
```

### 3.3 macOS 客户端示例

如果客户端是 macOS，也可以直接运行 `frpc`。以下示例以 Apple Silicon 机器为例，安装目录统一使用 `/usr/local/frp`：

```bash
# 下载 frp 0.67.0 macOS ARM64 版本
curl -LO https://github.com/fatedier/frp/releases/download/v0.67.0/frp_0.67.0_darwin_arm64.tar.gz

# 解压并准备目录
tar -zxvf frp_0.67.0_darwin_arm64.tar.gz
mkdir -p /usr/local/frp
cp frp_0.67.0_darwin_arm64/frpc /usr/local/frp/
chmod +x /usr/local/frp/frpc

# 写入客户端配置
cat >/usr/local/frp/frpc.toml <<EOF
serverAddr = "your_server_ip"
serverPort = 7777
auth.method = "token"
auth.token = "your_secure_token_here"
log.to = "./frpc.log"
log.level = "info"
log.maxDays = 3

[[proxies]]
name = "mac-ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 7902
EOF

# 前台测试运行
cd /usr/local/frp && ./frpc -c frpc.toml
```

如果希望 `frpc` 在 macOS 后台常驻，并且设备重启后自动恢复连接，建议直接使用 macOS 自带的 `launchd` 配置系统级 `LaunchDaemon`。这种方式会在系统开机后自动拉起 `frpc`，不依赖用户登录，更适合 FRP 这种底层常驻服务。

其中 `com.cludix.frpc.plist` 只是示例名，遵循 `launchd` 常见的反向域名命名方式：`com.组织或域名.服务名`。对应的 `Label` 一般写成 `com.cludix.frpc`，配置文件名则按约定写成 `<Label>.plist`，这样便于识别、管理，也能避免和系统中其他服务重名。

### 3.4 macOS 开机自启

```bash
# 写入系统级 LaunchDaemon 配置
sudo tee /Library/LaunchDaemons/com.cludix.frpc.plist > /dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cludix.frpc</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/frp/frpc</string>
    <string>-c</string>
    <string>/usr/local/frp/frpc.toml</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/usr/local/frp</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>UserName</key>
  <string>root</string>
  <key>StandardOutPath</key>
  <string>/usr/local/frp/frpc.log</string>
  <key>StandardErrorPath</key>
  <string>/usr/local/frp/frpc-error.log</string>
</dict>
</plist>
EOF

# 设置权限（LaunchDaemon 必须由 root 拥有）
sudo chown root:wheel /Library/LaunchDaemons/com.cludix.frpc.plist
sudo chmod 644 /Library/LaunchDaemons/com.cludix.frpc.plist

# 加载并立即启动
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cludix.frpc.plist
sudo launchctl enable system/com.cludix.frpc
sudo launchctl kickstart -k system/com.cludix.frpc
```

常用维护命令：

```bash
# 查看服务状态
sudo launchctl print system/com.cludix.frpc

# 停止并卸载服务
sudo launchctl bootout system /Library/LaunchDaemons/com.cludix.frpc.plist

# 修改配置后重新加载
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cludix.frpc.plist
sudo launchctl kickstart -k system/com.cludix.frpc
```

注意事项：

- 如果使用 `LaunchDaemon`，建议保证 `/usr/local/frp` 与 `frpc.toml` 对 `root` 可读。
- 正常情况下，执行完成后 `frpc` 会转为系统后台进程，并在每次开机后自动启动。
- 首次排查问题时，优先查看 `/usr/local/frp/frpc.log` 与 `/usr/local/frp/frpc-error.log`。
- 如果 `sudo launchctl print system/com.cludix.frpc` 能看到 `state = running`，说明后台常驻和开机自启已经生效。

如果是 Intel Mac，请将下载包文件名替换为对应的 `darwin_amd64` 版本。

## 4. 常用配置示例

### 4.1 TCP代理

```toml
[[proxies]]
name = "mysql"
type = "tcp"
localIP = "192.168.1.100"
localPort = 3306
remotePort = 7901
```

### 4.2 多个HTTP服务

```toml
[[proxies]]
name = "blog"
type = "http"
localIP = "127.0.0.1"
localPort = 8000
customDomains = ["blog.yourdomain.com"]

[[proxies]]
name = "api"
type = "http"
localIP = "127.0.0.1"
localPort = 9000
customDomains = ["api.yourdomain.com"]
```

### 4.3 HTTPS代理

```toml
[[proxies]]
name = "web_https"
type = "https"
localIP = "127.0.0.1"
localPort = 443
customDomains = ["your_domain.com"]
```

## 5. 访问服务

配置完成后，可以通过以下方式访问内网服务：

- **SSH**: `ssh -p 7900 username@your_server_ip`
- **TCP 服务端口建议**: 从 `7900` 到 `8000` 按顺序分配
- **HTTP**: `http://your_domain.com`
- **HTTPS**: `https://your_domain.com`
- **管理面板**: `http://your_server_ip:7778`

## 6. 管理维护

### 6.1 查看状态

```bash
# 服务端状态
sudo systemctl status frps

# 客户端状态
sudo systemctl status frpc

# 查看日志
sudo tail -f /app/frp/frps.log
sudo tail -f /app/frp/frpc.log
```

通过以上配置，您就可以成功搭建 FRP 内网穿透服务，实现公网访问内网服务的需求。
