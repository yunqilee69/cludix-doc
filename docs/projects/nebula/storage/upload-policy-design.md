# 上传策略参数设计（upload policy）— 设计稿

> 状态：**已实现**（随 `0.2.1` 发布；§6 的步骤 1–3 同批次交付，前端分片路径已就绪）
> 范围：`nebula-storage` 上传大小策略参数 + 移除 `spring.servlet.multipart.*` 两个无效参数
> 关联：`docs/spec/10-config.md`（配置规范）、`docs/spec/07-exception.md`（异常/错误码）

### 落地与设计稿的差异（实现后回填）

| 项 | 设计稿 | 实现 |
|---|---|---|
| 参数上限约束 | 建议写进 `sys_param.max_value = 2047` | `sys_param` 无 `min_value`/`max_value` 列，改由 `StorageUploadPolicyResolver.MAX_CONFIGURABLE_MEGABYTES` 读取时兜底（越界回退默认值并告警），约束写入参数 `description` |
| 启动自检读不到参数中心 | 未说明 | 建表脚本由外部迁移执行时启动期读不到参数，按**默认策略继续断言**（而非跳过）；跳过只保留给「未接入 multipart」与「容器声明不限制」两种情况 |
| 默认值静态兜底位置 | 可选加 `NebulaStorageProperties.Upload` | 收敛为 `StorageUploadPolicyResolver` 的常量与 `defaultPolicy()`，不新增配置类 |
| 内部端点 | `StorageController` 补一个供 Feign 调用的端点 | `GET /api/storage/upload-policy`，仅在 `mode=remote` 时由 Feign 调用，浏览器不访问 |

---

## 1. 背景：现状与根因

高级配置页「存储」tab 现有两个参数：

| param_key | 现状 |
|---|---|
| `spring.servlet.multipart.max-file-size` | 只写 `sys_param`，无任何运行时消费者 |
| `spring.servlet.multipart.max-request-size` | 同上 |

实测（本地 8080 直连，绕过前端代理）：

| 上传大小 | 结果 |
|---|---|
| 900 KB | 401（到达应用，被鉴权拦截） |
| 1100 KB | **413** `{"status":413,"error":"Content Too Large"}` |
| 2 MB | **413** |

即：页面显示 100MB，实际生效的是 Spring Boot 默认 `max-file-size=1MB`。

**根因是范式错配，不是漏接线。** 这两个 key 是 Spring Boot 的**启动期装配**项：

```
MultipartAutoConfiguration
  → MultipartProperties(绑定 spring.servlet.multipart.*)
  → MultipartConfigElement bean
  → Tomcat 在「请求体解析阶段」限流
```

它由容器在解析请求时执行，早于任何 Controller/业务代码；而参数中心是「运行期按键读取」。因此：

- 全仓（含 git 全历史）**从未**引用过 `MultipartConfigElement` / `MultipartProperties`；
- 框架内除 `GeneralConfigController` 的 DTO 读写外，无任何代码读取这两个 key；
- 即使把值塞进 `Environment` 也无效——`MultipartConfigElement` 是启动时创建的单例。

**但原始意图是合理的**：想要的其实是「分片大小」和「超过多少 MB 走分片」。这两个是**业务策略**，在请求期读取即可，天然适合参数中心。本设计把它们做成真正生效的参数。

---

## 2. 结论：先做能力分层

先把「传输层」和「业务层」拆开，这是整个设计的基石。

| 关注点 | 归属 | 运行时可改 | 原因 |
|---|---|---|---|
| 单请求传输上限 | `spring.servlet.multipart.*`（`application.yml`） | ❌ 必须静态 | Tomcat 请求解析阶段 |
| 单文件总大小上限 | 参数中心 `storage.upload.max-file-size` | ✅ | 业务校验，请求期读取 |
| 分片阈值 | 参数中心 `storage.upload.chunk-threshold` | ✅ | 客户端选路 + 服务端强制 |
| 分片大小 | 参数中心 `storage.upload.chunk-size` | ✅ | 客户端切片 + 服务端校验 |
| 最大分片数 | **派生**，不做参数 | ✅ | 由 `max-file-size / chunk-size` 天然约束 |
| 临时任务保留天数 | 参数中心 `storage.upload.temp-retention-days` | ✅ | 替换硬编码 `minusDays(14)` |
| 允许扩展名 | 参数中心 `storage.upload.allowed-extensions` | ✅ | 可选的准入白名单 |

> 不做「上传总开关」：上传能力是本模块的核心职责，恒为开启，加开关只是增加一个可能被误关的失效点。

**核心约束（必须写进代码注释和运维文档）：**

```
静态 ceiling  ≥  max-file-size + 开销
```

静态 ceiling 是「物理管道口径」，业务参数是「业务闸门」。管道口径必须先于闸门放宽，否则 413 会先于业务校验发生——这正是本次事故的成因。

推荐 `application.yml`：

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 110MB     # ≥ storage.upload.max-file-size
      max-request-size: 120MB  # ≥ max-file-size + multipart 文本字段开销
server:
  tomcat:
    max-part-header-size: 10KB # 长文件名场景，默认 512B 易触发上传失败
```

### 2.1 启动期自检（防止同类静默失败再次发生）

在 `NebulaStorageAutoConfiguration` 注入 `MultipartProperties`，启动时断言：

```
multipart.maxFileSize >= storage.upload.max-file-size
```

不满足则 **fast-fail（`IllegalStateException`）**，错误信息直接说明「静态管道口径小于业务上限，会上报 413」。

> 这条自检是本设计的重点：本次问题的本质是「配了但静默不生效」。宁可启动失败，也不要运行期静默降级。

---

## 3. 参数清单

`module_code = 'storage'`，均落在高级配置页「存储 → 上传配置」。

| param_key | 名称 | data_type | 默认值 | 约束 | 消费方 |
|---|---|---|---|---|---|
| `storage.upload.max-file-size` | 单文件大小上限(MB) | INT | `100` | > 0 | `createUploadTask`、`uploadSimpleFile` |
| `storage.upload.chunk-threshold` | 分片上传阈值(MB) | INT | `10` | ≤ max-file-size | 客户端选路、服务端强制 |
| `storage.upload.chunk-size` | 分片大小(MB) | INT | `5` | ≤ chunk-threshold | 客户端切片、服务端校验 |
| `storage.upload.allowed-extensions` | 允许的扩展名 | STRING | `''`（空=不限制） | 逗号分隔 | 上传入口 |
| `storage.upload.temp-retention-days` | 临时任务保留天数 | INT | `14` | ≥ 1 | `storage.upload.task.cleanup` 清理任务 |

**参数间不变式**（写入 init SQL 的 `description`，并在服务端校验）：

```
chunk-size  ≤  chunk-threshold  ≤  max-file-size
```

### 3.1 为什么不做「最大分片数」参数

`createUploadTask` 当前要求客户端传 `chunkSize` / `chunkCount`。与其加参数限制客户端乱传，不如**服务端收回控制权**：

- 服务端按配置的 `chunk-size` 重新计算 `chunkCount = ceil(fileSize / chunk-size)`；
- 客户端传来的值不一致 → 拒绝（复用死代码 `INVALID_UPLOAD_MODE`）。

`chunkCount ≤ max-file-size / chunk-size`，天然有界，无需额外参数。**少一个旋钮，少一个错误配置源。**

### 3.2 单位选择

统一用 **MB（INT）**。不用 `"100MB"` 字符串：避免解析、避免前端 `valueToString`/`stringToValue` 的类型来回转换，也和同页 `audit.retention.days` 等保持一致。

> 注意：`chunkSize` 字段类型是 `Integer`（字节）。100MB = 104,857,600，未溢出；但**配置上限需约束 ≤ 2047MB**，否则转字节溢出。建议在 `max_value` 列写 `2047`。

---

## 4. 服务端强制点（防绕过）

仅靠前端遵守策略不可信，服务端必须强制。

### 4.1 `createUploadTask`

1. 扩展名不在白名单（白名单非空时）→ `EXTENSION_NOT_ALLOWED`
2. `fileSize > storage.upload.max-file-size` → `FILE_TOO_LARGE`
3. 服务端**重算并覆盖** `chunkCount`，不信任客户端
4. 客户端 `chunkSize` 与 `storage.upload.chunk-size` 不一致 → `INVALID_UPLOAD_MODE`

### 4.2 `uploadSimpleFile`

1. 扩展名白名单校验（同 §4.1-1）
2. **流式**计数：边读边累加，超过 `storage.upload.max-file-size` 立即中断并抛 `FILE_TOO_LARGE`
   （现实现用 `StreamDigestInputStream` 计数，天然可复用；严禁先缓冲到内存再判断）
3. `fileSize > storage.upload.chunk-threshold` 时拒绝（`INVALID_UPLOAD_MODE`），强制走分片

> 第 3 条即原「阶段 2」：本次一并实现，但**必须与前端分片路径同批次上线**，否则 `(threshold, max]` 区间的上传会全部失败。上线顺序见 §6。

### 4.3 扩展名白名单细则

- 取扩展名复用现有 `extractExtension(fileName)`（取最后一个 `.` 之后）；无扩展名视为空串
- **大小写不敏感**（`.JPG` 与 `.jpg` 等价），配置侧与请求侧均归一化为小写再比较
- 配置为空串或空白 → 不限制
- 配置格式：逗号分隔，允许带或不带前导点（`jpg,png` 与 `.jpg,.png` 等价），解析时去除空白与点
- 前端同步用该值设置 `<input accept>`，但**服务端校验才是准绳**（`accept` 可被绕过）

### 4.4 `uploadTaskPart`

1. `partNumber ∈ [1, chunkCount]`
2. **单分片字节数 ≤ `storage.upload.chunk-size`**：防止客户端把一个巨型分片塞进单个请求
3. 任务须为 `chunk` 模式

### 4.5 过期清理任务

用 `temp-retention-days` 替换硬编码的 `LocalDateTime.now().minusDays(14)`。

清理入口为调度任务 `storage.upload.task.cleanup`（`StorageUploadTaskCleanupJobHandler`，
`@NebulaScheduledJob`，默认 cron `0 0 */6 * * ?`，即每 6 小时整点），由 `nebula-scheduler`
统一注册到定时任务管理，支持页面手动触发立即清理；手动触发时可传参数
`{"taskId":"..."}` 只清理指定任务。绑定成功后的实时清理仍走
`storage-upload-task-bound` 事件（`StorageUploadTaskCleanupHandler`）。

> 现有实现 `listByTaskId` 已 `orderByAsc(partNumber)`，分片合并顺序正确，无需改动。

---

## 5. 客户端契约

### 5.1 复用统一 init 接口，不新增独立端点

策略随 `GET /api/frontend/init` 一起下发，**不新增前端可见的上传策略端点**。原因：

- 不为策略多付一次往返，避免增加首页/首屏加载时间；
- `/api/frontend/init` 已在匿名放行名单内（`AuthProperties` 的排除路径），登录页/注册页已在调用；
- 该端点的既有语义就是「聚合各模块的初始化配置」，策略放进来与 `loginConfig` 同级，语义自洽。

**聚合方式完全对齐现有 `loginConfig`：**

| 现有 | 新增（同构） |
|---|---|
| `ILoginService.getAuthConfig()` → `AuthInitDto` | `IStorageService.getUploadPolicy()` → `StorageUploadPolicy` |
| `FrontendConverter.toLoginConfig(authInitDto)` | 挂到 `FrontendInitDto.storage.upload` |
| `FrontendServiceImpl` 注入 `ILoginService` | 同处注入 `IStorageService` |

### 5.1.1 命名规则：点号即嵌套；系统参数用连字符，DTO 与前端用驼峰

init 里**不为策略另起名字**，直接用参数自身的层级：param_key 的 `.` 变成 JSON 嵌套，末段的连字符按既定约定转成驼峰。

```
storage.upload.max-file-size      →  storage.upload.maxFileSize
storage.upload.chunk-threshold    →  storage.upload.chunkThreshold
storage.upload.chunk-size         →  storage.upload.chunkSize
storage.upload.allowed-extensions →  storage.upload.allowedExtensions
storage.upload.temp-retention-days→  storage.upload.tempRetentionDays
```

init 响应中的实际形状：

```json
{
  "frontendConfig": { "...": "..." },
  "loginConfig": { "...": "..." },
  "storage": {
    "upload": {
      "maxFileSize": 100,
      "chunkThreshold": 10,
      "chunkSize": 5,
      "allowedExtensions": "jpg,jpeg,png,webp",
      "tempRetentionDays": 14
    }
  }
}
```

#### 三层命名约定

| 层 | 风格 | 示例 |
|---|---|---|
| `sys_param.param_key` | 点号分段 + 小写连字符 | `storage.upload.max-file-size` |
| 数据库列名 | 下划线（蛇形） | `param_key`、`param_value`、`data_type`、`min_value` |
| Java 实体 / DTO / 前端 TS | 驼峰 | `paramKey`、`paramValue`、`dataType`、`maxFileSize` |

落地要点：

- 参数键**沿用连字符**，与既有 25 个参数完全一致（`login.username.password-min-length`、`notify.email.smtp-host`）。**现有参数键里没有任何下划线先例**，所以不要把 `max-file-size` 写成 `max_file_size`。
- 列名（蛇形）→ 实体/DTO（驼峰）的映射由 MyBatis-Plus 的 `map-underscore-to-camel-case: true` 统一处理，无需手工注解。
- 连字符 → 驼峰只发生在「参数键 → 字段名 / JSON key」这一步，**因此不需要 `@JsonProperty`**：DTO 与 Resp 字段直接声明成 `maxFileSize` 即可，序列化出来就是驼峰。
- 前端 TS 接口同样用驼峰，正常点号访问（`upload.chunkSize`），不必写括号。
- **单位**：字段名不带单位后缀（沿用参数名），数值单位统一为 **MB**，以参数定义为准；页面上参数名称已写明「(MB)」。

**取舍说明**：`storage.upload` 子树**完整镜像该前缀下的全部参数**，而不是只挑客户端用得上的那几个。好处是规则单一——「子树 = 该前缀下的参数」，加参数时无需再判断「要不要暴露给前端」。`temp-retention-days` 其实是纯服务端的（清理任务用），客户端不会读，保留它只是为了让规则统一；这些值都不敏感。

> 若后续参数变多、担心响应膨胀，再改成按白名单裁剪；届时规则要同步写进本文档。

**为什么不直接返回扁平的 `{"storage.upload.max-file-size": 100}`**：那样前端要拼字符串取键，既失去类型提示，也和 `loginConfig` 这类既有嵌套结构不一致。

**为什么不叫 `storageUploadPolicy`**：那是为策略另造的名字，加参数时要同时维护「参数名」和「字段名」两套命名，容易漂移；直接用参数路径就不存在这个问题。

涉及改动：

- `nebula-storage-api`：新增 `StorageUploadPolicy`（不可变契约 POJO，字段扁平：`maxFileSize`/`chunkThreshold`/`chunkSize`/`allowedExtensions`/`tempRetentionDays`），并在 `IStorageService` 增加 `getUploadPolicy()`
- `nebula-storage-core`：新增 `StorageUploadParamKeys`（常量，仿 `AuthLoginParamKeys` 放在 core）+ `StorageUploadPolicyResolver`；`StorageServiceImpl` 实现该方法，经 `ISystemParamService` 读取参数、套默认值、校验不变式
- `nebula-storage-remote`：`StorageRemoteServiceImpl` + `StorageFeignClient` 同步补一个方法（**远程模式必需**）
- `StorageController`：补一个内部端点供 Feign 调用——**仅供 `nebula.storage.mode=remote` 时使用，浏览器不直接访问**，因此不构成「新增前端端点」
- `nebula-frontend-api`：新增 `FrontendStorageInitDto`（序列化为 `storage`）与 `FrontendUploadConfigDto`（序列化为 `upload`），并把 `storage` 加进 `FrontendInitDto`

  > **api 层保持自包含**：`nebula-frontend-api` 目前只依赖 `base-common`，其 DTO 不 import 任何其他模块的 api（已确认）。因此这里**不**直接引用 `StorageUploadPolicy`，而是由 frontend 自持一套 init 形状类型，映射放在 core。
- `nebula-frontend-core`：新增依赖 `nebula-storage-api`（仅 api 层，无循环：storage-api 只依赖 base-common）；`FrontendServiceImpl` 注入 `IStorageService`，`getInit()` 拉取策略并映射进上面的类型
- `nebula-frontend-local`：`FrontendInitResp` + 对应的两个 Resp 类型 + `FrontendLocalConverter` 映射（沿用各层各自持有 DTO/Resp 的既有约定）

> **本地模式零成本**：单体（`architecture.mode=local` + `storage.mode=local`，即 omni-wms 当前形态）下这是进程内调用，与 `loginService.getAuthConfig()` 一样。
> **远程模式**下会多一次 Feign 往返——但这与既有 `getAuthConfig()` 的处境完全相同，属于本框架聚合 init 的固有代价，不因本次改动而新增问题类别。

### 5.2 前端消费方式（当前实现需要一并调整）

现状：`web/src/api/auth.ts` 的 `authService.getAuthConfig()` 调了 `/api/frontend/init`，但**只取 `loginConfig`、丢弃其余字段**；且该调用只出现在登录页与注册页，没有全局缓存。

要让「不额外发请求」真正成立，需调整为：

1. `web/src/types/auth.ts` 的 `FrontendInitResp` 增加嵌套字段，键名为驼峰（§5.1.1）：

   ```ts
   export interface FrontendUploadConfig {
     maxFileSize?: number;
     chunkThreshold?: number;
     chunkSize?: number;
     allowedExtensions?: string;
     tempRetentionDays?: number;
   }
   export interface FrontendStorageInit {
     upload?: FrontendUploadConfig;
   }
   // FrontendInitResp 内：
   //   storage?: FrontendStorageInit;
   ```

2. init 响应**取一次并缓存**（如全局 store / 应用启动时拉取），上传器从缓存读 `storage?.upload`（正常点号访问，如 `upload.chunkSize`）
3. 上传发生时若缓存缺失，再补一次 init 调用——仍复用同一端点，不引入新接口

### 5.3 前端分片流程（当前完全缺失）

**重要现状：前端没有任何分片上传实现。** `web/src/api/storage.ts` 只封装了 `/api/storage/upload`（整文件），无 `createUploadTask` / `uploadPart` / `completeUpload`；`ne-upload` 组件无 `Blob.slice`、无阈值判断、无分片进度（`percent` 只有 0 → 100）。后端分片接口齐备，纯粹是前端没接。

需补：

1. `storage.ts` 增加 `createUploadTask` / `uploadPart` / `completeUploadTask`（策略本身从 §5.2 的 init 缓存读取，不新增策略请求）
2. 上传器按策略选路：`file.size > upload.chunkThreshold` → 分片流程，否则整文件
3. 分片串行/并发上传 + 真实进度 + 失败重试（`uploadPart` 对同序号重传是幂等的：同 hash 直接返回，异 hash 报 `PART_HASH_MISMATCH`）
4. `completeUploadTask` 后再 `bindUploadTask`
5. 按 `upload.allowedExtensions` 设置上传控件的 `accept`，并在提交前做一次本地校验（服务端仍会再校验）

---

## 6. 交付顺序（关键，避免打断上传）

**阶段 2 本次一并实现**，但存在一个**硬顺序依赖**：如果服务端先强制 `chunk-threshold` 而前端还没接分片路径，那么 `(threshold, max-file-size]` 区间内的上传会**全部失败**——比现状更糟。

因此本次按**交付顺序**（不是版本范围）拆成三步：

| 步骤 | 内容 | 静态 ceiling |
|---|---|---|
| **步骤 1** | 参数落库、`getUploadPolicy()`、init 聚合、`max-file-size` 强制、扩展名白名单 | `110MB / 120MB` |
| **步骤 2** | 前端分片路径（切片 / 上传 / 合并 / 真实进度） | 同上 |
| **步骤 3** | 打开阈值强制：`fileSize > storage.upload.chunk-threshold` 必须走分片 | 同上（可选下调至 `threshold + 开销`） |

要点：

- **步骤 3 必须在步骤 2 验证通过之后才打开。** 步骤 1 与 2 可并行开发，但合并/发布时不能倒挂。
- 步骤 1–2 期间静态 ceiling 必须覆盖 `max-file-size`（因为整文件直传此时仍允许到 100MB）；步骤 3 之后业务层会先把超阈值请求拒掉，ceiling 调小也只是「更紧的管道」，保留 110/120 同样无害。
- 不建议为此新增 feature flag 参数——步骤顺序本身即可表达该约束，避免参数膨胀。

> 现状参考（改动前）：前端完全没有分片路径，只有整文件上传，所以步骤 1 结束时行为与今天一致（只是上限从 1MB 变成 100MB），不会引入回归。

---

## 7. 代码改动清单

### 7.1 删除两个无效参数

| 文件 | 改动 |
|---|---|
| `docs/sql/init/mysql/02-init-data.sql:904-905` | 删除 2 行；**并追加 `DELETE`**（见 §9） |
| `docs/sql/init/postgresql/02-init-data.sql:904-905` | 同上 |
| `nebula-param/nebula-param-api/.../model/dto/GeneralConfigDto.java` | 删 `storageMultipartMaxFileSize` / `storageMultipartMaxRequestSize` 两字段 |
| `nebula-param/nebula-param-local/.../controller/GeneralConfigController.java:68-69,116-117` | 删 2 处读 + 2 处写 |
| `nebula-param/nebula-param-local/.../GeneralConfigControllerTest.java:61-62,131-132` | 同步删除 mock 与断言 |
| `web/src/pages/system/config/general/advance-config-data.ts:143-144,245-246` | 删 2 条字段定义 + 2 个 `assignConfigValue` case |
| `web/src/types/param.ts:109-110` | 删 2 个 DTO 字段 |
| `web/src/pages/system/config/general/advance-config-data.test.ts:47,54,60-61,68-71` | 同步改为新参数断言 |
| `omni-wms`（下游模板仓） | `web/` 与 `docs/sql/init/` 同步同一批改动 |

### 7.2 新增参数与强制逻辑

| 文件 | 改动 |
|---|---|
| `nebula-storage/nebula-storage-core/pom.xml` | **新增** `nebula-param-api` 依赖（对齐 `auth-core` / `notify-core` 先例，无循环依赖：param-api 只依赖 base-common + event-api） |
| `nebula-storage-api/.../model/dto/StorageUploadPolicy.java` | **新建**，不可变契约 POJO（`maxFileSize` / `chunkThreshold` / `chunkSize` / `allowedExtensions` / `tempRetentionDays`，数值单位 MB）。放 api 是因为 `nebula-frontend-core` 要消费它 |
| `nebula-storage-api/.../service/IStorageService.java` | 新增 `StorageUploadPolicy getUploadPolicy()` |
| `nebula-storage-api/.../constant/StorageErrorInfo.java` | 新增 `FILE_TOO_LARGE`(24018) 与 `EXTENSION_NOT_ALLOWED`(24019)，复用死码 `INVALID_UPLOAD_MODE`(24009) |
| `nebula-storage-core/.../config/StorageUploadParamKeys.java` | **新建**，仿 `AuthLoginParamKeys` 收敛 param_key 常量 |
| `nebula-storage-core/.../support/StorageUploadPolicyResolver.java` | **新建**，经 `ISystemParamService` 读取 + 默认值兜底 + 不变式校验（`getUploadPolicy()` 的实现体） |
| `nebula-storage-core/.../config/NebulaStorageProperties.java` | 若需静态兜底默认值，加 `public static class Upload`；javadoc 按 `10-config.md` §7.1 写清单位与默认值 |
| `nebula-storage-core/.../config/NebulaStorageAutoConfiguration.java` | 加入 §2.1 启动期断言 |
| `nebula-storage-core/.../service/impl/StorageServiceImpl.java` | 实现 `getUploadPolicy()`；§4 各强制点；重算 `chunkCount` |
| `nebula-storage-core/.../support/StorageUploadTaskCleanupHandler.java` | 保留天数参数化 |
| `nebula-storage-remote/.../impl/StorageRemoteServiceImpl.java` + `.../feign/StorageFeignClient.java` | 同步补 `getUploadPolicy()`（远程模式必需） |
| `nebula-storage-local/.../controller/StorageController.java` | 补内部端点供 Feign 调用；**仅供 `mode=remote`，浏览器不访问** |
| `nebula-frontend/nebula-frontend-core/pom.xml` | 新增依赖 `nebula-storage-api`（仅 api 层） |
| `nebula-frontend-core/.../service/impl/FrontendServiceImpl.java` | 注入 `IStorageService`，`getInit()` 把策略映射进 `storage.upload` |
| `nebula-frontend-api/.../model/dto/` | **新建** `FrontendStorageInitDto`（→ `storage`）+ `FrontendUploadConfigDto`（→ `upload`）；`FrontendInitDto` 加 `storage` 字段 |
| `nebula-frontend-local/.../model/resp/` + `.../converter/FrontendLocalConverter.java` | 新建对应 Resp 类型，`FrontendInitResp` 加 `storage`，补映射 |
| `nebula-param/.../GeneralConfigDto.java` + `GeneralConfigController.java` | 加 5 个新字段的读写，供高级配置页使用 |
| `web/.../advance-config-data.ts` + `types/param.ts` | 加 5 个新字段 |
| `web/src/types/auth.ts` + `web/src/api/auth.ts` | `FrontendInitResp` 加嵌套 `storage.upload`；init 响应取一次并缓存（见 §5.2） |
| `web/src/api/storage.ts` | 加 §5.3 的三个分片方法（策略从 init 缓存读取，不新增策略请求） |
| `web/src/components/ne-upload/` | 接入策略选路与分片流程 + 真实进度 |

> `GeneralConfigController` 已硬编码 `login.*` / `notify.*` key（跨模块知识本来就集中在此）。继续加 `storage.*` 与现状一致；但该类正在膨胀，建议后续单独排期做「模块注册表」重构，**不在本次范围内**。

---

## 8. 错误码与 i18n

`StorageErrorInfo` 当前 24009 `INVALID_UPLOAD_MODE` **已定义但从未抛出**（死代码），本次正好复用。

| 码 | 枚举 | zh_CN | en_US |
|---|---|---|---|
| 24009 | `INVALID_UPLOAD_MODE`（复用） | 上传模式不合法 | Invalid upload mode |
| 24018 | `FILE_TOO_LARGE`（新增） | 文件大小超出上限 | File size exceeds the limit |
| 24019 | `EXTENSION_NOT_ALLOWED`（新增） | 该文件类型不允许上传 | File type is not allowed |

需同步 `nebula-storage-api/src/main/resources/i18n/storage/messages_zh_CN.properties` 与 `messages_en_US.properties`（key 格式 `storage.{code}`）。

---

## 9. SQL 变更要点

### 9.1 init 脚本是 upsert，删行不会删数据

`02-init-data-*.sql` 使用 `INSERT ... ON DUPLICATE KEY UPDATE`。**仅删掉那两行 INSERT，存量库里已存在的记录不会被清除**。必须在脚本中显式清理（放到 DELETE/清理段，并保持幂等）：

```sql
-- 移除已废弃的 multipart 参数（改由 application.yml 静态配置）
DELETE FROM sys_param
WHERE param_key IN (
    'spring.servlet.multipart.max-file-size',
    'spring.servlet.multipart.max-request-size'
);
```

PostgreSQL 脚本同理（`DELETE FROM sys_param WHERE param_key IN (...)`）。

### 9.2 新增参数行

在 `module_code='storage'` 段插入 5 行，`display_order` 顺延；`max-file-size` 行设 `max_value=2047`，并在 `description` 写明不变式 `chunk-size ≤ chunk-threshold ≤ max-file-size`。

---

## 10. 测试

**后端**
- 单测：策略解析（含缺省兜底、不变式违反时行为、扩展名配置解析——带点/不带点/空白/大小写）
- 单测：`createUploadTask` — 超 max 拒、chunkSize 不一致拒、chunkCount 被重算、扩展名不在白名单拒
- 单测：`uploadSimpleFile` — 流式超限中断（不缓冲）、扩展名拒、超阈值拒（步骤 3）
- 单测：`uploadTaskPart` — 越界 partNumber 拒、单分片超 `storage.upload.chunk-size` 拒
- 单测：启动期断言 — ceiling < max-file-size 时启动失败
- 集成：`StorageIntegrationTest` 现有 `setChunkCount/setChunkSize` 用例需随「服务端重算」调整
- `GeneralConfigControllerTest` — 移除旧断言、新增新字段往返断言

**前端**
- `advance-config-data.test.ts` — 新字段渲染与 patch 构建
- `storage.test.ts` — init 响应中 `storage.upload` 嵌套结构的解析 + 分片流程请求序列
- 组件测试 — 阈值两侧分别走 simple / chunk；扩展名白名单驱动 `accept`（需 mock init 缓存）

---

## 11. 风险与取舍

| 风险 | 应对 |
|---|---|
| 静态 ceiling 与运行时策略不一致 → 静默 413 | §2.1 启动期 fast-fail |
| 参数运行时可变，而客户端已开始切片 | 任务创建时把 `chunkSize`/`chunkCount` **固化到任务记录**，后续以任务记录为准，不二次读配置 |
| `Integer` 字节溢出 | 参数单位 MB 且 `max_value ≤ 2047`；转字节时用 `Math.toIntExact` 显式防御 |
| **阈值强制先于前端分片上线 → `(threshold, max]` 上传全挂** | §6 的硬顺序：步骤 3 必须在步骤 2 验证通过后才打开 |
| 扩展名白名单误配（如只填 `jpg` 却上传 `jpeg`）→ 全量拒绝 | 配置非空即生效，属预期行为；靠「配置为空=不限制」的默认值兜底，并在高级配置页 description 写明格式与示例 |
| `GeneralConfigController` 持续膨胀 | 本次接受；建议后续单独重构（见 §7.2 备注） |

---

## 12. 已定与待决

**已定（按评审意见）**

1. 参数命名空间：`storage.upload.*`（init 的嵌套路径直接由它派生，两处保持一致）
2. init 字段命名：参数名即路径，点号即嵌套（§5.1.1）
3. 命名风格分层：`sys_param.param_key` 用连字符，库列名用下划线，**DTO 与前端一律驼峰**（§5.1.1）
4. `allowed-extensions` 本次一并实现（§4.3）
5. 阈值强制本次一并实现，按 §6 的三步顺序交付（步骤 3 不得先于步骤 2）

**待决**

1. 是否需要「单用户/单租户配额」类参数？本设计未覆盖（当前无租户概念）。
