---
title: FRP内网穿透
description: 介绍在Debian服务器中搭建FRP内网穿透
tags: [Debian]
date: 2025-12-11
---

介绍在Debian服务器中搭建FRP内网穿透，实现公网访问内网服务

## 1. 快速开始

### 1.1 安装部署

```bash
# 下载最新版本frp
wget https://github.com/fatedier/frp/releases/download/v0.59.0/frp_0.59.0_linux_amd64.tar.gz

# 解压
tar -zxvf frp_0.59.0_linux_amd64.tar.gz
cd frp_0.59.0_linux_amd64

# 创建安装目录
sudo mkdir -p /opt/frp
```

### 1.2 目录结构

```
/opt/frp/
├── frps              # 服务端程序
├── frpc              # 客户端程序
├── frps.toml         # 服务端配置文件
├── frpc.toml         # 客户端配置文件
├── frps.log          # 服务端日志文件
└── frpc.log          # 客户端日志文件
```

## 2. 服务端配置

服务端部署在具有公网IP的服务器上。

### 2.1 服务端配置文件

```bash
# 创建服务端配置
sudo tee /opt/frp/frps.toml > /dev/null <<EOF
[common]
bindPort = 7000
auth.token = "your_secure_token_here"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "your_admin_password"
log.to = "./frps.log"
log.level = "info"
log.maxDays = 3
EOF
```

### 2.2 启动服务端

```bash
# 复制程序文件
sudo cp frps /opt/frp/
sudo chmod +x /opt/frp/frps

# 测试启动
cd /opt/frp
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
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml
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

### 3.1 客户端配置文件

```bash
# 创建客户端配置
sudo tee /opt/frp/frpc.toml > /dev/null <<EOF
[common]
serverAddr = "your_server_ip"
serverPort = 7000
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
remotePort = 6000

# HTTP代理
[[proxies]]
name = "web"
type = "http"
localIP = "127.0.0.1"
localPort = 8080
customDomains = ["your_domain.com"]
EOF
```

### 3.2 启动客户端

```bash
# 复制程序文件
sudo cp frpc /opt/frp/
sudo chmod +x /opt/frp/frpc

# 测试启动
cd /opt/frp
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
ExecStart=/opt/frp/frpc -c /opt/frp/frpc.toml
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
sudo systemctl daemon-reload
sudo systemctl enable frpc
sudo systemctl start frpc
```

## 4. 常用配置示例

### 4.1 TCP代理

```toml
[[proxies]]
name = "mysql"
type = "tcp"
localIP = "192.168.1.100"
localPort = 3306
remotePort = 3306
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

- **SSH**: `ssh -p 6000 username@your_server_ip`
- **HTTP**: `http://your_domain.com`
- **HTTPS**: `https://your_domain.com`
- **管理面板**: `http://your_server_ip:7500`

## 6. 管理维护

### 6.1 查看状态

```bash
# 服务端状态
sudo systemctl status frps

# 客户端状态
sudo systemctl status frpc

# 查看日志
sudo tail -f /opt/frp/frps.log
sudo tail -f /opt/frp/frpc.log
```

通过以上配置，您就可以成功搭建FRP内网穿透服务，实现公网访问内网服务的需求。