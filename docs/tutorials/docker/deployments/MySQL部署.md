---
title: MySQL
date: 2026-07-20 00:00
tags: [mysql, docker, deployment]
---

# MySQL

本文提供 MySQL 的 Docker Compose 部署示例与配置原因说明。

说明：本文基于 Docker Official Image `mysql:8.4.8`。经核对官方镜像入口脚本，远程 `root` 连接应优先使用镜像内置的 `MYSQL_ROOT_HOST` 机制，不需要额外编写 `/docker-entrypoint-initdb.d` 初始化脚本。

## 1. 目录与挂载约定

```text
/app/mysql/
├─ docker-compose.yml
├─ data/
└─ logs/
```

说明：

- `data`：MySQL 数据目录，容器重建后数据不丢失
- `logs`：MySQL 文件型日志目录，便于长期留存、备份和排障

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
      - --log-error=/var/log/mysql/error.log
      - --slow-query-log=1
      - --slow-query-log-file=/var/log/mysql/slow.log
    volumes:
      - ./data:/var/lib/mysql
      - ./logs:/var/log/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-pchange_me"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 60s
```

配置原因：

- 持久化数据目录和日志目录，数据库数据与日志文件分开留存
- 不额外挂载 `mysql.conf` 或 `my.cnf`，仅通过启动参数把错误日志和慢查询日志落到挂载目录
- 通过 `MYSQL_ROOT_HOST=%` 显式声明允许远程 `root` 登录，行为与官方镜像初始化逻辑一致，无需额外初始化脚本
- 增加 `healthcheck`，便于在编排层判断 MySQL 何时真正可用

## 3. 日志路径说明

MySQL 的日志路径存在默认规则，但在 Docker 部署中建议明确把需要长期保留的文件型日志写到挂载目录：

| 日志类型 | 本文路径 | 默认行为说明 |
| --- | --- | --- |
| 错误日志 | `/var/log/mysql/error.log` | Unix/Linux 下未指定 `--log-error` 时默认输出到控制台；指定 `--log-error` 但不带文件名时，默认写入数据目录下的 `host_name.err` |
| 慢查询日志 | `/var/log/mysql/slow.log` | 默认关闭；启用但不指定文件名时，默认写入数据目录下的 `host_name-slow.log` |

参考来源：

- [MySQL 8.4 Error Log Destination](https://dev.mysql.com/doc/refman/8.4/en/error-log-destination-configuration.html)
- [MySQL 8.4 Slow Query Log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)

## 4. 高级配置说明

日常部署通常不需要额外挂载 `mysql.conf` 或 `my.cnf` 配置文件，建议先使用官方镜像默认值。确实需要调整连接数、字符集、认证插件等高级参数时，再结合当前 MySQL 版本和业务场景查阅官方文档后单独配置。

## 5. 远程 root 连接说明

- Docker Official Image 在首次初始化数据目录时会处理 `MYSQL_ROOT_HOST`；对于 `mysql:8.4.8`，入口脚本默认值为 `%`，因此新初始化实例本身就支持 `root` 从非 `localhost` 主机登录
- 本文仍显式保留 `MYSQL_ROOT_HOST: "%"`，目的是让配置意图更直观；若需收敛权限，建议改为固定来源地址或网段模式，而不是长期使用 `%`

## 6. 常用命令

```bash
# 启动 MySQL
cd /app/mysql && docker compose up -d

# 关闭 MySQL
cd /app/mysql && docker compose down

# 查看容器日志
docker logs -f mysql

# 查看错误日志文件
tail -f /app/mysql/logs/error.log

# 查看慢查询日志文件
tail -f /app/mysql/logs/slow.log
```
