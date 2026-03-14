---
slug: /operations/jellyfin-compose
title: Jellyfin Docker Compose 配置
---

# Jellyfin

本文提供 Jellyfin 媒体服务器的部署示例、初始化步骤与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

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
- `media`：媒体文件目录（可包含 movies、tv、music 等子目录，也可替换为其他宿主机媒体目录）

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`

## 2. Compose 配置示例

`/app/docker-compose.jellyfin.yml`：

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:10
    container_name: jellyfin
    restart: unless-stopped
    user: "1000:1000"
    group_add:
      - "<APPGROUP_GID>"
    ports:
      - "8096:8096/tcp"
      - "7359:7359/udp"
    environment:
      - JELLYFIN_PublishedServerUrl=http://<SERVER_IP>:8096
    volumes:
      - /app/jellyfin/config:/config
      - /app/jellyfin/cache:/cache
      - type: bind
        source: /app/jellyfin/media
        target: /media
        read_only: true
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 默认使用端口映射 + `app-net`，与本目录其他服务保持一致，后续接反向代理或联动服务更方便
- 镜像标签固定为大版本 `10`，可降低 `latest` 带来的不可预期升级风险；如需更严格控制，可进一步固定到小版本
- `8096/tcp` 是 Web 访问端口，`7359/udp` 用于客户端自动发现
- `JELLYFIN_PublishedServerUrl` 用于告诉客户端服务器对外访问地址，尤其适合内网穿透、反代或多网卡环境
- `user: "1000:1000"` 指定容器运行用户，避免权限问题（可替换为实际用户的 UID:GID）
- 媒体目录使用 bind mount 且默认只读挂载，降低误删或误改媒体文件的风险
- 通过 `group_add` 复用宿主机组权限，减少重复 `chown` 操作

:::tip
如果你需要启用 DLNA 广播，或明确希望 Jellyfin 直接使用宿主机网络，可以改成主机网络模式：

```yaml
    network_mode: host
    environment:
      - JELLYFIN_PublishedServerUrl=http://<SERVER_IP>:8096
```

同时删除 `ports` 和 `networks` 配置。官方文档将主机网络模式视为可选项，常见用途是 DLNA；如果只是普通 Web 播放和局域网访问，默认桥接模式已经足够。
:::

## 3. 部署步骤（复制即用）

```bash
# 创建目录
mkdir -p /app/jellyfin/{config,cache,media}

# 复用 Docker 部署规范中的组权限
sudo chgrp -R appgroup /app/jellyfin
sudo chmod -R 2775 /app/jellyfin

# 启动 Jellyfin
docker compose -f /app/docker-compose.jellyfin.yml up -d
```

如果你的媒体文件已经放在其他磁盘目录（例如 `/data/media`），把 compose 里的 `source: /app/jellyfin/media` 替换成实际路径即可；如不希望 Jellyfin 改写媒体文件，建议继续保留 `read_only: true`。

## 4. 首次初始化

服务启动后，访问 `http://<SERVER_IP>:8096`（或你配置的实际域名）进入初始化向导，并完成以下设置：

- 选择界面语言和管理员账号
- 添加媒体库，容器内路径填写 `/media`
- 如使用内网穿透或反向代理，确认后台中的公开访问地址与 `JELLYFIN_PublishedServerUrl` 一致

如果需要挂载多个媒体目录，可继续追加多个只读挂载，例如 `/media2`、`/media3`，再在初始化向导中分别添加媒体库。

## 5. 常用命令

```bash
# 启动 Jellyfin
docker compose -f /app/docker-compose.jellyfin.yml up -d

# 关闭 Jellyfin
docker compose -f /app/docker-compose.jellyfin.yml down

# 查看容器日志
docker logs -f jellyfin
```

## 6. 可选：开启硬件加速

如果宿主机已经配置好 Intel/AMD GPU 驱动，可在 compose 中追加设备映射：

```yaml
    devices:
      - /dev/dri:/dev/dri
```

之后在 Jellyfin 管理后台开启对应的硬件转码方式。若宿主机启用了额外的设备权限控制，请确保容器用户对 `/dev/dri` 具备访问权限。

## 7. 故障排查：权限报错

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
