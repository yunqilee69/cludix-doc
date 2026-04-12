# 在Linux服务器上配置vnc

在Linux配置VNC服务，在其他电脑上直接通过VNC进行连接和操作Linux系统，例如Linux上安装了软件，其带有页面，但是Linux是无界面的，这个时候可以通过VNC进行操作和配置

## 服务器安装VNC服务

使用的是Debian系统，直接apt命令进行安装和使用。

### 安装

```bash
# 更新软件源
sudo apt update

# 安装轻量级桌面 XFCE（资源占用低，适合服务器）
sudo apt install xfce4 xfce4-goodies dbus-x11 -y

# 安装 TigerVNC
sudo apt install tigervnc-standalone-server tigervnc-viewer -y
```

### 配置

1. 设置 VNC 密码
```bash
vncpasswd
```

输入两次密码（最长8位），会提示是否设置只读密码（可选，直接回车跳过）。

2. 配置启动脚本

```bash
# 创建/编辑 xstartup 文件
mkdir -p ~/.vnc
nano ~/.vnc/xstartup
```

写入以下内容：

```bash
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
```

赋予执行权限
```bash
chmod +x ~/.vnc/xstartup
```

### 创建 Systemd 服务文件
```bash
sudo vim /etc/systemd/system/vncserver.service
```

写入内容（替换 你的用户名）：

```
[Unit]
Description=VNC Server
After=network.target

[Service]
Type=forking
User=你的用户名
ExecStartPre=/bin/sh -c '/usr/bin/vncserver -kill :1 > /dev/null 2>&1 || :'
ExecStart=/usr/bin/vncserver :1 -geometry 1920x1080 -depth 24 -localhost no
ExecStop=/usr/bin/vncserver -kill :1

[Install]
WantedBy=multi-user.target
```


```bash
# 启用并启动
sudo systemctl daemon-reload
sudo systemctl enable --now vncserver

# 管理命令
sudo systemctl status vncserver   # 查看状态
sudo systemctl restart vncserver  # 重启
sudo systemctl stop vncserver     # 停止
```