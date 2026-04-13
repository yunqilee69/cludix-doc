---
slug: /operations/newapi-compose
title: NewAPI Docker Compose 配置
---

# NewAPI

NewAPI 是一个面向大模型与 AI 服务的统一网关，支持多供应商接入、令牌管理、计费与控制台管理。本文提供基于 Docker Compose 的部署示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

版本说明：本文示例固定使用官方镜像 `calciumion/new-api:v0.11.4`。该版本来自 Docker Hub 官方仓库当前最新可用的具体标签，避免使用会漂移的 `latest`。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.newapi.yml
└─ newapi/
   ├─ data/
   └─ logs/
```

说明：

- `data`：NewAPI 数据目录；按官方 Docker 部署默认方式使用 SQLite 时，可通过该目录持久化数据库文件
- `logs`：服务日志目录，配合 `--log-dir /app/logs` 保存运行日志，便于排障与审计

## 2. 目录权限设置

NewAPI 官方镜像默认以 root 运行，无需特殊权限设置。创建目录即可：

```bash
# 创建目录
mkdir -p /app/newapi/{data,logs}
```

## 3. Compose 配置示例

`/app/docker-compose.newapi.yml`：

```yaml
services:
  newapi:
    image: calciumion/new-api:v0.11.4
    container_name: new-api
    restart: unless-stopped
    command: ["--log-dir", "/app/logs"]
    ports:
      - "3000:3000"
    environment:
      - TZ=Asia/Shanghai
      - ERROR_LOG_ENABLED=true
      - BATCH_UPDATE_ENABLED=true
      # 单机 SQLite 部署可不填 SQL_DSN，官方 Docker 部署通常通过 /data 挂载持久化数据库
      # 如需接入外部 PostgreSQL：
      # - SQL_DSN=postgresql://root:strong-password@postgres:5432/new-api
      # 如需接入外部 MySQL：
      # - SQL_DSN=root:strong-password@tcp(mysql:3306)/new-api
      # 如需接入 Redis：
      # - REDIS_CONN_STRING=redis://default:strong-password@redis:6379
      # 多实例/多节点部署时必须设置，并确保所有节点保持一致：
      # - SESSION_SECRET=replace-with-a-random-secret
      # - CRYPTO_SECRET=replace-with-a-random-secret
    volumes:
      - /app/newapi/data:/data
      - /app/newapi/logs:/app/logs
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "wget -q -O - http://localhost:3000/api/status | grep -o '\"success\":\\s*true' || exit 1",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 固定 `calciumion/new-api:v0.11.4`，避免 `latest` 在后续自动漂移导致升级不可控
- 保留 `--log-dir /app/logs` 与日志挂载，便于长期留存运行日志
- 默认使用 SQLite，可先以单容器方式快速落地；需要生产级共享数据库时再启用 `SQL_DSN`
- 复用 `app-net`，便于后续与独立部署的 MySQL、PostgreSQL、Redis、反向代理容器互通
- 健康检查命中 `/api/status`，可直接反映 Web 服务是否已完成启动

## 4. 环境变量建议

常用环境变量：

| 变量名 | 作用 | 何时需要 |
| --- | --- | --- |
| `TZ` | 设置容器时区 | 建议始终设置 |
| `SQL_DSN` | 指定外部 MySQL/PostgreSQL | 生产环境推荐 |
| `REDIS_CONN_STRING` | 启用 Redis 缓存/共享状态 | 多实例或高并发场景推荐 |
| `SESSION_SECRET` | 会话密钥 | 多节点部署必须 |
| `CRYPTO_SECRET` | 数据加密密钥 | 共享 Redis 或多节点部署推荐 |
| `ERROR_LOG_ENABLED` | 开启错误日志展示与记录 | 建议开启 |
| `BATCH_UPDATE_ENABLED` | 启用批量数据库更新聚合 | 生产环境建议开启 |

说明：

- `SESSION_SECRET` 不能设置为 `random_string`，否则程序会拒绝启动
- 多节点部署时，所有节点必须使用相同的 `SESSION_SECRET` 与 `CRYPTO_SECRET`
- 若未配置 `SQL_DSN`，官方 Docker 部署通常以 SQLite 作为默认落地方式；适合个人或轻量场景，不适合多节点共享

## 5. 首次启动与访问

```bash
# 启动 NewAPI
docker compose -f /app/docker-compose.newapi.yml up -d

# 查看容器状态
docker compose -f /app/docker-compose.newapi.yml ps

# 查看启动日志
docker logs -f new-api
```

首次启动完成后，通过 `http://<服务器IP>:3000` 访问管理界面。

如果后续接入 Nginx 反向代理，建议保留容器内部端口 `3000` 不变，仅由 Nginx 对外统一暴露 `80/443`。

## 6. 常用运维命令

```bash
# 启动或更新容器
docker compose -f /app/docker-compose.newapi.yml up -d

# 停止并删除容器
docker compose -f /app/docker-compose.newapi.yml down

# 重启服务
docker compose -f /app/docker-compose.newapi.yml restart

# 查看实时日志
docker logs -f new-api
```

## 7. 升级建议

升级前先确认 Docker Hub 官方仓库是否已发布新的具体标签，不要直接改回 `latest`。

建议流程：

1. 备份 `/app/newapi/data`
2. 将 `image` 从 `calciumion/new-api:v0.11.4` 改为新的具体版本
3. 执行 `docker compose -f /app/docker-compose.newapi.yml up -d`
4. 观察 `docker logs -f new-api` 和 `docker compose ... ps`，确认健康检查正常

## 8. 参考资料

- [NewAPI 官方文档](https://docs.newapi.pro/zh/docs/installation)
- [NewAPI 环境变量文档](https://docs.newapi.pro/zh/docs/installation/config-maintenance/environment-variables)
- [NewAPI Docker Compose 配置说明](https://docs.newapi.pro/zh/docs/installation/config-maintenance/docker-compose-yml)
- [Docker Hub - calciumion/new-api](https://hub.docker.com/r/calciumion/new-api/tags)
- [NewAPI GitHub 仓库](https://github.com/QuantumNous/new-api)