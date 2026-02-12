# Filebrowser Docker 部署指南

## 概述

本文档介绍如何使用 Docker 部署 Filebrowser v2.56.0-s6 版本。Filebrowser 是一个基于 Web 的文件管理器，提供文件浏览、上传、下载、编辑等功能。

## 系统要求

- Docker 20.10 或更高版本
- Docker Compose 1.29 或更高版本（可选，推荐）
- 至少 512MB 可用内存
- 50MB 以上可用磁盘空间

## 快速开始

### 方法一：使用 Docker CLI

```bash
docker run -d \
  --name filebrowser \
  -p 8080:80 \
  -v /path/to/your/files:/srv \
  -v /path/to/database:/database \
  filebrowser/filebrowser:v2.56.0-s6
```

**参数说明：**
- `-d`：后台运行容器
- `--name filebrowser`：指定容器名称
- `-p 8080:80`：端口映射，将容器的 80 端口映射到主机的 8080 端口
- `-v /path/to/your/files:/srv`：挂载要管理的文件目录（请修改 /path/to/your/files 为实际路径）
- `-v /path/to/database:/database`：挂载数据库目录（请修改 /path/to/database 为实际路径）

### 方法二：使用 Docker Compose（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  filebrowser:
    image: filebrowser/filebrowser:v2.56.0-s6
    container_name: filebrowser
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./files:/srv
      - ./data/database.db:/database/filebrowser.db
    networks:
      - filebrowser-network

networks:
  filebrowser-network:
    driver: bridge
```

**启动服务：**

```bash
docker-compose up -d
```

**停止服务：**

```bash
docker-compose down
```

## 配置说明

### 默认登录信息

Filebrowser 首次启动时，默认管理员账号为：
- **用户名**：admin
- **密码**：会在第一次启动时，打印在日志中，通过 `docker logs -f 容器名` 进行查看

⚠️ **重要提示**：首次登录后请立即修改默认密码！

### 数据库配置

Filebrowser 使用 SQLite 数据库存储用户、权限和配置信息。数据库文件会存储在挂载的 `/database` 目录中。

