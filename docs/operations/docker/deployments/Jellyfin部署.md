---
slug: /operations/jellyfin-compose
title: Jellyfin Docker Compose 配置
---

# Jellyfin

本文提供 Jellyfin 媒体服务器的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

也可以参考官网的部署步骤：[Docker 部署](https://jellyfin.org/docs/general/installation/container/)

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.jellyfin.yml
└─ jellyfin/
   ├─ config/
   ├─ cache/
   └─ media/
```

说明：

- `config`：Jellyfin 配置文件目录
- `cache`：缓存和临时文件目录
- `media`：媒体文件目录（可包含 movies、tv、music 等子目录）

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`

## 2. Compose 配置示例

`/app/docker-compose.jellyfin.yml`：

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    restart: unless-stopped
    group_add:
      - "<APPGROUP_GID>"
    user: 1000:1000
    network_mode: host
    volumes:
      - /app/jellyfin/config:/config
      - /app/jellyfin/cache:/cache
      - /app/jellyfin/media:/media
```

配置原因：

- 使用 `network_mode: host` 主机网络模式，避免端口映射和硬件加速问题
- `user: 1000:1000` 指定容器运行用户，避免权限问题（可替换为实际用户的 UID:GID）
- 配置、缓存、媒体文件分离挂载，便于管理和备份
- 通过 `group_add` 复用宿主机组权限，减少重复 `chown` 操作

:::tip
如果需要使用桥接网络模式而非主机网络，可删除 `network_mode: host`，改用以下配置：

```yaml
    ports:
      - "8096:8096"
    networks:
      - app-net

networks:
  app-net:
    external: true
```

这样可以接入统一网络，与其他服务互通。
:::

## 3. 服务说明

Jellyfin 是免费、开源的媒体服务器软件，提供以下功能：

- 媒体库管理：自动扫描和整理电影、电视剧、音乐等媒体文件
- 元数据获取：自动从网络获取影片信息、海报、背景图等
- 多设备支持：支持 Web、桌面、移动端等多种客户端
- 字幕支持：自动识别和切换字幕文件
- 用户管理：支持多用户、权限控制和家长控制

## 4. 常用命令

```bash
# 启动 Jellyfin
docker compose -f /app/docker-compose.jellyfin.yml up -d

# 关闭 Jellyfin
docker compose -f /app/docker-compose.jellyfin.yml down

# 查看容器日志
docker logs -f jellyfin
```

## 5. 访问服务

服务启动后，访问 http://localhost:8096 进行初始化配置。

## 6. 故障排查：权限报错

当启动时报错：

`Access to the path '/config/log' is denied`

这是因为容器内的用户与宿主机目录的所有者不匹配。

### 修改目录所有者为容器用户

```bash
# 查看当前用户的 UID 和 GID
id

# 修改目录所有者（替换 1000:1000 为实际 UID:GID）
sudo chown -R 1000:1000 /app/jellyfin

# 重启容器
docker compose -f /app/docker-compose.jellyfin.yml restart
```
