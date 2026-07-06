---
title: Dufs 部署
date: 2026-07-06 14:30
tags: [dufs, docker, deployment, webdav]
---

# Dufs

本文提供 dufs（轻量级文件服务器 + WebDAV）的 Docker 部署配置与说明。dufs 用 Rust 编写，单二进制、零依赖，同时提供 Web 文件管理界面和 WebDAV 协议支持。

## 1. 目录与挂载约定

```text
/app/dufs/
├─ docker-compose.yml
├─ data/           # 文件存储目录
└─ config/
    └─ config.yaml # 可选：配置文件
```

说明：

- `data`：dufs 管理的文件根目录，所有上传的文件存放在此
- `config`：配置文件目录，使用 YAML 格式（可选，也可以用环境变量或命令行参数）

## 2. Compose 配置示例

### 2.1 基础版（允许所有操作）

`/app/dufs/docker-compose.yml`：

```yaml
services:
  dufs:
    image: sigoden/dufs:latest
    container_name: dufs
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/data
    command: /data -A
```

配置原因：

- `-A`（`--allow-all`）：允许所有操作（上传、删除、搜索、打包下载等），适合内网或测试环境
- 端口 5000 为 dufs 默认端口
- 数据目录挂载到 `/data`，容器重建后文件不丢失

### 2.2 带鉴权版（推荐生产使用）

```yaml
services:
  dufs:
    image: sigoden/dufs:latest
    container_name: dufs
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/data
    environment:
      - DUFS_AUTH=admin:yourpassword@/:rw|@/
      - DUFS_ALLOW_ARCHIVE=true
      - DUFS_ALLOW_SEARCH=true
      - DUFS_ALLOW_UPLOAD=true
      - DUFS_ALLOW_DELETE=true
    command: /data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/__dufs__/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

配置原因：

- `DUFS_AUTH`：管理员账号 `admin` 对根目录 `/` 有读写权限；匿名用户 `@/` 对根目录只读
- 全局开关逐项开启，避免直接用 `-A` 开放所有权限
- `DUFS_ALLOW_ARCHIVE=true`：允许目录打包下载为 ZIP
- 环境变量方式配置，避免密码出现在命令行参数中（`ps` 可见）

### 2.3 配置文件版（复杂权限场景）

当权限规则较多时，推荐使用配置文件：

`/app/dufs/config/config.yaml`：

```yaml
serve-path: /data
bind: 0.0.0.0
port: 5000
hidden:
  - tmp
  - '*.log'
  - '*.lock'
auth:
  - admin:adminpass@/:rw
  - editor:editorpass@/docs:rw,/share:rw
  - viewer:viewerpass@/docs
  - '@/public'
allow-upload: true
allow-delete: true
allow-search: true
allow-archive: true
allow-hash: true
enable-cors: true
compress: low
log-format: '$remote_addr "$request" $status $http_user_agent'
```

`/app/dufs/docker-compose.yml`：

```yaml
services:
  dufs:
    image: sigoden/dufs:latest
    container_name: dufs
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/data
      - ./config/config.yaml:/app/config.yaml:ro
    command: -c /app/config.yaml
```

配置原因：

- 配置文件只读挂载（`:ro`），防止运行时误改
- 多用户、多路径权限用配置文件比命令行参数更清晰
- `hidden` 隐藏临时文件和日志，不在 Web UI 中显示
- `enable-cors: true`：如果前端需要跨域访问（如配合其他 Web 应用）

## 3. 权限规则详解

dufs 的权限格式为 `用户名:密码@/路径:权限`，关键规则：

| 规则 | 含义 |
| --- | --- |
| `admin:pass@/:rw` | admin 用户对根目录读写 |
| `user:pass@/docs:rw` | user 用户对 /docs 目录读写 |
| `user:pass@/docs:rw,/share:rw` | user 用户对 /docs 和 /share 读写（逗号分隔多路径） |
| `viewer:pass@/docs` | viewer 用户对 /docs 只读（不加 `:rw`） |
| `@/public` | 匿名用户对 /public 只读 |

**重要**：账号权限受全局权限约束。例如全局未开启 `--allow-upload`，即使账号有 `:rw` 也无法上传。

## 4. 环境变量参考

所有命令行参数都可以通过 `DUFS_` 前缀的环境变量设置：

| 参数 | 环境变量 | 默认值 |
| --- | --- | --- |
| `[serve-path]` | `DUFS_SERVE_PATH` | `.` |
| `-c, --config` | `DUFS_CONFIG` | - |
| `-b, --bind` | `DUFS_BIND` | `0.0.0.0` |
| `-p, --port` | `DUFS_PORT` | `5000` |
| `--path-prefix` | `DUFS_PATH_PREFIX` | - |
| `--hidden` | `DUFS_HIDDEN` | - |
| `-a, --auth` | `DUFS_AUTH` | - |
| `-A, --allow-all` | `DUFS_ALLOW_ALL` | `false` |
| `--allow-upload` | `DUFS_ALLOW_UPLOAD` | `false` |
| `--allow-delete` | `DUFS_ALLOW_DELETE` | `false` |
| `--allow-search` | `DUFS_ALLOW_SEARCH` | `false` |
| `--allow-archive` | `DUFS_ALLOW_ARCHIVE` | `false` |
| `--allow-hash` | `DUFS_ALLOW_HASH` | `false` |
| `--enable-cors` | `DUFS_ENABLE_CORS` | `false` |
| `--compress` | `DUFS_COMPRESS` | `low` |
| `--tls-cert` | `DUFS_TLS_CERT` | - |
| `--tls-key` | `DUFS_TLS_KEY` | - |

配置优先级：**命令行参数 > 环境变量 > 配置文件 > 代码默认值**

## 5. WebDAV 使用

dufs 原生支持 WebDAV 协议，启动后即可用 WebDAV 客户端连接。

### 5.1 连接地址

```
http://your-server:5000/
```

如果设置了 `--path-prefix`：

```
http://your-server:5000/your-prefix/
```

### 5.2 curl 操作示例

```bash
# 上传文件
curl -T localfile.txt http://your-server:5000/remote/path/

# 下载文件
curl -o localfile.txt http://your-server:5000/remote/path/file.txt

# 带鉴权上传（Digest Auth）
curl --user admin:pass --digest -T localfile.txt http://your-server:5000/

# 带鉴权上传（Basic Auth）
curl --user admin:pass -T localfile.txt http://your-server:5000/

# 列出目录
curl --user admin:pass --digest -X PROPFIND http://your-server:5000/

# 创建目录
curl --user admin:pass --digest -X MKCOL http://your-server:5000/new-folder/
```

### 5.3 客户端挂载

| 平台 | 推荐客户端 | 连接方式 |
| --- | --- | --- |
| Windows | RaiDrive（免费） | 添加 WebDAV 连接，输入地址和账号密码 |
| macOS | Finder | 前往 → 连接服务器 → 输入 `http://server:5000/` |
| Linux | davfs2 | `mount -t davfs http://server:5000/ /mnt/webdav` |
| iOS/Android | 各平台 WebDAV App | 输入服务器地址和凭据 |

## 6. 反向代理配置

如果需要通过 Nginx 反向代理并启用 HTTPS：

```nginx
server {
    listen 443 ssl http2;
    server_name files.example.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    client_max_body_size 0;  # 不限制上传大小

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebDAV 需要的额外方法
        if ($request_method = PROPFIND) { proxy_pass http://127.0.0.1:5000; }
        if ($request_method = MKCOL)   { proxy_pass http://127.0.0.1:5000; }
        if ($request_method = COPY)    { proxy_pass http://127.0.0.1:5000; }
        if ($request_method = MOVE)    { proxy_pass http://127.0.0.1:5000; }
        if ($request_method = LOCK)    { proxy_pass http://127.0.0.1:5000; }
        if ($request_method = UNLOCK)  { proxy_pass http://127.0.0.1:5000; }
    }
}
```

> 💡 `client_max_body_size 0` 很关键，Nginx 默认限制 1MB，大文件上传会被拒绝。

## 7. 常用命令

```bash
# 启动 dufs
cd /app/dufs && docker compose up -d

# 关闭 dufs
cd /app/dufs && docker compose down

# 查看容器日志
docker logs -f dufs

# 检查健康状态
curl -f http://localhost:5000/__dufs__/health
```
