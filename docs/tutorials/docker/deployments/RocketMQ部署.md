# RocketMQ

本文提供 RocketMQ 的配置示例与配置原因说明。

## 1. 目录与挂载约定

```text
/app/rocketmq/
├─ docker-compose.yml
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

`/app/rocketmq/docker-compose.yml`：

```yaml
services:
  rocketmq-namesrv:
    image: apache/rocketmq:5.3.2
    container_name: rocketmq-namesrv
    restart: unless-stopped
    command: sh mqnamesrv
    ports:
      - "9876:9876"
    environment:
      TZ: Asia/Shanghai
    volumes:
      - ./namesrv/logs:/home/rocketmq/logs
    healthcheck:
      test: ["CMD", "sh", "-c", "nc -z localhost 9876"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 40s

  rocketmq-broker:
    image: apache/rocketmq:5.3.2
    container_name: rocketmq-broker
    restart: unless-stopped
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
      - ./broker/conf/broker.conf:/home/rocketmq/rocketmq-5.3.2/conf/broker.conf:ro
      - ./broker/logs:/home/rocketmq/logs
      - ./broker/store:/home/rocketmq/store
    healthcheck:
      test: ["CMD", "sh", "-c", "nc -z localhost 10911"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 60s
```

配置原因：

- NameServer 与 Broker 拆分，符合 RocketMQ 基础架构
- 通过容器名 `rocketmq-namesrv:9876` 直连 NameServer，简化服务发现
- Broker 日志与消息存储独立挂载，便于监控、备份和容量管理
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
brokerIP1=<宿主机IP>
```

配置原因：

- `brokerIP1` 必须显式设置为宿主机 IP，否则客户端无法正确连接 Broker
- `ASYNC_MASTER` + `ASYNC_FLUSH` 是单机部署的常见组合，兼顾性能与可靠性

## 4. 常用命令

```bash
# 启动 RocketMQ
cd /app/rocketmq && docker compose up -d

# 关闭 RocketMQ
cd /app/rocketmq && docker compose down

# 查看容器日志
docker logs -f rocketmq-namesrv
docker logs -f rocketmq-broker
```
