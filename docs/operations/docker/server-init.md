---
slug: /operations/docker-server-init
title: 服务器初始化
---

# 服务器初始化

本文档描述 Docker 部署前需要完成的服务器级别初始化配置。

## 1. 创建共享网络

所有 Docker Compose 应用共用同一个外部网络 `app-net`，便于跨 compose 服务互通。

```bash
docker network create app-net
```

只需创建一次，后续所有应用复用该网络。

## 2. 创建基础目录

以 `/app` 作为所有应用数据和配置的基础目录：

```bash
mkdir -p /app
```

## 3. 目录结构约定

完成初始化后，目录结构如下：

```text
/app
├─ docker-compose.nginx.yml
├─ docker-compose.mysql.yml
├─ docker-compose.redis.yml
├─ docker-compose.nacos.yml
├─ docker-compose.rocketmq.yml
├─ docker-compose.filebrowser.yml
├─ nginx/
├─ mysql/
├─ redis/
├─ nacos/
├─ rocketmq/
└─ filebrowser/
```

说明：

- `docker-compose.<应用名>.yml`：单应用启动文件
- `/app/<应用名>`：该应用的数据、配置、日志等持久化目录

## 4. 按应用启停

通过 `-f` 指定文件，可单独启停某个应用，不影响其他应用：

```bash
# 启动指定应用
docker compose -f /app/docker-compose.nginx.yml up -d

# 停止并删除指定应用容器
docker compose -f /app/docker-compose.nginx.yml down

# 查看指定应用状态
docker compose -f /app/docker-compose.nginx.yml ps
```

## 5. 目录权限设置

各应用的目录权限需要根据容器内运行用户的 UID:GID 设置，具体命令见各应用部署文档。

:::tip
不同的 Docker 镜像使用不同的容器内用户，例如：
- MySQL 官方镜像：mysql 用户 UID=999
- Jenkins 官方镜像：jenkins 用户 UID=1000
- Jellyfin 官方镜像：可通过 `user` 参数指定
:::

## 6. 相关文档

- [Docker 部署规范](./index.md)
- [Docker 部署列表](./deployments/index.md)