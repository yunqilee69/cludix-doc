---
slug: /operations/ssl-deployment
title: SSL 证书申请与 Nginx 配置指南
---

# SSL 证书申请与 Nginx 配置指南（acme.sh + DNS-01）

本文档使用 `acme.sh` 的 DNS-01 验证方案申请 Let's Encrypt 证书。该方案不依赖 `/.well-known/acme-challenge/`，适合容器化 Nginx 和经常升级/切换发布目录的场景。

## 目录

- [适用场景](#适用场景)
- [前置条件](#前置条件)
- [安装并初始化 acme.sh](#安装并初始化-acmesh)
- [DNS-01 签发证书（推荐）](#dns-01-签发证书推荐)
- [安装到固定路径并自动重载 Nginx](#安装到固定路径并自动重载-nginx)
- [Nginx HTTPS 配置示例](#nginx-https-配置示例)
- [自动续签说明](#自动续签说明)
- [验证与排错](#验证与排错)
- [安全建议](#安全建议)

---

## 适用场景

- 你希望使用浏览器信任证书（Let's Encrypt）
- 你不希望依赖 WebRoot 路径（避免升级时挑战目录失效）
- 你使用容器 Nginx，证书需要固定输出到宿主机 `/app/nginx/ssl`

---

## 前置条件

请先确认：

- 域名已在 DNS 服务商处托管（本文以腾讯云 DNSPod 为例）
- 你可以创建 DNS API 凭据（Token ID / Token）
- Nginx 容器可执行 `docker exec nginx nginx -s reload`

目录约定（本项目场景）：

- 宿主机站点目录：`/app/nginx/html/cludix-doc`
- 宿主机证书目录：`/app/nginx/ssl`
- 容器证书目录：`/etc/nginx/ssl`
- 容器站点目录：`/usr/share/nginx/html/cludix-doc`

---

## 安装并初始化 acme.sh

```bash
curl https://get.acme.sh | sh -s email=you@example.com
source ~/.bashrc
~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
```

---

## DNS-01 签发证书（推荐）

### 1) 获取并配置 DNS API 凭据（腾讯云 DNSPod）

获取步骤（腾讯云控制台）：

1. 登录腾讯云控制台，进入云解析 DNSPod。
2. 打开 API 密钥或 Token 管理页面，创建新的 API Token。
3. 记录生成的 Token ID 和 Token（只显示一次，建议立即保存到密码管理器）。
4. 将域名解析托管在该账号下，并确认 Token 有对应域名的解析修改权限。

```bash
export DP_Id="your_dnspod_token_id"
export DP_Key="your_dnspod_token"
```

建议同时写入 shell 配置（避免重登后失效）：

```bash
cat >> ~/.bashrc <<'EOF'
export DP_Id="your_dnspod_token_id"
export DP_Key="your_dnspod_token"
EOF
source ~/.bashrc
```

### 2) 签发证书（支持主域名 + 通配符）

```bash
~/.acme.sh/acme.sh --issue \
  -d yunke.icu -d '*.yunke.icu' \
  --dns dns_dp \
  --keylength ec-256
```

说明：

- `--dns dns_dp` 表示通过腾讯云 DNSPod API 自动写入 TXT 记录
- `-d yunke.icu` 是根域名，`-d '*.yunke.icu'` 是泛域名，覆盖所有子域名
- DNS-01 不依赖 80 端口，也不依赖 Nginx 的 `/.well-known` 路径

---

## 安装到固定路径并自动重载 Nginx

将证书安装到固定路径，并配置自动重载 Nginx：

```bash
~/.acme.sh/acme.sh --install-cert -d yunke.icu -d '*.yunke.icu' --ecc \
  --key-file /app/nginx/ssl/cludix.key \
  --fullchain-file /app/nginx/ssl/cludix.crt \
  --reloadcmd "docker exec nginx nginx -s reload"
```

---

## Nginx HTTPS 配置示例

假设挂载关系：

- `/app/nginx/ssl` -> `/etc/nginx/ssl`
- `/app/nginx/html/cludix-doc` -> `/usr/share/nginx/html/cludix-doc`

容器内 Nginx 配置示例：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yunke.icu www.yunke.icu *.yunke.icu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name yunke.icu www.yunke.icu *.yunke.icu;

    ssl_certificate /etc/nginx/ssl/cludix.crt;
    ssl_certificate_key /etc/nginx/ssl/cludix.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # 确认全站 HTTPS 后再开启
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /usr/share/nginx/html/cludix-doc;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

应用配置：

```bash
docker exec nginx nginx -t
docker exec nginx nginx -s reload
```

---

## 自动续签说明

`acme.sh` 安装后会自动创建 cron，定期检查并续签证书。

- 续签成功后，会自动执行你在 `--install-cert` 设置的 `--reloadcmd`
- 若你修改了目标文件路径或重载命令，重新执行一次 `--install-cert` 即可

手动触发测试：

```bash
~/.acme.sh/acme.sh --renew -d yunke.icu --ecc --force
crontab -l | grep acme.sh
```

---

## 验证与排错

### 验证证书与生效状态

```bash
curl -I https://yunke.icu
echo | openssl s_client -servername yunke.icu -connect yunke.icu:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

### 常见问题

1) DNS API 权限不足  
检查 DNS API Key 是否具备修改解析记录权限。

2) 申请报 `unauthorized` 或 `NXDOMAIN`  
检查域名托管是否正确、解析线路是否生效。

3) 续签成功但线上证书未更新  
检查 `--install-cert` 目标路径是否与 Nginx 实际读取路径一致，并确认 `--reloadcmd` 可执行。

---

## 安全建议

- 私钥文件权限建议为 `600`
- 不要把 API 密钥和证书私钥提交到 Git
- API 密钥建议最小权限、定期轮换
- 启用 HSTS 前确认所有子域名都支持 HTTPS

参考：

- https://github.com/acmesh-official/acme.sh
- https://letsencrypt.org/docs/
- https://nginx.org/en/docs/http/configuring_https_servers.html
- https://ssl-config.mozilla.org/
