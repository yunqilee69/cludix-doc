---
slug: /operations/redis-compose
title: Redis Docker Compose 配置
---

# Redis

本文提供 Redis 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.redis.yml
└─ redis/
   ├─ data/
   ├─ conf/
   └─ logs/
```

说明：

- `data`：Redis 持久化数据目录（RDB/AOF）
- `conf`：Redis 配置目录，独立维护参数
- `logs`：Redis 日志目录，便于问题定位

## 2. 目录权限设置

Redis alpine 镜像默认以 root 运行，无需特殊权限设置。创建目录即可：

```bash
# 创建目录
mkdir -p /app/redis/{data,conf,logs}
```

:::tip
如果需要让 Redis 以非 root 用户运行，可在 compose 中添加 `user: "999:999"` 参数，并执行 `sudo chown -R 999:999 /app/redis`。
:::

## 3. Compose 配置示例

`/app/docker-compose.redis.yml`：

```yaml
services:
  redis:
    image: redis:7.4-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    volumes:
      - /app/redis/data:/data
      - /app/redis/conf/redis.conf:/usr/local/etc/redis/redis.conf:ro
      - /app/redis/logs:/var/log/redis
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 30s
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 复用 `app-net`，业务容器可通过容器名直接访问 Redis
- 配置文件只读挂载，避免运行时意外篡改
- 日志与数据分离挂载，便于排障和备份策略制定
- 增加 `healthcheck`，可及时发现 Redis 无响应或启动异常

## 4. Redis 配置示例

`/app/redis/conf/redis.conf`：

```conf
bind 0.0.0.0
protected-mode yes
port 6379
appendonly yes
dir /data
logfile /var/log/redis/redis.log
```

配置原因：

- `appendonly yes` 开启 AOF，提升数据持久化可靠性
- `dir /data` 与宿主机挂载目录对应，便于数据管理
- 日志文件写入挂载目录，避免容器销毁后日志丢失

## 5. 常用命令

```bash
# 启动 Redis
docker compose -f /app/docker-compose.redis.yml up -d

# 关闭 Redis
docker compose -f /app/docker-compose.redis.yml down

# 查看容器日志
docker logs -f redis
```