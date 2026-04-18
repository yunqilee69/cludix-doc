# Nebula Storage 设计与实现

## 1. 设计目标

`nebula-storage` 的设计目标不是只解决“文件能不能传上来”，而是同时解决下面几个实际问题：

- 上传过程如何支持普通文件和分片文件
- 上传完成后如何与业务实体建立归属关系
- 正式文件如何避免重复存储
- 下载如何区分登录态下载和可分享下载
- 二进制内容如何在 filesystem / db / minio 之间切换
- 单体与微服务模式下如何复用同一套契约

因此它的设计是“**两阶段上传模型 + 存储 provider 抽象 + 可切换接入模式**”的组合。

---

## 2. 分层结构

storage 模块遵循 Nebula 的标准分层。

### 2.1 `nebula-storage-api`

这一层定义稳定契约，主要包括：

- `IStorageService`
- `StoragePermissionChecker`
- `model.command`
- `model.query`
- `model.dto`
- `constant`
- 模块守卫配置

代表文件：

- `nebula-storage-api/src/main/java/com/cludix/nebula/storage/service/IStorageService.java`
- `nebula-storage-api/src/main/java/com/cludix/nebula/storage/service/StoragePermissionChecker.java`

### 2.2 `nebula-storage-core`

这一层承载核心实现，主要包括：

- `StorageServiceImpl`
- `StorageUploadTaskDAO` / `StorageUploadPartDAO` / `StorageFileDAO`
- `StorageUploadTaskEntity` / `StorageUploadPartEntity` / `StorageFileEntity`
- `StorageContentRepository`
- `RoutingStorageContentRepository`
- `FileSystemStorageBinaryStore` / `DatabaseStorageBinaryStore` / `MinioStorageBinaryStore`
- `NebulaStorageAutoConfiguration`
- `NebulaStorageProperties`

### 2.3 `nebula-storage-local`

这一层提供 HTTP 接口，核心入口是：

- `nebula-storage-local/src/main/java/com/cludix/nebula/storage/controller/StorageController.java`

### 2.4 `nebula-storage-remote`

这一层提供远程代理：

- `StorageFeignClient`：定义远程 HTTP 协议
- `StorageRemoteServiceImpl`：实现 `IStorageService`，内部转调 Feign

这意味着业务方依旧可以面向 `IStorageService` 编程，而不用关心底层是本地实现还是远程实现。

### 2.5 `nebula-storage-service`

这一层是独立服务入口：

- 启动类：`NebulaStorageServiceApplication`
- 默认端口：`17783`
- 当前服务资源目录里包含基础启动配置和测试配置

---

## 3. 两阶段上传模型

storage 模块最关键的实现设计，是把上传拆成两个阶段。

### 3.1 第一阶段：上传临时内容

这一阶段只做“把文件内容安全地接收进系统”，不会直接生成正式业务文件。

可能的入口包括：

- `POST /api/storage/upload`
- `POST /api/storage/upload-tasks`
- `PUT /api/storage/upload-tasks/{taskId}/parts/{partNo}`
- `POST /api/storage/upload-tasks/{taskId}/complete`

结果是：

- 生成或更新 `storage_upload_task`
- 分片场景下生成 `storage_upload_part`
- 临时文件内容落在 temp 区
- 任务状态进入 `INIT / UPLOADING / COMPLETED / FAILED`

### 3.2 第二阶段：绑定转正

这一阶段通过 `bind` 把临时上传结果转成正式文件：

- 校验上传任务是否已经完成
- 校验业务归属字段 `sourceEntity/sourceId`
- 生成或复用正式文件存储位置
- 写入 `storage_file`
- 更新上传任务的结果文件 ID
- 发布绑定完成事件，异步清理临时内容

也就是说：

> **上传成功不等于正式入库，bind 成功才表示这个文件真正归属某个业务实体。**

这样设计的好处是：

- 上传可以先行完成，不依赖业务表事务立即成功
- 业务保存失败时，不会直接污染正式文件表
- 一个统一模型同时支持普通上传和分片上传

---

## 4. 核心实现流程

### 4.1 普通上传

`StorageServiceImpl#uploadSimpleFile` 的核心逻辑是：

1. 解析或创建上传任务
2. 根据文件名推导扩展名与 MIME 类型
3. 读取文件流内容
4. 写入 temp 存储区：`storageContentRepository.storeTemp(...)`
5. 计算 `fileHash`
6. 更新任务状态为 `COMPLETED`

这一步之后，系统里只有临时上传任务，还没有正式文件记录。

### 4.2 分片上传

`StorageServiceImpl#uploadTaskPart` 的核心逻辑是：

1. 读取上传任务
2. 把任务状态更新为 `UPLOADING`
3. 读取分片字节并计算 MD5
4. 查询当前分片是否已存在
5. 如果已存在且哈希不一致，则报错
6. 如果不存在，则写入 temp part 区
7. 更新分片表与上传任务统计

这里体现了两点设计：

- 分片上传具备幂等保护
- 通过 `partHash` 做内容一致性校验

### 4.3 完成上传任务

`StorageServiceImpl#completeUploadTask` 在 chunk 场景下会：

1. 校验分片数量是否齐全
2. 读取所有 part key
3. 调用 `mergeTempParts(...)` 合并临时分片
4. 删除已合并的临时 part 内容
5. 重新计算完整文件 `fileHash`
6. 根据最终文件名补齐 MIME 类型
7. 将任务状态更新为 `COMPLETED`

### 4.4 绑定正式文件

`StorageServiceImpl#bindUploadTask` 的核心逻辑是：

1. 读取上传任务并确认状态为 `COMPLETED`
2. 校验 `sourceEntity` 和 `sourceId`
3. 检查该任务是否已经绑定过正式文件
4. 按 `fileHash + fileSize` 查询是否已有可复用正式文件
5. 若可复用，则复用已有 `storageKey`
6. 若不可复用，则将 temp 内容 promote 到 formal 区
7. 创建 `storage_file` 记录
8. 回填上传任务的业务归属与结果文件 ID
9. 发布 `StorageUploadTaskBoundEvent`

其中一个很重要的实现点是：

> **正式文件支持按 hash + size 复用底层内容，避免重复存储相同文件。**

### 4.5 删除正式文件

`StorageServiceImpl#deleteStorageFile` 的实现不是简单删数据库，而是：

1. 删除 `storage_file` 记录
2. 查询是否还有其他文件记录引用同一物理位置
3. 只有引用数为 0 时，才删除真实内容

这保证了“内容复用”场景下不会误删底层二进制。

---

## 5. provider 抽象设计

storage 模块把二进制内容存储抽象为两层。

### 5.1 `StorageBinaryStore`

这是底层 provider 接口，关注的是最基础的二进制操作，例如：

- store
- open
- delete
- type
- bucket

当前已确认实现包括：

- `FileSystemStorageBinaryStore`
- `DatabaseStorageBinaryStore`
- `MinioStorageBinaryStore`

### 5.2 `StorageContentRepository`

这是更贴近业务语义的一层抽象，负责：

- `storeTemp`
- `storeTempPart`
- `mergeTempParts`
- `promoteToFormal`
- `openTemp`
- `openFormal`
- `deleteTemp`
- `deleteFormal`

它不是简单“存一份 bytes”，而是把“临时区 / 正式区”的生命周期差异封装起来。

### 5.3 `RoutingStorageContentRepository`

这是实际路由实现：

- temp 一律走本地文件系统临时目录
- formal 走配置里的正式 provider

因此当前设计并不是“temp 也支持 db/minio 随便切”，而是有意做了职责分离：

- **temp**：上传过程中的中间态，强调简单、稳定、低延迟
- **formal**：正式内容区，强调长期保存和可替换 provider

---

## 6. 配置驱动实现

`NebulaStorageProperties` 把模块配置拆成三块：

### 6.1 `mode`

- `local`
- `remote`

用于切换存储模块在应用中的运行方式。

### 6.2 `tempDir`

用于上传中间态临时目录，例如：

- 普通上传的临时文件
- 分片内容
- 合并后的临时文件

### 6.3 `content`

用于正式文件内容区配置：

- `type=filesystem`
- `type=db`
- `type=minio`

其中 MinIO 还需要：

- `endpoint`
- `accessKey`
- `secretKey`
- `bucket`
- `createBucketIfMissing`

### 6.4 `signedDownload`

用于控制签名下载：

- 是否启用
- HMAC secret
- 默认有效期
- 最大有效期
- 默认最大下载次数
- 最大下载次数上限

---

## 7. 下载与权限设计

### 7.1 登录态下载

`openFileContent(fileId)` 的逻辑是：

1. 查询正式文件
2. 读取当前登录用户
3. 调用 `StoragePermissionChecker`
4. 权限通过后打开正式内容流

### 7.2 签名下载

`openSignedFileContent(...)` 的逻辑是：

1. 查询正式文件
2. 校验 `fileId + filename + expireAt + maxDownloadCount + signature`
3. 校验通过后打开正式内容流

签名下载不依赖 `Authorization`，但签名本身通常是由登录态用户通过 `createSignedDownload(...)` 预先申请得到。

### 7.3 权限扩展点

`StoragePermissionChecker` 被定义在 api 层，默认实现是：

- `DefaultStoragePermissionChecker`
- 默认直接放行

这意味着 storage 模块只内置了一个最宽松的基线实现，真正的业务权限规则应该由业务系统自行覆盖，例如按：

- 单据归属
- 上传人
- 组织权限
- 租户边界
- 角色范围

进行更细粒度控制。

---

## 8. 事件与清理机制

bind 成功后，`StorageServiceImpl` 会发布：

- `StorageUploadTaskBoundEvent`

`StorageUploadTaskCleanupHandler` 会在两种时机进行清理：

1. 收到绑定完成事件时，立即清理 temp 内容与分片记录
2. 定时任务扫描过期已完成任务，兜底清理残留中间数据

这说明 storage 模块的 temp 区不是长期存储，而是明确的中间态区域。

---

## 9. 本地模式与远程模式

### 9.1 本地模式

业务应用引入 `nebula-storage-local` 后：

- Controller 直接暴露 REST 接口
- `IStorageService` 由 core 中的 `StorageServiceImpl` 提供实现

### 9.2 远程模式

业务应用引入 `nebula-storage-remote` 后：

- `StorageRemoteServiceImpl` 实现同一个 `IStorageService`
- 内部通过 `StorageFeignClient` 转调 `nebula-storage-service`
- 文件流会在 remote 层先读成字节，再通过 `ByteArrayInputStream` 交给调用方

这个设计延续了 Nebula 的统一模式：

> **不管本地还是远程，业务侧都尽量只依赖同一套 service 接口和 command/query/dto 契约。**

---

## 10. 小结

Nebula Storage 的实现可以概括为下面几条：

1. **上传先落临时态，绑定后才转正式态**
2. **普通上传与分片上传共用上传任务模型**
3. **正式文件底层内容通过 provider 抽象统一管理**
4. **相同内容支持复用物理存储位置**
5. **删除时按引用计数决定是否删除真实内容**
6. **下载分为登录态下载与签名分享下载两条链路**
7. **权限控制与存储 provider 都提供了扩展点**

这套设计使 storage 模块既能服务于普通后台附件场景，也能覆盖大文件上传、对象存储接入和分享下载等更复杂的业务场景。
