---
slug: /operations/portainer-compose
title: Portainer Docker Compose 配置
---

# Portainer

Portainer 是一个常见的 Docker 管理面板，提供容器、镜像、卷、网络、Compose Stack 等可视化管理能力。本文提供基于 Docker Compose 的部署示例、初始化步骤与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

也可以参考官网的部署步骤：[Install Portainer CE with Docker on Linux](https://docs.portainer.io/start/install-ce/server/docker/linux)

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.portainer.yml
└─ portainer/
   └─ data/
```

说明：

- `data`：Portainer 持久化数据目录，用于保存管理员账号、环境配置、Endpoint 信息、证书及其他运行数据

## 2. 目录权限设置

Portainer 官方镜像通常以 root 身份访问 Docker Socket 和数据目录，一般无需额外指定 UID:GID。创建目录即可：

```bash
# 创建目录
mkdir -p /app/portainer/data
```

:::tip
Portainer 需要挂载 `/var/run/docker.sock` 才能直接管理当前宿主机的 Docker 环境。这相当于授予容器较高的宿主机控制权限，因此建议仅在可信环境中部署，并限制面板访问来源。
:::

## 3. Compose 配置示例

`/app/docker-compose.portainer.yml`：

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /app/portainer/data:/data
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用 `portainer/portainer-ce:lts`，比 `latest` 更稳定，适合作为长期运行的运维面板
- `9443` 是 Portainer 默认的 HTTPS 管理界面端口，首次部署后即可通过浏览器访问
- `8000` 用于 Edge Agent 隧道能力；如果你只管理本机或普通 Docker 主机，也可以移除该端口映射
- 挂载 `/var/run/docker.sock` 后，Portainer 可以直接管理当前宿主机上的 Docker 资源
- 数据目录挂载到 `/data`，确保容器重建后初始化信息和管理配置不会丢失
- 复用 `app-net`，便于后续与 Nginx、反向代理、监控或其他业务容器协同

:::tip
如果你明确不使用 Edge Agent，可将 Compose 中的 `8000:8000` 删除，以减少不必要的对外暴露端口。
:::

## 4. 启动与初始化

```bash
# 启动 Portainer
docker compose -f /app/docker-compose.portainer.yml up -d

# 查看容器状态
docker compose -f /app/docker-compose.portainer.yml ps

# 查看启动日志
docker logs -f portainer
```

启动完成后，访问：

```text
https://<服务器IP>:9443
```

首次访问时，Portainer 默认会使用自签名证书，因此浏览器可能提示证书不受信任。这是官方默认行为，测试环境可先手动继续访问；生产环境建议后续改为受信任证书或放到反向代理后面统一处理 TLS。

首次初始化时，按页面向导完成以下操作：

- 创建管理员账号
- 设置管理员密码（建议使用强密码）
- 选择要管理的环境，单机部署通常直接选择本地 Docker 环境即可

## 5. 可选：自定义 SSL 证书

如果你希望在 Portainer 容器内直接使用自己的证书，可增加证书目录挂载，并为容器追加启动参数：

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /app/portainer/data:/data
      - /app/portainer/certs:/certs:ro
    command:
      - --sslcert
      - /certs/portainer.crt
      - --sslkey
      - /certs/portainer.key
    networks:
      - app-net
```

说明：

- 证书文件需为 PEM 格式
- `portainer.crt` 建议包含完整证书链
- 如果已经有 Nginx、Traefik 或 Caddy 统一做 HTTPS 终止，通常不需要在 Portainer 容器内重复配置证书

## 6. 常用运维命令

```bash
# 启动或更新容器
docker compose -f /app/docker-compose.portainer.yml up -d

# 停止并删除容器
docker compose -f /app/docker-compose.portainer.yml down

# 重启服务
docker compose -f /app/docker-compose.portainer.yml restart

# 查看实时日志
docker logs -f portainer
```

## 7. 安全建议

- 尽量不要将 `9443` 直接暴露到完全开放的公网，建议配合防火墙白名单、VPN 或反向代理鉴权
- `/var/run/docker.sock` 挂载权限很高，应避免把 Portainer 暴露给不可信用户
- 生产环境优先使用 `lts` 或更具体的小版本标签，不建议使用会漂移的 `latest`
- 升级前建议先备份 `/app/portainer/data`

## 8. 参考资料

- [Portainer CE Linux 安装文档](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [Portainer 首次初始化说明](https://docs.portainer.io/start/install-ce/server/setup)
- [Portainer SSL 证书配置](https://docs.portainer.io/advanced/ssl)
- [Portainer 生命周期与版本策略](https://docs.portainer.io/start/lifecycle)
