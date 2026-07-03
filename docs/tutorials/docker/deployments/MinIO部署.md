---
title: MinIO 部署
date: 2026-07-03 12:00
tags: [docker, storage, deployment]
---

# MinIO

本文提供 MinIO（pgsty/minio 社区 fork）的单节点部署配置。

> **背景**：MinIO 官方仓库已于 2026 年 4 月归档，社区版不再维护。`pgsty/minio` 是由 Pigsty 维护的社区 fork，恢复了管理控制台 UI 和 Docker 镜像分发，并修复了已知安全漏洞。API 100% 兼容原版 MinIO，应用代码无需改动。

## 1. 目录与挂载约定

```text
/app/minio/
├─ docker-compose.yml
└─ data/
```

说明：

- `data`：MinIO 对象存储数据目录

## 2. Compose 配置示例

`/app/minio/docker-compose.yml`：

```yaml
services:
  minio:
    image: pgsty/minio:RELEASE.2026-06-18T00-00-00Z
    container_name: minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - ./data:/data
    command: server /data --console-address :9001
```

端口说明：

- `9000`：S3 API 端口，应用通过此端口访问对象存储
- `9001`：管理控制台端口，浏览器访问 `http://<IP>:9001` 管理 Bucket 和文件

配置原因：

- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`：管理员账号密码，生产环境请务必修改为强密码
- `--console-address :9001`：显式指定控制台端口，避免随机分配
- `server /data`：单节点单磁盘模式，数据存储在 `/data` 目录

## 3. 常用命令

```bash
# 启动 MinIO
cd /app/minio && docker compose up -d

# 关闭 MinIO
cd /app/minio && docker compose down

# 查看容器日志
docker logs -f minio
```

## 4. 验证部署

启动后访问管理控制台：

- 地址：`http://<服务器IP>:9001`
- 账号：`minioadmin`
- 密码：`minioadmin`

登录后可创建 Bucket、上传文件、配置访问策略等。

使用 mc 命令行客户端验证 S3 API：

```bash
# 安装 mc 客户端（pgsty 也提供了 fork 版本）
docker run --rm -it pgsty/mc alias set myminio http://<服务器IP>:9000 minioadmin minioadmin

# 创建 Bucket
docker run --rm -it pgsty/mc mb myminio/test-bucket

# 上传文件
docker run --rm -it pgsty/mc cp ./test.txt myminio/test-bucket/
```
