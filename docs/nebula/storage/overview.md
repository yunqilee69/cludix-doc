# Nebula Storage 模块总览

## 1. 模块定位

`nebula-storage` 是 Nebula 的统一文件存储模块，负责把以下几类能力收敛到一个标准模块中：

- 普通文件上传
- 分片上传
- 上传任务完成与绑定转正
- 正式文件详情与分页查询
- 登录态鉴权下载
- 短时签名分享下载
- 文件删除
- 底层存储 provider 抽象

它的核心目标不是只提供“上传接口”，而是提供一套**业务可落地的附件生命周期管理模型**。

---

## 2. 模块结构

从 `nebula-storage/pom.xml` 和实际源码可以确认，storage 模块采用标准的 Nebula 五段式结构：

```text
nebula-storage/
├── nebula-storage-api
├── nebula-storage-core
├── nebula-storage-local
├── nebula-storage-remote
└── nebula-storage-service
```

各子模块职责如下：

- `nebula-storage-api`
  - 放服务接口、命令、查询、DTO、扩展点和错误码
- `nebula-storage-core`
  - 放核心业务实现、DAO、Entity、provider 路由、权限校验默认实现
- `nebula-storage-local`
  - 放 REST Controller，本地单体接入直接使用
- `nebula-storage-remote`
  - 放 Feign Client 与远程代理实现，供微服务消费者调用
- `nebula-storage-service`
  - 放独立服务启动入口与集成测试配置

---

## 3. 当前已确认的核心边界

根据 `README`、`StorageController`、`IStorageService` 和 `StorageServiceImpl`，当前模块边界已经比较清晰：

1. **上传采用两阶段模型**
   - 上传完成只生成临时上传任务；
   - 只有执行 bind 后才生成正式 `storage_file` 记录。

2. **普通上传与分片上传共用一套上传任务模型**
   - 小文件可以直接走 `/api/storage/upload`；
   - 分片场景先创建任务，再分片上传，再 complete，再 bind。

3. **下载分成两类**
   - 登录态鉴权下载：`/api/storage/download`
   - 分享链接下载：`/api/storage/download-signed`

4. **正式文件内容存储支持多 provider**
   - `filesystem`
   - `db`
   - `minio`

5. **临时区与正式区解耦**
   - 临时区用于上传中间态；
   - 正式区用于业务绑定成功后的长期文件内容保存。

---

## 4. 核心数据对象

当前模块围绕四张核心表组织业务：

### 4.1 `storage_upload_task`

记录上传生命周期本身，主要承载：

- 任务类型 `task_mode`
- 文件基本信息 `file_name / file_size / file_mime_type`
- 分片统计 `chunk_count / uploaded_chunk_count`
- 临时文件标识 `temp_storage_key`
- 上传用户 `upload_user_id`
- 流程状态 `status`

> 说明：基于当前仓库中可见的 `storage-schema-h2.sql`，`storage_upload_task` 当前未直接包含 `source_entity / source_id / source_type` 或 `result_file_id` 字段；这些业务归属信息明确落在 `storage_file` 中。

### 4.2 `storage_upload_part`

用于分片上传场景，主要承载：

- 分片序号 `part_number`
- 分片哈希 `part_hash`
- 临时分片位置 `part_storage_key`
- 分片状态 `status`

### 4.3 `storage_file`

用于正式文件记录，只有 bind 成功后才生成，主要承载：

- 正式文件元数据
- 正式存储位置 `storage_provider / storage_bucket / storage_key`
- 文件归属 `source_entity / source_id / source_type`
- 上传来源 `upload_task_id / upload_user_id`

### 4.4 `storage_content`

仅在 `db` provider 场景下使用，用于在数据库中保存正式文件二进制内容。

---

## 5. 典型能力列表

当前已确认对外暴露的主要能力包括：

- 创建分片上传任务
- 普通文件上传（直接生成临时任务）
- 上传分片
- 完成上传任务
- 绑定上传任务生成正式文件
- 查询上传任务详情
- 查询正式文件详情
- 分页查询正式文件
- 登录态下载正式文件
- 生成签名下载地址
- 按签名下载正式文件
- 删除正式文件

详细能力说明见：[业务功能](./business-capabilities.md)

---

## 6. 文档阅读建议

建议按下面顺序阅读：

1. [设计与实现](./design-and-implementation.md)
   - 先理解 storage 模块为什么采用“两阶段上传 + provider 抽象”模型
2. [业务功能](./business-capabilities.md)
   - 再理解普通上传、分片上传、下载、分享下载分别解决什么问题
3. [接口信息](./api-reference.md)
   - 然后看具体 API 形态和参数说明
4. [使用方式](./usage-guide.md)
   - 最后看如何在单体、独立服务、前端侧接入
5. [建表语句](./ddl.md)
   - 如果要真正落库，再查看表结构和字段约束

---

## 7. 推荐阅读源码入口

如果你要继续深入源码，建议重点看这些文件：

- `nebula-storage/nebula-storage-local/src/main/java/com/cludix/nebula/storage/controller/StorageController.java`
- `nebula-storage/nebula-storage-api/src/main/java/com/cludix/nebula/storage/service/IStorageService.java`
- `nebula-storage/nebula-storage-core/src/main/java/com/cludix/nebula/storage/service/impl/StorageServiceImpl.java`
- `nebula-storage/nebula-storage-core/src/main/java/com/cludix/nebula/storage/support/RoutingStorageContentRepository.java`
- `nebula-storage/nebula-storage-core/src/main/java/com/cludix/nebula/storage/config/NebulaStorageProperties.java`
- `nebula-storage/nebula-storage-service/src/test/resources/db/test/storage-schema-h2.sql`
