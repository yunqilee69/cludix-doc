---
title: XXL-Job
date: 2026-07-29 15:30
tags: [xxl-job, docker, deployment]
---

# XXL-Job

本文提供 XXL-Job Admin 3.4.2 的 Docker Compose 部署示例与配置说明。

XXL-Job 是一个轻量级分布式任务调度平台，核心由调度中心（Admin）和执行器（Executor）组成。本文仅部署调度中心单节点，执行器由业务应用自行集成。

## 1. 部署方案选择

XXL-Job Admin 支持两种部署方式：

- **方案一**：复用现有 MySQL 实例（适用于已有数据库环境）
- **方案二**：MySQL + XXL-Job 整合部署（适用于全新环境）

详见下文具体配置。

## 2. 前置条件

### 2.1 数据库准备

XXL-Job Admin 需要一个 MySQL 数据库（建议 5.7+ 或 8.0+），并需提前创建数据库和表结构。

创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS xxl_job DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 数据库表结构

从官方仓库获取初始化 SQL：

- GitHub: [tables_xxl_job.sql](https://github.com/xuxueli/xxl-job/blob/3.4.2/doc/db/tables_xxl_job.sql)

主要表结构：

| 表名 | 说明 |
|------|------|
| `xxl_job_info` | 任务信息表 |
| `xxl_job_log` | 任务日志表 |
| `xxl_job_log_report` | 日志报表 |
| `xxl_job_logglue` | Glue 脚本历史 |
| `xxl_job_registry` | 执行器注册表 |
| `xxl_job_group` | 执行器分组表 |
| `xxl_job_user` | 用户表 |
| `xxl_job_lock` | 分布式锁表 |

---

## 3. 方案一：复用现有 MySQL

适用于已有 MySQL 实例的场景，数据库可参考 [MySQL 部署](./MySQL部署)。

### 3.1 目录结构

```text
/app/xxl-job/
└─ docker-compose.yml
```

### 3.2 Compose 配置

`/app/xxl-job/docker-compose.yml`：

```yaml
services:
  xxl-job-admin:
    image: xuxueli/xxl-job-admin:3.4.2
    container_name: xxl-job-admin
    restart: unless-stopped
    environment:
      # 数据库配置（根据实际环境修改）
      PARAMS: >-
        --spring.datasource.url=jdbc:mysql://<MYSQL_HOST>:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
        --spring.datasource.username=xxl_job
        --spring.datasource.password=your_password
        --xxl.job.accessToken=your_token_here
      TZ: "Asia/Shanghai"
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/xxl-job-admin/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### 3.3 配置说明

**必填参数**：

| 参数 | 说明 |
|------|------|
| `--spring.datasource.url` | MySQL 连接地址，替换 `<MYSQL_HOST>` 为实际 IP 或域名 |
| `--spring.datasource.username` | 数据库用户名 |
| `--spring.datasource.password` | 数据库密码 |
| `--xxl.job.accessToken` | 调度中心访问令牌，执行器连接时需配置相同值 |

**可选参数**：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--server.port` | 8080 | 服务端口，一般不需要修改 |
| `JAVA_OPTS` | - | JVM 参数，如 `-Xms128m -Xmx512m` |
| `LOG_HOME` | /data/applogs | 日志目录 |

:::info

官方推荐使用 `PARAMS` 环境变量传递配置，它会覆盖 `application.properties` 中的默认值。

:::

---

## 4. 方案二：整合部署（MySQL + XXL-Job）

适用于全新环境，MySQL 和 XXL-Job 同时启动。

### 4.1 目录结构

```text
/app/xxl-job/
├─ docker-compose.yml
├─ mysql-data/
└─ init-sql/
    └─ tables_xxl_job.sql
```

说明：

- `mysql-data/`：MySQL 数据持久化目录
- `init-sql/`：数据库初始化脚本目录

### 4.2 准备初始化脚本

下载官方 SQL 脚本到 `init-sql/tables_xxl_job.sql`：

```bash
mkdir -p /app/xxl-job/init-sql
curl -fsSL https://raw.githubusercontent.com/xuxueli/xxl-job/3.4.2/doc/db/tables_xxl_job.sql \
  -o /app/xxl-job/init-sql/tables_xxl_job.sql
```

### 4.3 Compose 配置

`/app/xxl-job/docker-compose.yml`：

```yaml
services:
  mysql:
    image: mysql:8.4
    container_name: xxl-job-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "root_password"
      MYSQL_DATABASE: "xxl_job"
      MYSQL_USER: "xxl_job"
      MYSQL_PASSWORD: "your_password"
      TZ: "Asia/Shanghai"
    volumes:
      - ./mysql-data:/var/lib/mysql
      - ./init-sql:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 60s

  xxl-job-admin:
    image: xuxueli/xxl-job-admin:3.4.2
    container_name: xxl-job-admin
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      PARAMS: >-
        --spring.datasource.url=jdbc:mysql://mysql:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
        --spring.datasource.username=xxl_job
        --spring.datasource.password=your_password
        --xxl.job.accessToken=your_token_here
      TZ: "Asia/Shanghai"
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/xxl-job-admin/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### 4.4 配置说明

- MySQL 使用 `8.4` 版本，数据持久化到 `./mysql-data`
- 初始化脚本通过 `/docker-entrypoint-initdb.d` 自动执行（仅首次启动）
- `depends_on` + `healthcheck` 确保 MySQL 就绪后 XXL-Job 才启动
- 容器内网络使用服务名 `mysql` 作为数据库地址

---

## 5. 启动与验证

### 5.1 启动服务

```bash
# 进入项目目录
cd /app/xxl-job

# 启动服务
docker compose up -d

# 查看日志
docker logs -f xxl-job-admin
```

### 5.2 访问管理后台

启动成功后，访问：

```
http://<SERVER_IP>:8080/xxl-job-admin
```

**默认登录凭据**：

- 用户名：`admin`
- 密码：`123456`

:::warning

生产环境请务必修改默认密码。可通过 `PARAMS` 添加 `--xxl.job.login.password=新密码`。

:::

### 5.3 验证数据库连接

登录管理后台后：

1. 进入 **任务管理** → **执行器管理**
2. 查看是否有注册的执行器（首次启动应为空）
3. 进入 **任务管理** → **任务管理**，尝试创建测试任务

---

## 6. 常用命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker logs -f xxl-job-admin

# 重启
docker compose restart xxl-job-admin

# 查看容器状态
docker compose ps
```

---

## 7. 执行器集成

XXL-Job Admin 部署完成后，业务应用需集成执行器（Executor）。

### 7.1 Maven 依赖

```xml
<dependency>
    <groupId>com.xxl-job</groupId>
    <artifactId>xxl-job-core</artifactId>
    <version>3.4.2</version>
</dependency>
```

### 7.2 执行器配置

```yaml
xxl:
  job:
    admin:
      addresses: http://<ADMIN_IP>:8080/xxl-job-admin
    accessToken: your_token_here  # 与 Admin 配置一致
    executor:
      appname: xxl-job-executor
      address:
      ip:
      port: 9999
      logpath: /data/applogs/xxl-job/jobhandler
      logretentiondays: 30
```

详细集成方式参考官方文档：[XXL-Job 官方文档](https://www.xuxueli.com/xxl-job/)。

---

## 8. 常见问题

### 8.1 数据库连接失败

**现象**：日志报错 `Communications link failure`

**原因**：

1. MySQL 未启动或未就绪
2. 数据库地址、端口配置错误
3. 用户权限不足

**解决**：

1. 确认 MySQL 已启动：`docker ps | grep mysql`
2. 检查连接参数：`SPRING_DATASOURCE_URL` 格式
3. 验证用户权限：

```sql
-- 登录 MySQL
mysql -u root -p

-- 授权
GRANT ALL PRIVILEGES ON xxl_job.* TO 'xxl_job'@'%' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

### 8.2 管理后台无法访问

**现象**：浏览器访问 `http://IP:8080` 无响应

**排查**：

1. 容器是否启动：`docker ps -a | grep xxl-job`
2. 端口是否监听：`netstat -tlnp | grep 8080`
3. 防火墙是否放行：`firewall-cmd --list-ports`

### 8.3 执行器无法注册

**现象**：执行器管理中无注册信息

**原因**：

1. `accessToken` 不一致
2. 网络不通
3. 执行器配置错误

**解决**：

1. 确认 Admin 和 Executor 的 `accessToken` 一致
2. 检查网络连通性：`curl http://<ADMIN_IP>:8080/xxl-job-admin/`
3. 查看执行器日志

---

## 9. 参考链接

- [XXL-Job 官方仓库](https://github.com/xuxueli/xxl-job)
- [XXL-Job 官方文档](https://www.xuxueli.com/xxl-job/)
- [数据库初始化脚本](https://github.com/xuxueli/xxl-job/blob/3.4.2/doc/db/tables_xxl_job.sql)
- [MySQL 部署](./MySQL部署)