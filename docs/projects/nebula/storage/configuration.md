# Nebula Storage 配置说明

## 1. 两层配置

`nebula-storage` 的配置分成两层，边界是**谁能改、什么时候生效**：

| 层 | 位置 | 作用域 | 生效方式 | 改法 |
| --- | --- | --- | --- | --- |
| 启动配置 | `application.yml` 的 `nebula.storage.*` | 整个应用 | 启动期装配，改动需重启 | 改配置文件 + 环境变量 |
| 在线配置 | 参数中心 `sys_param` 的 `storage.*` | 每个租户 | 运行期读取，5 秒内生效 | 系统配置 → 高级配置 → 存储 tab，或参数管理页 |

关键点：**在线配置里 `storage.backend.type=application`（默认值）表示「跟随 application.yml」**，
此时 `storage.backend.*` 的其余参数一律不参与解析，正式区后端完全由启动配置决定。
这个哨兵值的存在是为了避免「在线配置的默认值悄悄覆盖启动配置」——
那种失效是静默的：页面显示一套值，实际落盘走的是另一套。

---

## 2. 存储后端：取值与解析顺序

`storage.backend.type` 的可选值：

| 取值 | 含义 | 需要的模块 |
| --- | --- | --- |
| `application` | **跟随 `application.yml` 的 `nebula.storage.content.*`**（默认） | - |
| `filesystem` | 正式内容落本地目录 | 内置 |
| `db` | 正式内容落 `storage_content` 表 | 内置 |
| `minio` | MinIO 对象存储 | `nebula-storage-provider-minio` |
| `aliyun-oss` | 阿里云 OSS | `nebula-storage-provider-aliyun-oss` |
| `tencent-cos` | 腾讯云 COS | `nebula-storage-provider-tencent-cos` |

解析顺序（`ConfigurableStorageContentRepository`）：

1. 当前线程没有租户上下文（后台任务、定时清理）→ 用启动配置；
2. 有租户上下文、`storage.backend.type` 为空或 `application` → 用启动配置；
3. 其余取值 → 按该租户的参数中心配置建后端实例，并按 5 秒 TTL 重建（配置未变时复用实例，不重建 SDK 客户端）。

选一个未安装的类型会在**建实例时**失败并列出已安装类型，而不是启动期失败——
这是有意的：在线配置本来就可能是「先配好，再补依赖模块」。

---

## 3. 启动配置：`nebula.storage.*`

```yaml
nebula:
  storage:
    mode: local                       # local / remote
    temp-dir: ${java.io.tmpdir}/nebula
    content:
      type: db                        # filesystem / db / minio / aliyun-oss / tencent-cos
      filesystem:
        base-dir: build/nebula-storage/files
      minio:
        endpoint: ${NEBULA_STORAGE_MINIO_ENDPOINT:}
        access-key: ${NEBULA_STORAGE_MINIO_ACCESS_KEY:}
        secret-key: ${NEBULA_STORAGE_MINIO_SECRET_KEY:}
        bucket: ${NEBULA_STORAGE_MINIO_BUCKET:}
        create-bucket-if-missing: true
        direct-download-enabled: false
        direct-download-expire-seconds: 300
      aliyun-oss:
        endpoint: ${NEBULA_STORAGE_ALIYUN_OSS_ENDPOINT:}
        access-key: ${NEBULA_STORAGE_ALIYUN_OSS_ACCESS_KEY:}
        secret-key: ${NEBULA_STORAGE_ALIYUN_OSS_SECRET_KEY:}
        bucket: ${NEBULA_STORAGE_ALIYUN_OSS_BUCKET:}
      tencent-cos:
        region: ${NEBULA_STORAGE_TENCENT_COS_REGION:}
        endpoint: ${NEBULA_STORAGE_TENCENT_COS_ENDPOINT:}   # 可选，留空按 region 推导
        access-key: ${NEBULA_STORAGE_TENCENT_COS_ACCESS_KEY:}
        secret-key: ${NEBULA_STORAGE_TENCENT_COS_SECRET_KEY:}
        bucket: ${NEBULA_STORAGE_TENCENT_COS_BUCKET:}
```

- `mode`：`local` 启用本地控制器与实现；`remote` 表示当前应用通过 remote 层转调存储服务。
- `temp-dir`：**只能是本地文件系统目录**。上传中的普通文件、分片、分片合并结果都落这里，绑定成功后由事件与定时任务清理。
- `content.type`：未做在线配置（或在线配置选了 `application`）时生效的后端类型。
- 各 provider 段只在**该后端被选中**时校验并建立连接；留空未使用的段不影响启动。
- **凭据只走环境变量**，不入库、不入仓、不打日志。

### 3.1 `spring.servlet.multipart.*` 必须静态配

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 110MB
      max-request-size: 120MB
```

`MultipartProperties` 是启动期装配，Tomcat 在请求解析阶段就限流，早于任何 Controller。
因此它**不能**放进参数中心，且必须 ≥ 参数中心的 `storage.upload.max-file-size`，
否则超限请求会在进入业务校验前被容器以 413 拒绝（页面仍显示参数中心里的值）。
`StorageUploadCeilingGuard` 在启动时断言这一点，不满足直接启动失败。

---

## 4. 在线配置：`storage.backend.*`

| 参数键 | 说明 | 默认值 |
| --- | --- | --- |
| `storage.backend.type` | 后端类型；`application` 表示跟随 `application.yml` | `application` |
| `storage.backend.filesystem.base-dir` | `filesystem` 后端的根目录 | 空 |
| `storage.backend.endpoint` | 对象存储服务地址 | 空 |
| `storage.backend.region` | 对象存储地域（COS 必填） | 空 |
| `storage.backend.bucket` | 桶名 | `nebula-storage` |
| `storage.backend.access-key` | Access Key，**加密存储** | 空 |
| `storage.backend.secret-key` | Secret Key，**加密存储** | 空 |
| `storage.backend.create-bucket-if-missing` | 桶不存在时自动创建 | `true` |
| `storage.backend.direct-download-enabled` | 允许客户端直连对象存储 | `false` |
| `storage.backend.direct-download-expire-seconds` | 直链有效期（秒，上限 3600） | `300` |

- 这些参数是**租户级**：每个租户读自己的 `sys_param`，不存在跨租户兜底。
- 凭据在参数中心加密存储，接口只回传「是否已配置」，明文永不回显。
- `endpoint` 对 COS 可选：留空时按 `region` 推导官方域名（`<bucket>.cos.<region>.myqcloud.com`）。

### 4.1 配置页面

系统管理 → 系统配置 → **高级配置**（`/system/config/general`）→ **存储** tab。
该页的 tab 依次为：企业信息、认证、审计/通知等参数 tab、存储。

存储参数和这个页面上的其它参数一样都落在参数中心，因此放在同一个页面里维护——
用户不必为了配存储再去找另一个入口。区别只有两点：它由独立面板承载（有自己的加载与保存按钮），
保存走 `/api/storage/settings` 而不是通用配置的批量保存，因为需要按后端类型与上传策略做校验。

> 打开面板会立即请求 `GET /api/storage/settings`。若页面提示加载失败，优先检查当前账号是否被授予
> `STORAGE_SETTINGS_QUERY`（接口权限码），以及升级后是否执行了 `docs/sql/unreleased/06-storage-settings-permission.sql`。

面板内两块内容：

1. **后端存储**：后端类型下拉（第一项是「跟随 application.yml」）、按类型显隐的字段、凭据输入。
2. **上传策略**：单文件上限、分片阈值、分片大小、允许扩展名、临时任务保留天数。

页面同时展示 `application.yml` 里实际生效的后端配置（只读、脱敏），
所以选「跟随 application.yml」时不会出现「不知道到底用了什么」的黑箱。

权限：进入页面走「高级配置」菜单权限；读取走接口准入码 `STORAGE_SETTINGS_QUERY`，
保存走按钮权限码 `STORAGE_SETTINGS_UPDATE`（保存动作进审计，请求快照排除凭据字段）。

### 4.2 在线切换后端的风险

读取路径只认**当前**后端：`openFileContent` / 下载位置解析都打到当前生效的后端。
因此在线切换后端后，仍留在旧后端的文件会读不到（删除会被
`STORAGE_BACKEND_MISMATCH` 拒掉，避免留下悬空引用）。

- 配置页会统计并提示「不属于当前后端的正式文件数」；
- 迁移工具 `StorageMigrationService` 已有实现，但**尚未提供运维入口**，且迁移闸门是进程内状态，
  只能在单实例停机窗口内执行；
- 所以切换前请确认该租户的存量文件是否还需要读取。

### 4.3 存量租户

`storage.backend.type` 的默认值曾是 `filesystem`，升级时**刻意不改存量行**：
正在用 `filesystem` 存文件的租户一旦被改成 `application`，读取路径立刻指向新后端，旧文件读不到。
需要跟随 `application.yml` 的租户，请在配置页显式切换（页面会给出上述风险提示）。

---

## 5. 上传策略：`storage.upload.*`

| 参数键 | 说明 | 默认值 |
| --- | --- | --- |
| `storage.upload.max-file-size` | 单文件大小上限（MB，≤ 2047） | `100` |
| `storage.upload.chunk-threshold` | 分片上传阈值（MB） | `10` |
| `storage.upload.chunk-size` | 分片大小（MB） | `5` |
| `storage.upload.allowed-extensions` | 允许的扩展名，逗号分隔，空表示不限制 | 空 |
| `storage.upload.temp-retention-days` | 临时上传任务保留天数 | `14` |

不变式：`chunk-size ≤ chunk-threshold ≤ max-file-size ≤ spring.servlet.multipart.max-file-size`。

- **保存时**违反不变式直接报错（配置页与后端都会拦）；
- **运行期读取时**若参数被改成违反不变式，按「向下收敛」修正并告警，不在请求链路抛异常——
  上传是核心能力，宁可退化也不整体不可用。

---

## 6. 其余静态配置

### 6.1 签名下载（`nebula.storage.signed-download.*`）

仅 `application.yml` 配置，参数中心里没有对应键：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `false` | 是否启用签名分享下载 |
| `secret` | 无 | HMAC 密钥，必须独立高强度随机值 |
| `default-expire-seconds` | `300` | 默认有效期 |
| `max-expire-seconds` | `1800` | 最大有效期 |
| `default-max-download-count` | 不限 | 默认最大下载次数 |
| `max-download-count-limit` | 不限 | 允许设置的最大下载次数 |

下载次数计数走 `nebula.cache.*` 的缓存后端，多实例部署应配统一缓存，否则计数只在单节点内存中。

### 6.2 图片处理（`nebula.storage.image.*`）

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `false` | 开启缩略图派生与尺寸上限校验 |
| `thumb-width` / `thumb-height` | `320` / `320` | 缩略图目标尺寸（不放大） |
| `thumb-quality` | `0.8` | 缩略图压缩质量，输出固定 jpeg |
| `max-width` / `max-height` | `0` | 原图尺寸上限，`0` 表示不限制 |

关闭时行为与未引入图片处理时完全一致；派生内容按 `(fileHash, variant)` 去重，读取端缺派生时回退原图。

### 6.3 下载响应缓存（`nebula.storage.download.*`）

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `preview-max-age-seconds` | `300` | 预览响应允许浏览器私有缓存的秒数，`0` 表示不设置 |
| `location-max-age-seconds` | `60` | 下载位置接口缓存秒数，`0` 表示不缓存 |

预览是幂等读取，允许缓存并用 ETag 做条件请求；下载带附件名，显式禁止缓存。

---

## 7. 与缓存协作

签名下载的下载次数计数、部分派生元数据依赖 `nebula.cache.*`：

```yaml
nebula:
  cache:
    type: caffeine
    default-ttl: 300
```

多实例场景请统一缓存后端，避免计数分散在各节点内存里。
