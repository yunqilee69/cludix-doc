---
slug: /operations/rocketmq-compose
title: RocketMQ Docker Compose 配置
---

# RocketMQ

本文提供 RocketMQ 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.rocketmq.yml
└─ rocketmq/
   ├─ broker/
   │  ├─ conf/
   │  ├─ logs/
   │  └─ store/
   └─ namesrv/
      └─ logs/
```

说明：

- `broker/conf`：Broker 配置目录，独立维护集群与存储参数
- `broker/logs`：Broker 运行日志目录
- `broker/store`：消息存储目录，容器重建后消息不丢失
- `namesrv/logs`：NameServer 日志目录，便于排障

## 2. Compose 配置示例

`/app/docker-compose.rocketmq.yml`：

```yaml
services:
  rocketmq-namesrv:
    image: apache/rocketmq:5.3.2
    container_name: rocketmq-namesrv
    restart: unless-stopped
    group_add:
      - "<APPGROUP_GID>"
    command: sh mqnamesrv
    ports:
      - "9876:9876"
    environment:
      TZ: Asia/Shanghai
    volumes:
      - /app/rocketmq/namesrv/logs:/home/rocketmq/logs
    healthcheck:
      test: ["CMD", "sh", "-c", "nc -z localhost 9876"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 40s
    networks:
      - app-net

  rocketmq-broker:
    image: apache/rocketmq:5.3.2
    container_name: rocketmq-broker
    restart: unless-stopped
    group_add:
      - "<APPGROUP_GID>"
    depends_on:
      - rocketmq-namesrv
    command: sh mqbroker -c /home/rocketmq/rocketmq-5.3.2/conf/broker.conf
    ports:
      - "10909:10909"
      - "10911:10911"
      - "10912:10912"
    environment:
      NAMESRV_ADDR: rocketmq-namesrv:9876
      TZ: Asia/Shanghai
    volumes:
      - /app/rocketmq/broker/conf/broker.conf:/home/rocketmq/rocketmq-5.3.2/conf/broker.conf:ro
      - /app/rocketmq/broker/logs:/home/rocketmq/logs
      - /app/rocketmq/broker/store:/home/rocketmq/store
    healthcheck:
      test: ["CMD", "sh", "-c", "nc -z localhost 10911"]
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

- NameServer 与 Broker 拆分，符合 RocketMQ 基础架构
- 通过容器名 `rocketmq-namesrv:9876` 直连 NameServer，简化服务发现
- 通过 `group_add` 统一容器与宿主机组权限，降低日志/存储目录权限冲突
- Broker 日志与消息存储独立挂载，便于监控、备份和容量管理
- 复用 `app-net`，便于业务容器直连 MQ 服务
- 增加 `healthcheck`，可快速识别 NameServer/Broker 端口可用状态

## 3. Broker 配置示例

`/app/rocketmq/broker/conf/broker.conf`：

```properties
brokerClusterName=DefaultCluster
brokerName=broker-a
brokerId=0
deleteWhen=04
fileReservedTime=48
brokerRole=ASYNC_MASTER
flushDiskType=ASYNC_FLUSH
autoCreateTopicEnable=true
listenPort=10911
namesrvAddr=rocketmq-namesrv:9876
```

配置原因：

- 单机场景使用 `ASYNC_MASTER`，兼顾可用性与资源消耗
- 设置 `fileReservedTime` 控制消息文件保留时长，避免磁盘无限增长
- 显式声明 `namesrvAddr`，保证 Broker 启动后可注册到 NameServer

## 4. 常用命令（复制即用）

```bash
# 启动 RocketMQ
docker compose -f /app/docker-compose.rocketmq.yml up -d

# 关闭 RocketMQ
docker compose -f /app/docker-compose.rocketmq.yml down

# 查看 Broker 日志
docker logs -f rocketmq-broker
```
