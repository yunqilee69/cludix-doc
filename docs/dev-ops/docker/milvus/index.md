# Docker Compose 部署 Milvus

本文介绍如何在 Docker Compose 环境下部署单机版的 Milvus 服务，使用 etcd 和 MinIO 作为存储层。

也可以参考官网的部署步骤：[Docker 部署](https://milvus.io/docs/zh/configure-docker.md?tab=component)

## 准备配置文件

Milvus 支持增量配置，即优先使用用户提供的配置文件。当遇到配置项时，优先使用用户自定义配置，其次才使用 Milvus 的默认配置。

在容器部署中，配置文件必须命名为 `user.yaml`，容器内的目录位置为 `/milvus/configs/user.yaml`。推荐在容器外部完成配置后，通过卷挂载的方式映射到容器内。

详细的配置项说明，参考官网文档：[系统配置](https://milvus.io/docs/zh/system_configuration.md)

下面的配置启用了用户认证功能，要求客户端连接时必须提供账号密码，并修改了 root 账号的默认密码：

```yaml
common:
  security:
    authorizationEnabled: true
    defaultRootPassword: nebula
```

### 通过环境变量配置

也可以通过环境变量来配置 Milvus。配置项的层级关系通过下划线 `_` 连接，例如：

```yaml
COMMON_SECURITY_AUTHORIZATION_ENABLED: true
COMMON_SECURITY_DEFAULT_ROOT_PASSWORD: nebula
```

:::tip
环境变量对大小写不敏感，推荐使用全大写格式。对于复杂配置，建议直接使用 `user.yaml` 文件。
:::

## Docker Compose 配置

可以从官网下载官方提供的 Docker Compose 配置文件：

```bash
wget https://github.com/milvus-io/milvus/releases/download/v2.6.3/milvus-standalone-docker-compose.yml -O docker-compose.yml
```

或者使用下面的配置文件。相比官方版本，这个配置：
- 添加了自定义的用户认证配置
- 集成了 Attu 可视化管理工具

## 部署步骤

### 1. 启动服务

```bash
docker-compose up -d
```

### 2. 验证服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f standalone
```

### 3. 访问服务

- **Milvus 服务**：`localhost:19530`
- **Attu 管理界面**：http://localhost:8000
- **健康检查端点**：http://localhost:9091/healthz

## 服务说明

### Milvus Standalone
单机版 Milvus 服务，端口映射：
- `19530`：Milvus gRPC 服务端口
- `9091`：健康检查和 metrics 端点

### Attu
Milvus 的可视化管理工具，提供直观的 Web 界面来管理集合、数据和索引。

### Etcd
分布式键值存储，用于 Milvus 的元数据管理。

### MinIO
对象存储服务，用于存储 Milvus 的数据文件。

## 常见问题

### 修改默认密码

在 `docker-compose.yml` 中修改环境变量 `COMMON_SECURITY_DEFAULTROOTPASSWORD` 的值。

### 数据持久化

所有数据都存储在 `volumes/` 目录下，备份这个目录即可完成数据备份。

## 完整配置文件

```yaml
version: '3.5'

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
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/etcd:/etcd
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
    # ports:
    #   - "9001:9001"
    #   - "9000:9000"
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/minio:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  standalone:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.6.3
    command: ["milvus", "run", "standalone"]
    security_opt:
    - seccomp:unconfined
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
      COMMON_SECURITY_AUTHORIZATIONENABLED: true
      COMMON_SECURITY_DEFAULTROOTPASSWORD: nebula
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/milvus:/var/lib/milvus
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
      - "etcd"
      - "minio"

  attu:
    container_name: attu
    image: zilliz/attu:latest
    environment:
      MILVUS_URL: standalone:19530
    ports:
      - 8000:3000
    depends_on:
      - "standalone"

networks:
  default:
    name: milvus
```

## 相关链接

- [Milvus 官方文档](https://milvus.io/docs)
- [Attu 管理工具](https://github.com/zilliztech/attu)
- [系统配置参考](https://milvus.io/docs/zh/system_configuration.md)

