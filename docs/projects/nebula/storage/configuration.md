# Nebula Storage 配置说明

## 1. 配置总览

`nebula-storage` 的配置来源主要分成两类：

1. **静态 Spring Boot 配置项**：以 `nebula.storage.*` 为主
2. **缓存与基础设施协作配置**：主要是 `nebula.cache.*` 与底层 provider 依赖项

理解这两类配置的边界很重要：

- `nebula.storage.*` 决定存储模块如何运行
- `nebula.cache.*` 主要影响签名下载计数等协作能力

> 说明：当前仓库内可直接确认的 storage 配置示例主要来自 `nebula-storage/README.md` 与使用文档中的已整理示例；仓库中未直接提供独立 `nebula-storage-service/src/main/resources/application.yml` 供逐项核对，因此本文以当前可见配置契约和 README 示例为准。

---

## 2. `nebula.storage.*` 核心配置

基础示例：

```yaml
nebula:
  storage:
    mode: local
    temp-dir: /data/nebula/storage/temp
    signed-download:
      enabled: true
      secret: change-me-storage-signed-secret
      default-expire-seconds: 300
      max-expire-seconds: 1800
      default-max-download-count: 3
      max-download-count-limit: 10
    content:
      type: minio
      filesystem:
        base-dir: /data/nebula/storage/content
      minio:
        endpoint: http://127.0.0.1:9000
        access-key: minioadmin
        secret-key: minioadmin
        bucket: nebula-storage
        create-bucket-if-missing: true
```

### 2.1 `nebula.storage.mode`

可选值：

- `local`
- `remote`

作用：

- `local`：启用本地控制器与本地 service 实现
- `remote`：当前应用作为 storage 服务消费者，通过 remote 层转调

### 2.2 `nebula.storage.temp-dir`

作用：

- 存普通上传临时文件
- 存分片文件
- 存分片合并结果

说明：

- temp 区固定走本地文件系统目录
- bind 成功后会通过事件和定时任务清理
- 不适合当长期存储区使用

### 2.3 `nebula.storage.content.type`

可选值：

- `filesystem`
- `db`
- `minio`
- `s3`（S3 兼容对象存储，覆盖 OSS / COS / 七牛 / MinIO 等）

作用：

- 决定**正式文件内容区**如何保存，而不是业务元数据表落在哪里

### 2.4 `nebula.storage.content.filesystem.base-dir`

作用：

- 当 `content.type=filesystem` 时，指定正式文件内容的本地目录根路径

### 2.5 `nebula.storage.content.minio.*`

常见配置包括：

- `endpoint`
- `access-key`
- `secret-key`
- `bucket`
- `create-bucket-if-missing`
- `direct-download-enabled`（默认 `false`）
- `direct-download-expire-seconds`（默认 `300`，上限 `3600`）

作用：

- 当 `content.type=minio` 时，指定 MinIO 连接与桶配置
- `direct-download-*` 决定客户端是否直连 MinIO 取文件（预签名直链）；关闭时所有下载经服务端流式转发

### 2.6 `nebula.storage.signed-download.*`

关键参数：

- `enabled`
- `secret`
- `default-expire-seconds`
- `max-expire-seconds`
- `default-max-download-count`
- `max-download-count-limit`

作用：

- 控制签名下载是否启用
- 控制签名有效期与最大下载次数上限

建议：

- `secret` 使用独立高强度随机值
- 不要把有效期设置过长
- 对对外分享场景可增加下载次数限制

---

## 3. provider 配置边界

### 3.1 temp 与 content 的职责分离

当前配置模型里最关键的一点是：

- `temp`：上传过程中的临时文件与分片
- `content`：绑定成功后的正式文件内容

这意味着：

- 上传过程中的中间态强调简单、稳定、低延迟
- 正式内容区强调长期保存和 provider 可切换

### 3.2 filesystem

建议用于：

- 本地开发
- 单机测试
- 小规模环境

### 3.3 db

建议用于：

- 不方便接对象存储的环境
- 文件量不大、集中数据库治理的场景

### 3.4 minio

建议用于：

- 生产环境
- 多节点部署
- 较大附件规模

---

## 4. cache 协作配置

在 README 和使用说明中，storage 还与缓存配置协作：

```yaml
nebula:
  cache:
    type: caffeine
    default-ttl: 300
```

作用：

- 为签名下载计数与相关缓存协作能力提供统一缓存后端

建议：

- 多实例场景下，明确配置统一缓存后端，避免下载次数统计只停留在单节点内存中

---

## 5. 本地模式与远程模式配置建议

### 5.1 单体 / 本地模式

示例：

```yaml
nebula:
  storage:
    mode: local
```

适用场景：

- 单体后台
- 文件能力直接随主应用运行

### 5.2 远程模式

示例：

```yaml
nebula:
  storage:
    mode: remote
    remote:
      service-name: nebula-storage-service
      service-url: http://localhost:17783
```

适用场景：

- 多业务系统共享统一附件中心
- 文件上传下载能力需要集中治理

---

## 6. 配置治理建议

### 6.1 临时区不要当正式内容区使用

因为：

- temp 区会被异步事件和定时任务清理
- 它只服务上传过程中的中间态文件

### 6.2 生产环境优先评估 minio

因为：

- 更适合正式文件内容存储
- 可扩展性和多节点共享能力更好

### 6.3 签名下载 secret 必须独立管理

因为：

- 它直接决定分享链接的安全性
- 不应沿用低强度默认值或和其他模块共用密钥

### 6.4 下载次数限制依赖统一缓存后端

如果你启用了 `maxDownloadCount` 一类限制：

- 单机环境可先用本地缓存
- 多实例环境建议使用统一缓存后端

这样才能避免不同实例之间的计数不一致。

### 6.5 直连下载按需开启

对象存储的 `direct-download-*` 默认关闭，即下载一律经服务端转发。开启后客户端拿临时直链自行取文件，可减轻应用出口带宽压力，但代价是：

- 直链在有效期内等效于凭据，泄露即可被任意使用——有效期不宜设置过长。
- 直链请求不经过应用，权限校验只在**签发直链时**发生一次。
- 需要对象存储本身允许客户端网络访问（内网部署的 MinIO 未必可达）。

内网部署或合规要求下载可审计时，保持关闭、走服务端代理更稳妥。

---

## 7. S3 兼容对象存储（`content.type=s3`）

当 `nebula.storage.content.type=s3` 时，正式内容区改用 S3 兼容后端：

```yaml
nebula:
  storage:
    content:
      type: s3
      s3:
        endpoint: ${NEBULA_STORAGE_S3_ENDPOINT:}
        region: ${NEBULA_STORAGE_S3_REGION:}
        access-key: ${NEBULA_STORAGE_S3_ACCESS_KEY:}
        secret-key: ${NEBULA_STORAGE_S3_SECRET_KEY:}
        bucket: ${NEBULA_STORAGE_S3_BUCKET:}
        path-style-access: ${NEBULA_STORAGE_S3_PATH_STYLE:true}
        create-bucket-if-missing: ${NEBULA_STORAGE_S3_CREATE_BUCKET:false}
        direct-download-enabled: ${NEBULA_STORAGE_S3_DIRECT_DOWNLOAD_ENABLED:false}
        direct-download-expire-seconds: ${NEBULA_STORAGE_S3_DIRECT_DOWNLOAD_EXPIRE_SECONDS:300}
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `endpoint` | 无 | 服务地址（OSS / COS / 七牛 / MinIO） |
| `region` | 无 | 区域；多数云厂商必填，MinIO 可留空（回退 `us-east-1`） |
| `access-key` / `secret-key` | 无 | AK/SK，**只走环境变量** |
| `bucket` | 无 | Bucket 名称 |
| `path-style-access` | `true` | MinIO/自建网关用 `true`，多数云厂商用 `false` |
| `create-bucket-if-missing` | `false` | 自动建桶；多数云厂商 AK 无建桶权限，生产建议 `false` |
| `direct-download-enabled` | `false` | 开启后 `/api/storage/download-location` 返回对象存储预签名直链 |
| `direct-download-expire-seconds` | `300` | 直链有效期（秒），上限 `3600`，超出按上限截断 |

- **凭据只走环境变量**，不入库、不入仓、不打日志。
- 配置不完整或 bucket 不存在且未开启自动建桶时报 `S3_CONFIG_INCOMPLETE`（24020）。
- `path-style-access` 配错会得到 404 或签名错误（不是明显的配置报错），选型时注意。
- 启用 S3 后端需把 `content.type` 改为 `s3` 并配齐 endpoint/region/bucket/AK/SK。
- 预签名直链本身是**凭据**，不写日志、不入审计快照、不回显到错误信息中。`filesystem`/`db` 后端不支持直连，恒走服务端代理。

---

## 8. 图片处理（`nebula.storage.image.*`）

```yaml
nebula:
  storage:
    image:
      enabled: false        # 默认关闭，关闭时行为与改造前完全一致
      thumb-width: 320
      thumb-height: 320
      thumb-quality: 0.8
      max-width: 0          # 原图宽度上限，0 表示不限制
      max-height: 0         # 原图高度上限，0 表示不限制
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `false` | 开启缩略图派生与尺寸上限校验 |
| `thumb-width` / `thumb-height` | `320` / `320` | 缩略图目标尺寸（不放大） |
| `thumb-quality` | `0.8` | 缩略图压缩质量（0~1），输出固定 jpeg |
| `max-width` / `max-height` | `0` | 原图尺寸上限，`0` 不限制 |

- 解码前先读图片头部尺寸，超过像素（5000 万）或字节（64 MiB）上限直接拒绝（`IMAGE_DIMENSION_EXCEEDED`, 24021）——防解压炸弹。
- 派生内容按 `(fileHash, variant)` 去重；读取端缺失派生时**回退原图**。
- 详见[存储增强（对象存储与图片处理）](./content-enhancements)。
