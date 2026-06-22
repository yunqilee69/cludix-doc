# MySQL

本文提供 MySQL 的配置示例与配置原因说明。

说明：本文基于 Docker Official Image `mysql:8.4.8`。经核对官方镜像入口脚本，远程 `root` 连接应优先使用镜像内置的 `MYSQL_ROOT_HOST` 机制，不需要额外编写 `/docker-entrypoint-initdb.d` 初始化脚本。

## 1. 目录与挂载约定

```text
/app/mysql/
├─ docker-compose.yml
├─ data/
├─ conf.d/
└─ logs/
```

说明：

- `data`：MySQL 数据目录，容器重建后数据不丢失
- `conf.d`：自定义配置目录，用于覆盖默认参数
- `logs`：错误日志与慢日志持久化目录，便于排障与审计

## 2. Compose 配置示例

`/app/mysql/docker-compose.yml`：

```yaml
services:
  mysql:
    image: mysql:8.4.8
    container_name: mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "change_me"
      MYSQL_ROOT_HOST: "%"
      TZ: "Asia/Shanghai"
    ports:
      - "3306:3306"
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    volumes:
      - ./data:/var/lib/mysql
      - ./conf.d:/etc/mysql/conf.d:ro
      - ./logs:/var/log/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-pchange_me"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 60s
```

配置原因：

- 使用挂载目录拆分数据、配置、日志，降低误操作影响面
- 设置字符集为 `utf8mb4`，避免中文和表情字符兼容问题
- MySQL 8.4 已移除 `default-authentication-plugin` 参数，避免配置该参数导致启动失败
- 通过 `MYSQL_ROOT_HOST=%` 显式声明允许远程 `root` 登录，行为与官方镜像初始化逻辑一致，无需额外初始化脚本
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
- `bind-address=0.0.0.0` 只控制监听地址，不会自动授予远程登录权限；是否可远程登录仍取决于 MySQL 账户的 host 部分
- 开启慢查询日志，便于定位 SQL 性能瓶颈
- 错误日志与慢日志统一输出到挂载目录，便于长期留存

## 4. 远程 root 连接说明

- Docker Official Image 在首次初始化数据目录时会处理 `MYSQL_ROOT_HOST`；对于 `mysql:8.4.8`，入口脚本默认值为 `%`，因此新初始化实例本身就支持 `root` 从非 `localhost` 主机登录
- 本文仍显式保留 `MYSQL_ROOT_HOST: "%"`，目的是让配置意图更直观；若需收敛权限，建议改为固定来源地址或网段模式，而不是长期使用 `%`

## 5. 常用命令

```bash
# 启动 MySQL
cd /app/mysql && docker compose up -d

# 关闭 MySQL
cd /app/mysql && docker compose down

# 查看容器日志
docker logs -f mysql
```
