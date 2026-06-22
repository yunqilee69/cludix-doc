# PostgreSQL 17

本文提供 PostgreSQL 17 的配置示例与配置原因说明。

说明：本文基于 Docker Official Image `postgres:17`，适用于常规单机持久化部署场景。

## 1. 目录与挂载约定

```text
/app/postgres/
├─ docker-compose.yml
├─ data/
├─ conf/
└─ logs/
```

说明：

- `data`：PostgreSQL 数据目录，容器重建后数据不丢失
- `conf`：自定义配置目录，用于挂载 `postgresql.conf` 等配置文件
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
      - config_file=/etc/postgresql/postgresql.conf
    volumes:
      - ./data:/var/lib/postgresql/data
      - ./conf/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./logs:/var/log/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
```

配置原因：

- 将数据、配置、日志拆分挂载，降低误删配置或日志时影响数据目录的风险
- 使用 `command` 显式指定配置文件路径，便于后续统一维护自定义参数
- 通过 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` 在首次初始化时直接创建业务数据库和业务账户，避免长期使用超级用户
- 增加 `healthcheck`，让编排层能够感知 PostgreSQL 是否真正完成启动

## 3. PostgreSQL 配置示例

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
- `logging_collector = on` 开启日志收集，便于将日志输出到持久化目录

## 4. 常用命令

```bash
# 启动 PostgreSQL
cd /app/postgres && docker compose up -d

# 关闭 PostgreSQL
cd /app/postgres && docker compose down

# 查看容器日志
docker logs -f postgres
```
