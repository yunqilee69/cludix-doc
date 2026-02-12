# SSL证书部署与自动续期指南

本文档介绍如何使用Let's Encrypt免费SSL证书，配置Nginx支持HTTPS，并设置证书自动续期。

## 目录

- [前置要求](#前置要求)
- [安装Certbot](#安装certbot)
- [获取SSL证书](#获取ssl证书)
- [配置Nginx](#配置nginx)
- [配置自动续期](#配置自动续期)
- [验证配置](#验证配置)
- [常见问题](#常见问题)

---

## 前置要求

- 一台运行Debian的服务器（Debian 10+）
- 已安装并运行的Nginx
- 域名已正确解析到服务器IP
- 服务器开放80和443端口

---

## 安装Certbot

Certbot是Let's Encrypt官方推荐的证书获取工具。

在Debian系统中安装Certbot：

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 验证安装

```bash
certbot --version
```

---

## 获取SSL证书

### 方式一：自动配置Nginx（推荐）

Certbot会自动修改Nginx配置并重启服务。

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 方式二：仅获取证书

如果需要手动配置Nginx，可以只获取证书文件。

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

**说明：**
- `-d` 参数指定域名，支持多个域名
- 证书默认保存在 `/etc/letsencrypt/live/yourdomain.com/`
- 证书文件说明：
  - `fullchain.pem`: 证书链（包含主证书和中间证书）
  - `privkey.pem`: 私钥（必须严格保密）

### 通配符证书（Wildcard Certificate）

如果需要支持所有子域名，使用通配符证书。注意：通配符证书必须使用DNS验证。

```bash
sudo certbot certonly --manual --preferred-challenges dns -d "*.yourdomain.com" -d "yourdomain.com"
```

执行后会提示添加DNS TXT记录，按提示配置后按回车继续。

---

## 配置Nginx

### 方式一：使用自动配置（推荐）

如果使用`certbot --nginx`，Certbot会自动配置Nginx。配置示例：

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HTTP/2配置
    http2_push_preload on;

    # 你的网站配置
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP自动跳转到HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

### 方式二：手动配置

如果使用`certbot certonly`，需要手动编辑Nginx配置文件。

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

添加上述配置内容。

### 测试并重载Nginx

```bash
# 测试配置文件语法
sudo nginx -t

# 重载Nginx配置
sudo systemctl reload nginx
```

---

## 配置自动续期

Let's Encrypt证书有效期为90天，建议在过期前30天自动续期。

### 测试自动续期

```bash
sudo certbot renew --dry-run
```

### 设置自动续期任务

#### 方式一：使用systemd定时器（推荐）

Certbot安装时已自动创建定时器，检查状态：

```bash
# 查看定时器状态
sudo systemctl status certbot.timer

# 如果未运行，启动定时器
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 查看下次运行时间
sudo systemctl list-timers | grep certbot
```

#### 方式二：使用cron

如果systemd不可用，使用cron定时任务。

```bash
# 编辑crontab
sudo crontab -e
```

添加以下内容（每天凌晨2点检查续期）：

```cron
0 2 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

#### 方式三：自定义续期脚本

创建自定义续期脚本，添加日志和通知功能。

```bash
sudo nano /usr/local/bin/renew-ssl.sh
```

```bash
#!/bin/bash

# SSL证书自动续期脚本
# 添加执行权限: sudo chmod +x /usr/local/bin/renew-ssl.sh

LOG_FILE="/var/log/ssl-renew.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 开始检查证书续期..." >> $LOG_FILE

# 尝试续期证书
certbot renew --quiet --post-hook "systemctl reload nginx" >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "[$DATE] 证书续期检查完成" >> $LOG_FILE
else
    echo "[$DATE] 证书续期失败！请检查日志" >> $LOG_FILE
    # 可以在这里添加邮件/钉钉通知
fi
```

```bash
# 添加执行权限
sudo chmod +x /usr/local/bin/renew-ssl.sh

# 添加到crontab（每天凌晨2:30执行）
(crontab -l 2>/dev/null; echo "30 2 * * * /usr/local/bin/renew-ssl.sh") | crontab -
```

---

## 验证配置

### 1. 检查证书信息

```bash
sudo certbot certificates
```

### 2. 在线测试SSL配置

访问以下网站测试SSL配置：

- SSL Labs: https://www.ssllabs.com/ssltest/
- HTTPS Checker: https://www.sslshopper.com/ssl-checker.html

### 3. 使用命令行测试

```bash
# 测试HTTPS连接
curl -I https://yourdomain.com

# 查看证书详情
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 4. 检查证书到期时间

```bash
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 常见问题

### 1. 获取证书失败：域名未解析

**错误信息：**
```
The requested hostname does not resolve to this server.
```

**解决方法：**
- 检查DNS A记录是否正确指向服务器IP
- 使用`ping yourdomain.com`验证解析
- 等待DNS传播完成（可能需要几分钟到几小时）

### 2. 80端口被占用

**错误信息：**
```
Problem binding to port 80: Could not bind to IPv4 or IPv6.
```

**解决方法：**
```bash
# 查看占用80端口的进程
sudo netstat -tulpn | grep :80
sudo lsof -i :80

# 停止占用端口的服务
sudo systemctl stop apache2  # 如果是Apache
sudo systemctl stop nginx    # 如果是其他Nginx实例
```

### 3. Nginx配置错误导致无法启动

**解决方法：**
```bash
# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 测试配置文件
sudo nginx -t

# 如果配置有误，编辑修复后重载
sudo nano /etc/nginx/sites-available/yourdomain.com
sudo systemctl reload nginx
```

### 4. 证书续期失败

**解决方法：**
```bash
# 查看续期日志
sudo cat /var/log/letsencrypt/letsencrypt.log

# 手动续期并查看详细输出
sudo certbot renew --force-renewal

# 检查80/443端口是否开放
sudo ufw status
```

### 5. 通配符证书DNS验证失败

**解决方法：**
- 确保DNS TXT记录已正确添加（可使用`dig _acme-challenge.yourdomain.com TXT`验证）
- DNS记录可能需要时间传播，等待5-10分钟后重试
- 确保没有重复的TXT记录

### 6. 重定向循环问题

**症状：** 访问HTTPS时出现重定向循环错误。

**解决方法：** 检查Nginx配置中的`return 301`指令，确保不会重复重定向。

```nginx
# 正确配置
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 最佳实践

1. **定期备份证书：**
   ```bash
   sudo tar -czf ssl-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
   ```

2. **使用强加密套件：**
   ```nginx
   ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
   ```

3. **启用HSTS（可选）：**
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   ```

4. **监控证书到期时间：**
   设置监控脚本，在证书即将到期时发送通知。

5. **测试灾难恢复：**
   定期测试证书失效后的恢复流程。

---

## 参考资源

- [Let's Encrypt官方文档](https://letsencrypt.org/docs/)
- [Certbot官方文档](https://certbot.eff.org/docs/)
- [Nginx SSL配置指南](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL配置生成器](https://ssl-config.mozilla.org/)

---

**文档版本：** v1.0
**更新日期：** 2026-01-27
**维护者：** 运维团队
