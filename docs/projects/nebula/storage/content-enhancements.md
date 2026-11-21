---
title: 存储增强（对象存储与图片处理）
date: 2026-10-02 11:15
tags: [nebula, storage, configuration]
---

# 存储增强（对象存储与图片处理）

`nebula-storage` 的增强能力共四块：**按厂商独立的对象存储后端**、**图片派生版本（缩略图）**、
**存储后端迁移工具**、**对象存储直连下载**。四者的默认行为都**不改变既有部署**：
对象存储需显式选择后端类型，图片处理默认关闭，迁移工具需主动调用，直连下载默认关闭。

## 1. 对象存储后端（按厂商独立成模块）

### 1.1 为什么不是一个「S3 兼容」实现

各家云厂商的**预签名算法与寻址规则并不一致**（签名 query、路径风格、地域推导、桶名规则都不同），
用一份通用 S3 实现去覆盖，代价是把差异藏进配置项，配错只表现为 404 或签名错误。
因此对象存储按厂商拆成独立模块，各封装自己的原生 SDK：

| 模块 | `type` 取值 | 必填项 | 说明 |
| --- | --- | --- | --- |
| `nebula-storage-provider-minio` | `minio` | `endpoint`、`bucket`、AK/SK | MinIO 与兼容网关 |
| `nebula-storage-provider-aliyun-oss` | `aliyun-oss` | `endpoint`、`bucket`、AK/SK | 地域由 SDK 从 endpoint 推导 |
| `nebula-storage-provider-tencent-cos` | `tencent-cos` | `region`、`bucket`、AK/SK | `bucket` 必须带 APPID 后缀；`endpoint` 可选 |

新增厂商只需新增一个模块并注册 `StorageContentProvider`，core 不需要改。

### 1.2 装配与校验

- `StorageContentProvider` 声明三件事：`type()`、`create(settings)`、`requiredSettingFields()`。
  必填项校验由配置保存逻辑按声明执行，core 里没有按类型名写的 if 分支。
- 只有**被选中的后端**才会校验配置并建立连接；未使用的 provider 段留空不影响启动。
- 配置不完整时报 `STORAGE_PROVIDER_CONFIG_INCOMPLETE`（`24020`）。
- `create-bucket-if-missing=true` 且 AK 无建桶权限时，会在第一次写入时报错；
  多数云厂商的 AK 没有建桶权限，生产建议预建桶并保持 `false`。

### 1.3 两层配置

对象存储的 `type` / `endpoint` / `region` / `bucket` / 凭据既可以写在 `application.yml`
（启动配置），也可以写进参数中心（租户级在线配置，5 秒内生效）。
`storage.backend.type=application` 表示跟随启动配置，详见[配置说明](./configuration)第 2、4 节。

---

## 2. 图片派生版本（缩略图）

### 2.1 定位

`storage_file_variant` 表保存图片的派生版本（当前只有 `thumb`）。上传后按配置生成；
派生是「可选存在」——未开启或处理失败时没有派生行，**读取端回退原图**。

### 2.2 配置

```yaml
nebula:
  storage:
    image:
      enabled: false        # 默认关闭，关闭时行为与未引入图片处理时完全一致
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

- 生成时机：绑定（`bindUploadTasks`）保存正式文件后调用 `generateVariants`；已存在 `thumb` 派生则跳过。
- 内容按 `(fileHash, variant)` 寻址去重：多个业务引用同一张图只存一份缩略图，
  `contentKey` 形如 `variant/thumb/<fileHash>.jpg`。

### 2.4 防解压炸弹

解码前先读图片头部尺寸：

- 格式白名单：`jpeg` / `jpg` / `png` / `bmp` / `gif`。
- 像素总数硬上限 `50_000_000`；字节上限 `64 MiB`。
- 超过像素或字节上限直接拒绝（`IMAGE_DIMENSION_EXCEEDED`，`24021`）；非图片或畸形输入返回「无派生」而不是硬试。

### 2.5 读取与回退

- `GET /api/storage/download` 支持可选 `variant` 参数：缺省/空白 → 原图；`variant=thumb` → 缩略图。
- `GET /api/storage/download-location` 同样接受 `variant`，直连模式下发的是该派生的预签名直链。
- **请求的派生版本不存在时回退原图并记 WARN，不抛 `VARIANT_NOT_FOUND`**——避免移动端列表页因缺少缩略图而整块空白。
- 文件详情响应包含 `variants`（可用派生版本与尺寸）。
- 签名下载 `download-signed` **不带** `variant`，恒返回原图。
- 删除文件时会删除派生行，若某 `contentKey` 不再被任何行引用则删除正式内容。

---

## 3. 存储后端迁移工具

### 3.1 能力

`StorageMigrationService.migrate(source, target)` 在 `StorageBinaryStore` 之间做一次性迁移：

- 遍历全部正式文件，逐条迁移。
- **逐项 MD5 校验**：源内容 MD5 与 `fileHash` 不一致 → `MIGRATION_CHECKSUM_MISMATCH`（`24025`）；写入目标后复核一次。
- **可重入跳过**：目标已存在且哈希匹配的文件直接跳过。
- **不删除源内容**：调用方在「双写 + 校验完成」后自行切换读取配置，最后清理旧内容。
- 返回 `MigrationReport(total, migrated, skipped)`。

方向对源/目标泛化：`db → filesystem`、`db → 对象存储`、`filesystem → 对象存储` 等任意组合皆可。

> **该工具尚未交付触发入口**：管理接口与命令行均未提供，目前只能在测试或集成代码中显式调用 `migrate()`。

### 3.2 迁移期间拒写

`StorageMigrationGuard` 在迁移进行中拒绝**正式写入**（`bindUploadTasks` 开头 `requireWritable()`，
命中抛 `MIGRATION_IN_PROGRESS`，`24024`）。上传到临时区（简单上传 / 分片 / complete）不经过该闸门。
守卫是**进程内状态**（`AtomicBoolean`），不跨实例共享——迁移的前提是迁移期间单实例运行。

### 3.3 分阶段步骤

```text
1. 停写窗口（安排停机/维护公告）
2. 启动迁移：源后端 → 目标后端，逐项 MD5 校验
3. 迁移完成（migrated + skipped 覆盖全部正式文件）
4. 切换后端（application.yml 或 高级配置 → 存储 tab）并生效
5. 抽样校验读取（原图 + 派生）
6. 确认无误后清理旧后端内容
```

### 3.4 回滚

- 迁移**不删除**源内容，因此第 4 步切换后若发现问题，把后端切回原值即可回滚。
- 迁移期间写入被拒，不要在写入高峰期执行。

---

## 4. 对象存储直连下载

### 4.1 定位

`GET /api/storage/download-location`：**由服务端决议本次下载走直链还是走代理**，
客户端不需要知道后端类型，也不自己选路。`filesystem` / `db` 恒为代理；
对象存储在开启直连开关后返回预签名直链。

定位方式二选一：

- 给 `fileId`：解析单个文件的下载位置；
- 给 `sourceEntity` + `sourceId`（可选 `sourceType`）：一次解析该业务实体下**全部附件**。

响应恒为**数组**（单文件解析只有一个元素），客户端可直接遍历渲染多项。`variant` 两种方式都支持。

### 4.2 响应

| 字段 | 说明 |
| --- | --- |
| `fileId` | 正式文件ID |
| `fileName` | 文件名，供列表页直接展示 |
| `fileMimeType` | 文件 MIME；请求派生版本时为该派生内容的类型 |
| `fileSize` | 文件字节数 |
| `mode` | `DIRECT`（`url` 是对象存储预签名直链）或 `PROXY`（`url` 是同源相对路径 `/api/storage/download?...`） |
| `url` | `DIRECT` 为临时直链（绝对地址）；`PROXY` 为带好 `fileId`/`variant` 的同源相对路径 |
| `expiresAtEpochSecond` | 仅 `DIRECT` 有值，直链过期时间 |

`filename` 有值 ⇒ 附件下载（`attachment`）；为空 ⇒ 内联预览（`inline`）。

> 按业务归属批量解析时按**预览语义**处理：不会把调用方传的 `filename` 套到批量结果上。
> 需要带文件名的单个下载，请按 `fileId` 单独解析。

### 4.3 配置

直连开关位于对象存储各自的配置节点下（在线配置里对应
`storage.backend.direct-download-enabled` / `storage.backend.direct-download-expire-seconds`），默认关闭：

```yaml
nebula:
  storage:
    content:
      type: minio
      minio:
        direct-download-enabled: ${NEBULA_STORAGE_MINIO_DIRECT_DOWNLOAD_ENABLED:false}
        direct-download-expire-seconds: ${NEBULA_STORAGE_MINIO_DIRECT_DOWNLOAD_EXPIRE_SECONDS:300}
      # aliyun-oss / tencent-cos 有同名配置项
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `direct-download-enabled` | `false` | 是否允许签发直链 |
| `direct-download-expire-seconds` | `300` | 直链有效期，上限 `3600`，超出按上限截断 |

### 4.4 能力声明与降级

- `StorageBinaryStore.supportsDirectAccess()` 默认 `false`；`filesystem` / `db` 用默认实现即自动降级为服务端流式转发。
- 对象存储后端在开关开启时返回 `true`，并通过 `presignGet(...)` 签发直链。

### 4.5 安全边界

- 预签名直链是**凭据**：不写日志、不入审计快照、不回显到错误信息。
- 直链有效期受上限截断，权限校验只在签发时发生一次。
- 签名分享下载 `download-signed` **恒经服务端代理**，不因直连开关而改变——它需要强制次数与时效，不能绕过。

---

## 5. 接口与权限码

| 方法 + 路径 | 权限码 | 说明 |
| --- | --- | --- |
| `GET /api/storage/settings` | `STORAGE_SETTINGS_QUERY`（接口码） | 读取存储配置：生效来源、两层配置（脱敏）、上传策略、切换风险 |
| `PUT /api/storage/settings` | `STORAGE_SETTINGS_UPDATE`（按钮码） | 保存存储配置；审计排除凭据字段 |
| `GET /api/storage/download-location` | `STORAGE_FILE_QUERY` | 解析下载位置，返回数组 |
| `GET /api/storage/download` | `STORAGE_FILE_QUERY` | 支持可选 `variant` 参数 |
| `POST /api/storage/files/list-by-source` | `STORAGE_FILE_QUERY` | 按业务实体查附件，供列表页取图 |
| `DELETE /api/storage/files/{fileId}` | `STORAGE_FILE_DELETE` | 删除正式文件 |
| 其余上传/查询接口 | `STORAGE_UPLOAD` / `STORAGE_FILE_QUERY` | 见[业务功能](./business-capabilities) |

## 6. 错误码

| 错误码 | 名称 | 说明 |
| --- | --- | --- |
| `24020` | `STORAGE_PROVIDER_CONFIG_INCOMPLETE` | 对象存储后端配置不完整 |
| `24021` | `IMAGE_DIMENSION_EXCEEDED` | 图片尺寸超过上限 |
| `24022` | `IMAGE_PROCESS_FAILED` | 图片处理失败 |
| `24023` | `VARIANT_NOT_FOUND` | 请求的派生版本不存在（当前实现走回退原图，未抛出） |
| `24024` | `MIGRATION_IN_PROGRESS` | 存储后端迁移进行中，暂不接受写入 |
| `24025` | `MIGRATION_CHECKSUM_MISMATCH` | 迁移校验失败，内容哈希不一致 |
| `24026` | `STORAGE_BACKEND_MISMATCH` | 文件不属于当前存储后端，拒绝删除 |
| `24031` | `STORAGE_SETTINGS_INVALID` | 存储配置不合法（类型未安装、必填项缺失、上传策略越界等） |

## 7. 数据表

`storage_file_variant` 的字段与索引见 [Storage 数据表](./ddl)。
