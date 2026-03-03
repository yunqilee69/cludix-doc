# Milvus

本文提供 Milvus 向量数据库的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

也可以参考官网的部署步骤：[Docker 部署](https://milvus.io/docs/zh/configure-docker.md?tab=component)

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.milvus.yml
└─ milvus/
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

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`

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

`/app/docker-compose.milvus.yml`：

```yaml
services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.25
    group_add:
      - "<APPGROUP_GID>"
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - /app/milvus/etcd:/etcd
    command: etcd -advertise-client-urls=http://etcd:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
    healthcheck:
      test: ["CMD", "etcdctl", "endpoint", "health"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - app-net

  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2024-12-18T13-15-44Z
    group_add:
      - "<APPGROUP_GID>"
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - /app/milvus/minio:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - app-net

  standalone:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.6.3
    command: ["milvus", "run", "standalone"]
    group_add:
      - "<APPGROUP_GID>"
    security_opt:
      - seccomp:unconfined
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
      COMMON_SECURITY_AUTHORIZATIONENABLED: true
      COMMON_SECURITY_DEFAULTROOTPASSWORD: nebula
    volumes:
      - /app/milvus/milvus:/var/lib/milvus
      - /app/milvus/user.yaml:/milvus/configs/user.yaml:ro
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
    networks:
      - app-net

  attu:
    container_name: attu
    image: zilliz/attu:latest
    group_add:
      - "<APPGROUP_GID>"
    environment:
      MILVUS_URL: standalone:19530
    ports:
      - "8000:3000"
    depends_on:
      - standalone
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用外部网络 `app-net`，便于与其他 compose 中的应用直接互通
- 通过 `group_add` 复用宿主机组权限，减少重复 `chown` 操作
- 配置文件只读挂载，避免运行时意外篡改
- 数据分离挂载（etcd、minio、milvus），便于备份和管理
- 集成 Attu 可视化管理工具，便于日常运维
- 增加 `healthcheck`，便于在编排层判断服务何时真正可用

## 4. 服务说明

### Milvus Standalone

单机版 Milvus 向量数据库服务，端口映射：

- `19530`：Milvus gRPC 服务端口
- `9091`：健康检查和 metrics 端点

### Attu

Milvus 的可视化管理工具，提供直观的 Web 界面来管理集合、数据和索引。

### Etcd

分布式键值存储，用于 Milvus 的元数据管理。

### MinIO

对象存储服务，用于存储 Milvus 的数据文件。

## 5. 常用命令

```bash
# 启动 Milvus
docker compose -f /app/docker-compose.milvus.yml up -d

# 关闭 Milvus
docker compose -f /app/docker-compose.milvus.yml down

# 查看容器日志
docker logs -f milvus-standalone
```

## 6. 访问服务

- **Milvus 服务**：`localhost:19530`
- **Attu 管理界面**：http://localhost:8000
- **健康检查端点**：http://localhost:9091/healthz

## 7. 常见问题

### 修改默认密码

在 `docker-compose.milvus.yml` 中修改环境变量 `COMMON_SECURITY_DEFAULTROOTPASSWORD` 的值，或在 `user.yaml` 中修改 `defaultRootPassword`。

### 数据持久化

所有数据都存储在 `/app/milvus/` 目录下的子目录中，备份这些目录即可完成数据备份。

## 8. 相关链接

- [Milvus 官方文档](https://milvus.io/docs)
- [Attu 管理工具](https://github.com/zilliztech/attu)
- [系统配置参考](https://milvus.io/docs/zh/system_configuration.md)