# Milvus

本文提供 Milvus 向量数据库的配置示例与配置原因说明。

也可以参考官网的部署步骤：[Docker 部署](https://milvus.io/docs/zh/configure-docker.md?tab=component)

## 1. 目录与挂载约定

```text
/app/milvus/
├─ docker-compose.yml
├─ etcd/
├─ minio/
├─ milvus/
└─ user.yaml
```

说明：

- `etcd`：etcd 元数据存储目录
- `minio`：MinIO 对象存储数据目录
- `milvus`：Milvus 数据目录
- `user.yaml`：Milvus 自定义配置文件

## 2. 配置文件说明

Milvus 支持增量配置，即优先使用用户提供的配置文件。当遇到配置项时，优先使用用户自定义配置，其次才使用 Milvus 的默认配置。

在容器部署中，配置文件必须命名为 `user.yaml`，容器内的目录位置为 `/milvus/configs/user.yaml`。推荐在容器外部完成配置后，通过卷挂载的方式映射到容器内。

详细的配置项说明，参考官网文档：[系统配置](https://milvus.io/docs/zh/system_configuration.md)

### user.yaml 示例

`/app/milvus/user.yaml`：

```yaml
common:
  security:
    authorizationEnabled: true
    defaultRootPassword: nebula
```

配置原因：

- `authorizationEnabled: true` 启用用户认证，要求客户端连接时必须提供账号密码
- `defaultRootPassword` 设置 root 账号的默认密码

:::tip
也可以通过环境变量来配置 Milvus。配置项的层级关系通过下划线 `_` 连接，例如：

```yaml
COMMON_SECURITY_AUTHORIZATION_ENABLED: true
COMMON_SECURITY_DEFAULT_ROOT_PASSWORD: nebula
```

环境变量对大小写不敏感，推荐使用全大写格式。对于复杂配置，建议直接使用 `user.yaml` 文件。
:::

## 3. Compose 配置示例

`/app/milvus/docker-compose.yml`：

```yaml
services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.25
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - ./etcd:/etcd
    command: etcd -advertise-client-urls=http://etcd:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
    healthcheck:
      test: ["CMD", "etcdctl", "endpoint", "health"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2024-12-18T13-15-44Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - ./minio:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  milvus:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.5.4
    command: ["milvus", "run", "standalone"]
    security_opt:
      - seccomp:unconfined
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - ./milvus:/var/lib/milvus
      - ./user.yaml:/milvus/configs/user.yaml:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9091/healthz"]
      interval: 30s
      start_period: 90s
      timeout: 20s
      retries: 3
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - etcd
      - minio
```

配置原因：

- etcd、minio、milvus 拆分部署，符合官方推荐架构
- 通过容器名直连 etcd 和 minio，简化服务发现
- 数据目录独立挂载，便于备份和容量管理
- 增加 `healthcheck`，可在编排层判断各组件是否可用

## 4. 常用命令

```bash
# 启动 Milvus
cd /app/milvus && docker compose up -d

# 关闭 Milvus
cd /app/milvus && docker compose down

# 查看容器日志
docker logs -f milvus-standalone
```

## 5. 访问服务

默认访问地址：`http://<服务器IP>:19530`

Attu 是 Milvus 官方可视化管理工具，可通过 Docker 单独部署：

```bash
docker run -d --name attu -p 3000:3000 -e MILVUS_URL=<服务器IP>:19530 zilliz/attu:latest
```

访问 `http://<服务器IP>:3000` 即可使用 Attu 管理 Milvus。
