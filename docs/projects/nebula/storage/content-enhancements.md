---
title: 存储增强（对象存储与图片处理）
date: 2026-10-02 11:15
tags: [nebula, storage, configuration]
---

# 存储增强（对象存储与图片处理）

`nebula-storage` 本批新增三块能力：**S3 兼容对象存储后端**、**图片派生版本（缩略图）**、**存储后端迁移工具**。三者的默认配置都**不改变现有行为**（S3 需显式切换、图片处理默认关闭、迁移工具需主动调用）。

## 1. S3 兼容对象存储后端

### 1.1 定位

新增 S3 兼容的 `StorageBinaryStore`（`nebula.storage.content.type=s3`），**一份实现覆盖阿里云 OSS / 腾讯云 COS / 七牛 / MinIO 等**。此前对象存储只有 MinIO 实现。

正式内容存储类型由 `nebula.storage.content.type` 决定，取值：`filesystem`（默认）/ `db` / `minio` / `s3`。分派点是 `StorageStoreFactory`。

### 1.2 配置

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
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `endpoint` | 无 | 服务地址，如 `https://oss-cn-hangzhou.aliyuncs.com` 或 `http://minio:9000` |
| `region` | 无 | 区域；多数云厂商必填，MinIO 可留空（代码回退 `us-east-1`） |
| `access-key` / `secret-key` | 无 | AK/SK，**只走环境变量** |
| `bucket` | 无 | Bucket 名称 |
| `path-style-access` | `true` | 见下方「path-style 的坑」 |
| `create-bucket-if-missing` | `false` | 是否自动建桶 |

**凭据只走环境变量**：AK/SK 不允许写入数据库、仓库或日志；`S3ObjectAddress` 仅做寻址诊断，不含签名与凭据。

### 1.3 path-style-access 的坑

`path-style-access` 决定对象的寻址形态：

- `true`（默认）：`scheme://host[:port]/bucket/key`，例如 `http://minio:9000/nebula-storage/a.jpg`
- `false`：`scheme://bucket.host[:port]/key`，例如 `http://nebula-storage.minio:9000/a.jpg`

**配错会得到 404 或签名错误**，不是明显的配置报错：

- **MinIO / 自建网关**：需要 `true`（`false` 时子域无法解析）。
- **多数云厂商（OSS/COS/七牛）**：需要 `false`（除非使用厂商的 path-style 兼容端点）。

`region` 留空时回退 `us-east-1`；`create-bucket-if-missing` 默认 `false`——多数云厂商的 AK 没有建桶权限，生产建议保持 `false`。

### 1.4 装配与校验

- 配置不完整（`endpoint` / `bucket` / `accessKey` / `secretKey` 任一为空）→ `S3_CONFIG_INCOMPLETE`（`24020`）。
- `create-bucket-if-missing=false` 且 bucket 不存在 → 同样 `S3_CONFIG_INCOMPLETE`。
- 实现基于 AWS SDK v2（`software.amazon.awssdk:s3`），强制 path-style 由 `forcePathStyle(...)` 控制。

---

## 2. 图片派生版本（缩略图）

### 2.1 定位

新增 `storage_file_variant` 表，保存图片的派生版本（当前只有 `thumb`）。上传后按配置生成；派生是「可选存在」——未开启或处理失败时没有派生行，**读取端回退原图**。

### 2.2 配置

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
| `enabled` | `false` | 是否开启图片处理（缩略图派生与尺寸上限校验） |
| `thumb-width` / `thumb-height` | `320` / `320` | 缩略图目标尺寸（不放大：`scale = min(target/src, 1.0)`） |
| `thumb-quality` | `0.8` | 缩略图压缩质量（0~1），输出固定为 jpeg |
| `max-width` / `max-height` | `0` | 原图尺寸上限，`0` 不限制 |

### 2.3 生成与去重

- 生成时机：`bindUploadTask` 保存正式文件后调用 `generateVariants`；已存在 `thumb` 派生则跳过。
- 内容按 `(fileHash, variant)` 寻址去重：多个业务引用同一张图只存一份缩略图，`contentKey` 形如 `variant/thumb/<fileHash>.jpg`。

### 2.4 防解压炸弹

解码前先读图片头部尺寸：

- 格式白名单：`jpeg` / `jpg` / `png` / `bmp` / `gif`。
- 像素总数硬上限 `50_000_000`；字节上限 `64 MiB`。
- 超过像素或字节上限直接拒绝（`IMAGE_DIMENSION_EXCEEDED`，`24021`）；非图片或畸形输入返回「无派生」而不是硬试。

### 2.5 读取与回退

- `GET /api/storage/download` 新增可选 `variant` 参数：缺省/null/空白 → 原图；`variant=thumb` → 缩略图。
- **请求的派生版本不存在时回退原图并记 WARN，不抛 `VARIANT_NOT_FOUND`**——避免移动端列表页因缺少缩略图而整块空白。
- 文件详情响应新增 `variants`（可用派生版本与尺寸）。
- 签名下载 `download-signed` **不带** `variant`，恒返回原图。
- 删除文件时会删除派生行，若某 `contentKey` 不再被任何行引用则删除正式内容。

> `VARIANT_NOT_FOUND`（`24023`）已定义但当前实现未抛出（读取走回退原图）。

---

## 3. 存储后端迁移工具

### 3.1 能力

`StorageMigrationService.migrate(source, target)` 在 `StorageBinaryStore` 之间做一次性迁移：

- 遍历全部正式文件，逐条迁移。
- **逐项 MD5 校验**：源内容 MD5 与 `fileHash` 不一致 → `MIGRATION_CHECKSUM_MISMATCH`（`24025`）；写入目标后复核一次。
- **可重入跳过**：目标已存在且哈希匹配的文件直接跳过。
- **不删除源内容**：调用方在「双写 + 校验完成」后自行切换读取配置，最后清理旧内容。
- 返回 `MigrationReport(total, migrated, skipped)`。

支持的方向：`db → filesystem` 与 `db → s3`（代码对源/目标泛化，任意组合皆可）。

> **注意：该工具尚未交付触发入口**——管理接口与命令行均未提供，目前只能在测试或集成代码中显式调用 `migrate()`。接入方如需使用需自行封装触发方式。

### 3.2 迁移期间拒写

`StorageMigrationGuard` 在迁移进行中拒绝**正式写入**（`bindUploadTask` 开头 `requireWritable()`，命中抛 `MIGRATION_IN_PROGRESS`，`24024`）。上传到临时区（简单上传 / 分片 / complete）不经过该闸门，只有正式写入被拒。守卫是**进程内状态**（`AtomicBoolean`），不跨实例共享——迁移的前提是迁移期间应用单实例运行；多实例部署需自行安排整体停写。

### 3.3 分阶段步骤

```text
1. 停写窗口（安排停机/维护公告）
2. 启动迁移：db → 目标后端，逐项 MD5 校验
3. 迁移完成（migrated + skipped 覆盖全部正式文件）
4. 切换 nebula.storage.content.type 指向目标后端并重启
5. 抽样校验读取（原图 + 派生）
6. 确认无误后清理旧后端内容
```

### 3.4 回滚

- 迁移**不删除**源内容，因此第 4 步切换后若发现问题，把 `nebula.storage.content.type` 改回原值并重启即可回滚。
- 迁移期间写入被拒，需安排停机窗口；不要在写入高峰期执行。

---

## 4. 接口与权限码

| 方法 + 路径 | 权限码 | 说明 |
| --- | --- | --- |
| `GET /api/storage/download` | `STORAGE_FILE_QUERY` | 新增可选 `variant` 参数 |
| `POST /api/storage/files/list-by-source` | `STORAGE_FILE_QUERY` | 由内部能力开放为正式接口（按业务实体查附件，供移动端列表页取图） |
| `DELETE /api/storage/files/{fileId}` | `STORAGE_FILE_DELETE` | 补齐权限码 |
| 其余上传/查询接口 | `STORAGE_UPLOAD` / `STORAGE_FILE_QUERY` | 见[业务功能](./business-capabilities) |

`POST /api/storage/files/list-by-source` 请求：`sourceEntity`（必填）、`sourceId`（必填）、`sourceType`（可选）；响应为文件列表（**不含 `variants`**，`variants` 只在文件详情接口返回）。

## 5. 错误码

| 错误码 | 名称 | 说明 |
| --- | --- | --- |
| `24020` | `S3_CONFIG_INCOMPLETE` | S3 兼容对象存储配置不完整 |
| `24021` | `IMAGE_DIMENSION_EXCEEDED` | 图片尺寸超过上限 |
| `24022` | `IMAGE_PROCESS_FAILED` | 图片处理失败 |
| `24023` | `VARIANT_NOT_FOUND` | 请求的派生版本不存在（当前实现走回退原图，未抛出） |
| `24024` | `MIGRATION_IN_PROGRESS` | 存储后端迁移进行中，暂不接受写入 |
| `24025` | `MIGRATION_CHECKSUM_MISMATCH` | 迁移校验失败，内容哈希不一致 |
| `24026` | `STORAGE_BACKEND_MISMATCH` | 文件不属于当前存储后端，拒绝删除 |

## 6. 数据表

`storage_file_variant` 的字段与索引见 [Storage 数据表](./ddl)。
