# MySQL

本文提供 MySQL 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.mysql.yml
└─ mysql/
   ├─ data/
   ├─ conf.d/
   └─ logs/
```

说明：

- `data`：MySQL 数据目录，容器重建后数据不丢失
- `conf.d`：自定义配置目录，用于覆盖默认参数
- `logs`：错误日志与慢日志持久化目录，便于排障与审计

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`

## 2. Compose 配置示例

`/app/docker-compose.mysql.yml`：

```yaml
services:
  mysql:
    image: mysql:8.4.8
    container_name: mysql
    restart: unless-stopped
    group_add:
      - "<APPGROUP_GID>"
    environment:
      MYSQL_ROOT_PASSWORD: "change_me"
      TZ: "Asia/Shanghai"
    ports:
      - "3306:3306"
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    volumes:
      - /app/mysql/data:/var/lib/mysql
      - /app/mysql/conf.d:/etc/mysql/conf.d:ro
      - /app/mysql/logs:/var/log/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-pchange_me"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 60s
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用外部网络 `app-net`，便于与其他 compose 中的应用直接互通
- 使用挂载目录拆分数据、配置、日志，降低误操作影响面
- 设置字符集为 `utf8mb4`，避免中文和表情字符兼容问题
- MySQL 8.4 已移除 `default-authentication-plugin` 参数，避免配置该参数导致启动失败
- 通过 `group_add` 复用宿主机组权限，减少重复 `chown` 操作
- 增加 `healthcheck`，便于在编排层判断 MySQL 何时真正可用

## 3. MySQL 配置示例

`/app/mysql/conf.d/custom.cnf`：

```ini
[mysqld]
bind-address = 0.0.0.0
max_connections = 300
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_error = /var/log/mysql/error.log
```

配置原因：

- `bind-address=0.0.0.0` 允许容器网络内其他服务访问 MySQL
- 开启慢查询日志，便于定位 SQL 性能瓶颈
- 错误日志与慢日志统一输出到挂载目录，便于长期留存

## 4. 常用命令

```bash
# 启动 MySQL
docker compose -f /app/docker-compose.mysql.yml up -d

# 关闭 MySQL
docker compose -f /app/docker-compose.mysql.yml down

# 查看容器日志
docker logs -f mysql
```
