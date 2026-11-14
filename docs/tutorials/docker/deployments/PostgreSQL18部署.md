---
title: PostgreSQL 18
date: 2026-11-14 10:00
tags: [postgresql, docker, deployment]
---

# PostgreSQL 18

本文提供 PostgreSQL 18 的 Docker Compose 部署示例与配置说明，适用于常规单机持久化部署，也是搭建主备复制时的单机基线。

## 1. 版本选择

截至 2026-11，PostgreSQL 各版本的支持情况：

| 大版本 | 当前小版本 | 支持截止 | 说明 |
| --- | --- | --- | --- |
| 18 | 18.7 | 2030-11 | 最新稳定版，新部署推荐 |
| 17 | 17.12 | 2029-11 | 成熟稳定，已有 17 实例时继续使用 |
| 16 | 16.16 | 2028-11 | 兼容性优先时的选择 |
| 19 | RC2 | — | 尚未正式发布，不要用于生产 |

选版的硬约束是：**物理流复制要求主库和备库使用同一个大版本**。如果现网已经有一台 17 在运行，新增备库只能是 17；只有两台都是全新实例时，才建议直接使用 18。

## 2. 18 与 17 的部署差异

如果从 17 的部署习惯迁移过来，有两处必须调整：

| 项目 | PostgreSQL 17 | PostgreSQL 18 |
| --- | --- | --- |
| 数据目录 `PGDATA` | `/var/lib/postgresql/data` | `/var/lib/postgresql/18/docker` |
| 挂载卷 | `/var/lib/postgresql/data` | `/var/lib/postgresql` |

也就是说，18 的挂载点变成了数据目录的**父目录**。如果继续把卷挂到 `/var/lib/postgresql/data`，会出现两种结果：目录里已有旧版本数据库时，容器启动会检测到并报错；目录为空时，数据会写进镜像声明的匿名卷，宿主机上看起来像“数据没有持久化”。

另外，18 的 `initdb` 默认开启数据校验和，不需要再额外传 `--data-checksums`；MD5 密码认证已被弃用，认证方式统一使用 `scram-sha-256`。

## 3. 目录与挂载约定

```text
/app/postgres/
├─ docker-compose.yml
└─ data/                      # 挂载到容器 /var/lib/postgresql
   └─ 18/
      └─ docker/             # 实际的数据目录（PGDATA）
```

说明：

- `data`：持久化根目录，容器重建后数据不丢失
- 实际数据在 `data/18/docker`，这是 18 镜像的固定布局，不要手工改动

## 4. Compose 配置示例

`/app/postgres/docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:18
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
    volumes:
      - ./data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
```

配置原因：

- `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` 只在**首次初始化空数据目录**时生效，用于创建业务数据库和超级用户，避免长期使用默认的 `postgres` 账号
- `POSTGRES_USER` 指定的账号就是超级用户，后续执行 `CREATE ROLE`、`ALTER SYSTEM` 等管理操作都用它
- `TZ`、`PGTZ` 统一容器和数据库会话的时区，避免时间字段出现偏差
- `healthcheck` 让编排层能够判断数据库是否真正可以接受连接

如果业务并发较高或 `shared_buffers` 调大，需要同步增加共享内存，可在服务下追加：

```yaml
    shm_size: 256mb
```

## 5. 启动与验证

```bash
cd /app/postgres

# 启动
docker compose up -d

# 查看日志
docker logs -f postgres

# 确认容器状态为 healthy
docker compose ps
```

进入数据库：

```bash
docker exec -it postgres psql -U appuser -d appdb
```

确认版本和关键配置：

```sql
SELECT version();

SHOW data_checksums;
SHOW password_encryption;
SHOW listen_addresses;
```

预期结果：

| 配置项 | PostgreSQL 18 默认值 |
| --- | --- |
| `data_checksums` | `on` |
| `password_encryption` | `scram-sha-256` |
| `listen_addresses` | 官方镜像默认为 `*` |

## 6. 常用命令

```bash
# 启动
cd /app/postgres && docker compose up -d

# 停止（保留数据）
cd /app/postgres && docker compose down

# 重启
cd /app/postgres && docker compose restart

# 查看日志
docker logs -f postgres

# 进入 psql
docker exec -it postgres psql -U appuser -d appdb

# 逻辑备份
docker exec -t postgres pg_dump -U appuser -d appdb -Fc > /backup/appdb.dump
```

## 7. 从 17 升级到 18

大版本升级不能直接改镜像标签，必须先升级数据目录。常见做法有两种：

- `pg_dump` / `pg_restore`：停机导出再导入，适合数据量不大、可以接受较长停机的场景
- `pg_upgrade`：原地升级，停机时间更短，但需要准备新旧两个版本的二进制和数据目录

两种方式都要求**先停止写入并完整备份**。生产环境建议先在测试环境演练，确认扩展、排序规则和驱动兼容后再操作。

## 8. 下一步

单机部署完成后，如果需要两台服务器做主备，继续阅读 [PostgreSQL 主备复制配置说明](./PostgreSQL主备复制配置说明)，其中逐项解释了复制相关的配置字段。
