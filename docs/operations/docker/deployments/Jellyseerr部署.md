---
slug: /operations/jellyseerr-compose
title: Jellyseerr Docker Compose 配置
---

# Jellyseerr

本文提供 Jellyseerr 媒体请求服务的部署示例、初始化步骤与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

也可以参考官方 Docker 文档：[Docker 部署](https://docs.jellyseerr.dev/getting-started/docker)

## 1. 目录与挂载约定

```text
/app
└─ jellyseerr/
   ├─ docker-compose.yml
   └─ config/
```

说明：

- `config`：Jellyseerr 配置目录，包含应用设置、SQLite 数据库和缓存数据

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`
- 首次部署前确保 `/app/jellyseerr/config` 的所有者可被 UID `1000` 写入

## 2. Compose 配置示例

`/app/jellyseerr/docker-compose.yml`：

```yaml
services:
  jellyseerr:
    image: ghcr.io/seerr-team/seerr:v3.0.0
    container_name: jellyseerr
    init: true
    restart: unless-stopped
    user: "1000:1000"
    group_add:
      - "<APPGROUP_GID>"
    environment:
      - LOG_LEVEL=info
      - TZ=Asia/Shanghai
      - PORT=5055
    ports:
      - "5055:5055"
    volumes:
      - ./config:/app/config
    healthcheck:
      test: wget --no-verbose --tries=1 --spider http://localhost:5055/api/v1/status || exit 1
      start_period: 20s
      timeout: 3s
      interval: 15s
      retries: 3
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用官方镜像 `ghcr.io/seerr-team/seerr`，并固定到稳定版本标签，避免 `latest` 带来的不可预期升级风险
- `init: true` 可更好地处理容器内子进程退出和僵尸进程回收，这是官方示例中的默认建议
- `PORT=5055` 与默认 Web 端口保持一致，便于与反向代理和监控配置统一
- Compose 文件与数据目录放在同一个服务目录下，迁移、备份和日常维护更直接
- 持久化 `/app/config`，并通过 `./config:/app/config` 与当前目录下的配置目录对应，确保容器重建后账号、请求记录和应用配置不会丢失
- `healthcheck` 直接检查 `/api/v1/status`，便于 Docker 判断服务是否真正可用
- 复用 `app-net`，方便后续与 Jellyfin、Sonarr、Radarr、Prowlarr 等服务互通

:::tip
官方更推荐使用独立子域名（例如 `jellyseerr.example.com`）做反向代理，而不是子路径。子路径方案通常需要额外改写代理规则，且并不属于官方推荐的标准部署方式。
:::

## 3. 部署步骤（复制即用）

```bash
# 创建目录
mkdir -p /app/jellyseerr/config

# 复用 Docker 部署规范中的组权限
sudo chgrp -R appgroup /app/jellyseerr
sudo chmod -R 2775 /app/jellyseerr

# 确保容器默认用户可写入配置目录
sudo chown -R 1000:1000 /app/jellyseerr/config

# 启动 Jellyseerr
cd /app/jellyseerr && docker compose up -d
```

## 4. 首次初始化

服务启动后，访问 `http://<SERVER_IP>:5055`（或你配置的实际域名）进入初始化向导，并完成以下设置：

- 创建管理员账号，或按页面提示接入现有认证方式
- 连接 Jellyfin 服务器，填写 Jellyfin 地址和 API Key
- 配置 Sonarr、Radarr 等下载管理服务，用于接收电影和剧集请求
- 如使用反向代理访问，优先使用独立子域名，并在后台补充正确的 Application URL / 代理相关设置

如果你的 Jellyfin、Sonarr、Radarr 都已接入同一个 `app-net`，通常可以直接在 Jellyseerr 中填写容器名作为服务地址，例如 `http://jellyfin:8096`。

## 5. 常用命令

```bash
# 启动 Jellyseerr
cd /app/jellyseerr && docker compose up -d

# 关闭 Jellyseerr
cd /app/jellyseerr && docker compose down

# 查看容器日志
cd /app/jellyseerr && docker compose logs -f jellyseerr

# 查看健康检查状态
docker inspect --format='{{json .State.Health}}' jellyseerr
```

## 6. 访问服务

默认访问地址：`http://<SERVER_IP>:5055`

如果前面已经接入 Nginx 或其他反向代理，也可以通过绑定的域名访问。

## 7. 故障排查：配置目录权限报错

当启动时报错：

`EACCES: permission denied` 或数据库文件无法创建

这通常是因为 `/app/jellyseerr/config` 目录对容器内 UID `1000` 不可写。

### 修复目录权限

```bash
# 修改配置目录所有者
sudo chown -R 1000:1000 /app/jellyseerr/config

# 如仍需宿主机组协作读写，补充组权限
sudo chgrp -R appgroup /app/jellyseerr
sudo chmod -R 2775 /app/jellyseerr

# 重启容器
cd /app/jellyseerr && docker compose restart
```

## 8. 故障排查：无法连接 Jellyfin 或 Arr 服务

如果在初始化页面里测试连接失败，优先检查以下几点：

- 容器是否都加入了同一个 `app-net`
- 填写的是容器内可访问地址，而不是宿主机本地回环地址（例如不要写 `http://localhost:8096`）
- Jellyfin / Sonarr / Radarr 的 API Key 是否正确
- 反向代理或防火墙是否拦截了对应端口
