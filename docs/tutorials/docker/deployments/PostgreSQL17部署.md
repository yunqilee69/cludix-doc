# PostgreSQL 17

本文提供 PostgreSQL 17 的配置示例与配置原因说明。

说明：本文基于 Docker Official Image `postgres:17`，适用于常规单机持久化部署场景。

## 1. 目录与挂载约定

```text
/app/postgres/
├─ docker-compose.yml
├─ data/
└─ logs/
```

说明：

- `data`：PostgreSQL 数据目录，容器重建后数据不丢失
- `logs`：数据库日志持久化目录，便于问题排查与运行审计

## 2. Compose 配置示例

`/app/postgres/docker-compose.yml`：

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
      - logging_collector=on
      - -c
      - log_directory=/var/log/postgresql
      - -c
      - log_filename=postgresql-%Y-%m-%d.log
      - -c
      - log_truncate_on_rotation=on
      - -c
      - log_rotation_age=1d
      - -c
      - log_rotation_size=100MB
      - -c
      - log_min_duration_statement=1000
    volumes:
      - ./data:/var/lib/postgresql/data
      - ./logs:/var/log/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
```

配置原因：

- 通过环境变量 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` 在首次初始化时直接创建业务数据库和业务账户，避免长期使用超级用户
- 日志相关参数通过 `command -c` 传入，无需额外挂载配置文件，保持部署结构简洁
- 增加 `healthcheck`，让编排层能够感知 PostgreSQL 是否真正完成启动

## 3. 常见问题

### 日志目录权限不足

容器启动后反复重启，日志中出现如下报错：

```text
PostgreSQL Database directory appears to contain a database; Skipping initialization

FATAL:  could not open log file "/var/log/postgresql/postgresql-2026-07-08.log": Permission denied
LOG:  database system is shut down
```

**原因**：挂载的 `logs` 目录权限不足，`postgres` 容器内以 UID `999` 运行，该用户对宿主机目录没有写入权限。

**解决**：在宿主机上为 `logs` 目录授予 999 用户的读写权限：

```bash
# 方式一：将目录所有者改为 999
chown -R 999:999 /app/postgres/logs

# 方式二：放宽目录权限
chmod -R 777 /app/postgres/logs
```

> 同理，`data` 目录如果也出现权限问题，处理方式相同。`999` 就是 `postgres:17` 容器内运行用户的 UID。

## 4. 常用命令

```bash
# 启动 PostgreSQL
cd /app/postgres && docker compose up -d

# 关闭 PostgreSQL
cd /app/postgres && docker compose down

# 查看容器日志
docker logs -f postgres
```
