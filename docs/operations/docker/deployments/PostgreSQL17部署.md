---
slug: /operations/postgresql17-compose
title: PostgreSQL 17 Docker Compose 配置
---

# PostgreSQL 17

本文提供 PostgreSQL 17 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

说明：本文基于 Docker Official Image `postgres:17`，适用于常规单机持久化部署场景。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.yml
└─ postgres/
   ├─ data/
   ├─ conf/
   └─ logs/
```

说明：

- `data`：PostgreSQL 数据目录，容器重建后数据不丢失
- `conf`：自定义配置目录，用于挂载 `postgresql.conf` 等配置文件
- `logs`：数据库日志持久化目录，便于问题排查与运行审计

## 2. 目录权限设置

PostgreSQL 官方镜像容器内默认使用 `postgres` 用户，UID 为 `999`。需在启动前设置目录权限：

```bash
# 创建目录
mkdir -p /app/postgres/{data,conf,logs}

# 设置目录所有者为容器内 postgres 用户
sudo chown -R 999:999 /app/postgres
```

:::tip
`999:999` 是 PostgreSQL 官方镜像中常见的 `postgres` 用户 UID:GID。不同镜像构建方式可能存在差异，如有疑问请先通过 `docker run --rm postgres:17 id postgres` 核对。
:::

## 3. Compose 配置示例

`/app/docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:17
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: change_me
      TZ: Asia/Shanghai
      PGTZ: Asia/Shanghai
    ports:
      - "5432:5432"
    command:
      - postgres
      - -c
      - config_file=/etc/postgresql/postgresql.conf
    volumes:
      - /app/postgres/data:/var/lib/postgresql/data
      - /app/postgres/conf/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - /app/postgres/logs:/var/log/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用外部网络 `app-net`，便于与其他 compose 中的应用直接互通
- 将数据、配置、日志拆分挂载，降低误删配置或日志时影响数据目录的风险
- 使用 `command` 显式指定配置文件路径，便于后续统一维护自定义参数
- 通过 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` 在首次初始化时直接创建业务数据库和业务账户，避免长期使用超级用户
- 增加 `healthcheck`，让编排层能够感知 PostgreSQL 是否真正完成启动

## 4. PostgreSQL 配置示例

`/app/postgres/conf/postgresql.conf`：

```conf
listen_addresses = '*'
port = 5432
max_connections = 300
shared_buffers = 256MB
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_truncate_on_rotation = on
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
```

配置原因：

- `listen_addresses = '*'` 允许容器网络内其他服务访问 PostgreSQL
- `max_connections = 300` 适合作为多数中小型应用的起步值，后续可根据连接池规模调整
- `shared_buffers = 256MB` 提供基础缓存能力，避免完全依赖默认较小值
- `logging_collector = on` 配合日志目录挂载，便于保留日志文件
- `log_min_duration_statement = 1000` 记录慢 SQL，便于后续性能分析

## 5. 远程访问说明

PostgreSQL 是否允许远程连接，不仅取决于监听地址，还取决于 `pg_hba.conf` 规则。若需要允许内网其他主机连接，可在初始化完成后进入容器追加规则：

```bash
docker exec -it postgres bash

echo "host    all             all             0.0.0.0/0               scram-sha-256" >> /var/lib/postgresql/data/pg_hba.conf
pg_ctl reload -D /var/lib/postgresql/data
```

说明：

- `listen_addresses='*'` 只表示 PostgreSQL 开始监听非本地地址，不代表所有客户端都能通过认证
- `pg_hba.conf` 控制来源地址、数据库范围、用户范围和认证方式，是远程访问的最终准入规则
- 示例中使用 `0.0.0.0/0` 便于快速验证连通性；生产环境应尽量收敛为固定网段或指定来源主机
- `scram-sha-256` 是 PostgreSQL 17 推荐的密码认证方式，安全性优于旧版 `md5`

## 6. 常用命令

```bash
# 启动 PostgreSQL
docker compose -f /app/docker-compose.yml up -d

# 关闭 PostgreSQL
docker compose -f /app/docker-compose.yml down

# 查看容器日志
docker logs -f postgres

# 进入数据库命令行
docker exec -it postgres psql -U appuser -d appdb
```
