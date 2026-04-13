---
slug: /operations/nginx-compose
title: Nginx Docker Compose 配置
---

# Nginx

本文仅提供配置示例与配置原因说明，不包含验证访问和运维命令。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.nginx.yml
└─ nginx/
   ├─ html/
   ├─ conf.d/
   ├─ logs/
   └─ ssl/
```

说明：

- `html`：静态站点内容目录，映射到容器 Web 根目录
- `conf.d`：Nginx 站点配置目录，便于独立维护虚拟主机配置
- `logs`：容器日志持久化目录，避免容器重建后丢失访问/错误日志
- `ssl`：证书目录，集中管理证书文件并以只读方式挂载到容器

## 2. 目录权限设置

Nginx alpine 镜像默认以 root 运行，无需特殊权限设置。创建目录即可：

```bash
# 创建目录
mkdir -p /app/nginx/{html,conf.d,logs,ssl}
```

## 3. Compose 配置示例

`/app/docker-compose.nginx.yml`：

```yaml
services:
  nginx:
    image: nginx:1.27-alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /app/nginx/html:/usr/share/nginx/html:ro
      - /app/nginx/conf.d:/etc/nginx/conf.d:ro
      - /app/nginx/logs:/var/log/nginx
      - /app/nginx/ssl:/etc/nginx/ssl:ro
    healthcheck:
      test: ["CMD-SHELL", "nginx -t || exit 1"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 30s
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用 `external: true` 复用统一网络 `app-net`，与其他 compose 文件内应用直接互通
- 暴露 `80/443`，同时满足 HTTP 与 HTTPS 场景
- `html`/`conf.d`/`ssl` 使用只读挂载，降低运行时误改风险
- `logs` 单独挂载到宿主机，便于日志留存与问题排查
- 增加 `healthcheck`（`nginx -t`），不依赖站点文件是否已初始化

## 4. Nginx 站点配置示例（可选）

`/app/nginx/conf.d/default.conf`：

```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    # 如果有https证书的话
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    root /usr/share/nginx/html;
    index index.html;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

配置原因：

- HTTP 强制跳转 HTTPS，统一入口并减少明文流量
- 证书路径固定在 `/etc/nginx/ssl`，与宿主机 `/app/nginx/ssl` 一一对应
- 显式声明 `access_log` 与 `error_log`，确保日志输出到持久化目录

## 5. 常用命令

```bash
# 启动 Nginx
docker compose -f /app/docker-compose.nginx.yml up -d

# 关闭 Nginx
docker compose -f /app/docker-compose.nginx.yml down

# 查看容器日志
docker logs -f nginx
```