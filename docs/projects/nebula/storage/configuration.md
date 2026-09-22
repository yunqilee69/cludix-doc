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

作用：

- 当 `content.type=minio` 时，指定 MinIO 连接与桶配置

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
