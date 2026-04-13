---
slug: /operations/nacos-compose
title: Nacos Docker Compose 配置
---

# Nacos

本文提供 Nacos 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.nacos.yml
└─ nacos/
   ├─ logs/
   └─ data/
```

说明：

- `logs`：运行日志目录，便于排障与审计
- `data`：本地嵌入式存储目录（单机场景）

## 2. 目录权限设置

Nacos 官方镜像默认以 root 运行，无需特殊权限设置。创建目录即可：

```bash
# 创建目录
mkdir -p /app/nacos/{logs,data}
```

## 3. Compose 配置示例

`/app/docker-compose.nacos.yml`：

```yaml
services:
  nacos:
    image: nacos/nacos-server:v3.1.1
    container_name: nacos
    restart: unless-stopped
    environment:
      PREFER_HOST_MODE: hostname
      MODE: standalone
      TZ: Asia/Shanghai
      NACOS_AUTH_TOKEN: "<BASE64_TOKEN_OVER_32_CHARS>"
      NACOS_AUTH_IDENTITY_KEY: "serverIdentity"
      NACOS_AUTH_IDENTITY_VALUE: "security"
    ports:
      - "8080:8080"
      - "8848:8848"
      - "9848:9848"
    volumes:
      - /app/nacos/logs:/home/nacos/logs
      - /app/nacos/data:/home/nacos/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/nacos/actuator/health"]
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

- 使用 `v3.1.1`，与官方最新长期支持分支对齐
- `MODE=standalone` 适合单机部署，部署复杂度低
- 复用 `app-net`，业务容器可直接通过容器名访问 Nacos
- 默认仅挂载 `logs/data`，避免空目录覆盖镜像内置 `conf` 导致启动失败
- 3.x 要求显式配置 `NACOS_AUTH_TOKEN`、`NACOS_AUTH_IDENTITY_KEY`、`NACOS_AUTH_IDENTITY_VALUE`
- 增加 `healthcheck`，可在编排层识别 Nacos 是否可用

## 4. 鉴权变量说明

`NACOS_AUTH_TOKEN` 需要使用 **长度大于 32 字符** 的密钥再进行 Base64 编码。可用以下命令生成：

```bash
openssl rand -base64 32
```

将输出结果填入 compose 的 `NACOS_AUTH_TOKEN`。

配置原因：

- 3.x 版本中鉴权相关参数属于必填项，缺失会导致启动异常
- 使用环境变量集中管理鉴权配置，便于运维统一修改

## 5. 可选：自定义 conf（高级）

`/home/nacos/conf` 是镜像内置目录。若直接挂载空目录，会把容器内默认文件"遮蔽"，出现 `nacos-logback.xml` 缺失错误。

推荐流程：

```bash
# 1) 先创建宿主机目录
mkdir -p /app/nacos/conf

# 2) 先从镜像导出默认 conf 到宿主机
docker run --rm nacos/nacos-server:v3.1.1 sh -c "tar -C /home/nacos -cf - conf" | tar -C /app/nacos -xf -

# 3) 再在 compose 中挂载 conf（此时目录里已有默认文件）
# - /app/nacos/conf:/home/nacos/conf
```

## 6. 故障排查：logback 文件缺失

若启动时报错：

`/home/nacos/conf/nacos-logback.xml (No such file or directory)`

说明你挂载了空 `conf` 目录。可按以下方式修复：

```bash
# 1) 临时移除 conf 挂载，仅保留 logs/data

# 2) 或先导出默认 conf 再挂载
mkdir -p /app/nacos/conf
docker run --rm nacos/nacos-server:v3.1.1 sh -c "tar -C /home/nacos -cf - conf" | tar -C /app/nacos -xf -

# 3) 重启
docker compose -f /app/docker-compose.nacos.yml down
docker compose -f /app/docker-compose.nacos.yml up -d
```

## 7. 常用命令

```bash
# 启动 Nacos
docker compose -f /app/docker-compose.nacos.yml up -d

# 关闭 Nacos
docker compose -f /app/docker-compose.nacos.yml down

# 查看容器日志
docker logs -f nacos
```