# PostgreSQL 17

本文提供 PostgreSQL 17 的配置示例与配置原因说明。

说明：本文基于 Docker Official Image `postgres:17`，适用于常规单机持久化部署场景。

## 1. 目录与挂载约定

```text
/app/postgres/
├─ docker-compose.yml
└─ data/
```

说明：

- `data`：PostgreSQL 数据目录，容器重建后数据不丢失

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
    volumes:
      - ./data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
```

配置原因：

- 通过环境变量 `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` 在首次初始化时直接创建业务数据库和业务账户，避免长期使用超级用户
- 其他参数使用镜像默认值，保持部署结构简洁
- 增加 `healthcheck`，让编排层能够感知 PostgreSQL 是否真正完成启动

## 3. 常用命令

```bash
# 启动 PostgreSQL
cd /app/postgres && docker compose up -d

# 关闭 PostgreSQL
cd /app/postgres && docker compose down

# 查看容器日志
docker logs -f postgres
```
