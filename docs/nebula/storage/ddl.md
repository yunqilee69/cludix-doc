# Nebula Storage 建表语句

本文档基于以下实际文件整理：

- `nebula-storage-service/src/test/resources/db/test/storage-schema-h2.sql`

当前仓库里明确可读到的是 H2 测试 schema。本文档只描述这份可见 schema 中实际存在的字段与约束；如果生产环境还存在额外 MySQL DDL 或演进脚本，应以实际生产脚本为准。

---

## 1. 建表语句

```sql
CREATE TABLE storage_upload_task (
    id char(32) NOT NULL,
    task_mode varchar(20) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_extension varchar(50) DEFAULT NULL,
    file_mime_type varchar(100) DEFAULT NULL,
    file_size bigint DEFAULT NULL,
    file_hash varchar(64) DEFAULT NULL,
    chunk_size int DEFAULT NULL,
    chunk_count int DEFAULT NULL,
    uploaded_chunk_count int NOT NULL DEFAULT 0,
    temp_storage_key varchar(500) DEFAULT NULL,
    status varchar(20) NOT NULL,
    upload_user_id char(32) DEFAULT NULL,
    last_chunk_time datetime DEFAULT NULL,
    create_time datetime NOT NULL,
    update_time datetime NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE storage_upload_part (
    id char(32) NOT NULL,
    task_id char(32) NOT NULL,
    part_number int NOT NULL,
    part_hash varchar(64) DEFAULT NULL,
    part_storage_key varchar(500) NOT NULL,
    status varchar(20) NOT NULL,
    upload_time datetime NOT NULL,
    create_time datetime NOT NULL,
    update_time datetime NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_storage_upload_part_task_no (task_id, part_number)
);

CREATE TABLE storage_file (
    id char(32) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_extension varchar(50) DEFAULT NULL,
    file_mime_type varchar(100) DEFAULT NULL,
    file_size bigint NOT NULL,
    file_hash varchar(64) NOT NULL,
    storage_provider varchar(32) NOT NULL,
    storage_key varchar(500) NOT NULL,
    storage_bucket varchar(100) DEFAULT NULL,
    source_entity varchar(100) NOT NULL,
    source_id char(32) NOT NULL,
    source_type varchar(100) DEFAULT NULL,
    upload_task_id char(32) NOT NULL,
    upload_user_id char(32) DEFAULT NULL,
    create_time datetime NOT NULL,
    update_time datetime NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE storage_content (
    storage_key varchar(500) NOT NULL,
    content blob NOT NULL,
    create_time datetime NOT NULL,
    update_time datetime NOT NULL,
    PRIMARY KEY (storage_key)
);
```

---

## 2. 表设计说明

## 2.1 `storage_upload_task`

用途：

- 记录上传任务主信息
- 承接普通上传和分片上传的统一流程状态
- 保存临时文件位置标识

关键字段说明：

| 字段 | 含义 |
| --- | --- |
| `id` | 上传任务 ID |
| `task_mode` | 任务类型，如 `simple`、`chunk` |
| `file_name` | 原始文件名 |
| `file_extension` | 文件扩展名 |
| `file_mime_type` | MIME 类型 |
| `file_size` | 文件大小 |
| `file_hash` | 文件 hash，当前实现中用于完整性校验与内容复用判断 |
| `chunk_size` | 分片大小 |
| `chunk_count` | 分片总数 |
| `uploaded_chunk_count` | 已上传分片数 |
| `temp_storage_key` | 临时文件存储位置标识 |
| `status` | 任务状态，如 `INIT`、`UPLOADING`、`COMPLETED`、`FAILED` |
| `upload_user_id` | 上传用户 ID |
| `last_chunk_time` | 最后一次分片上传时间 |

说明：

- 在这份可见 schema 中，`storage_upload_task` **不包含** `source_entity`、`source_id`、`source_type` 或 `result_file_id`
- 业务归属字段当前明确落在 `storage_file` 中，而不是上传任务表中
- 这张表描述的是“上传过程”本身，不是正式业务文件

---

## 2.2 `storage_upload_part`

用途：

- 保存分片上传明细
- 支持幂等校验与断点续传
- 为 complete 阶段的分片合并提供依据

关键字段说明：

| 字段 | 含义 |
| --- | --- |
| `id` | 分片记录 ID |
| `task_id` | 所属上传任务 ID |
| `part_number` | 分片序号 |
| `part_hash` | 分片 hash |
| `part_storage_key` | 分片临时存储位置 |
| `status` | 分片状态 |
| `upload_time` | 上传时间 |

关键约束：

```sql
UNIQUE KEY uk_storage_upload_part_task_no (task_id, part_number)
```

这个唯一约束非常关键，它保证同一个上传任务内，某个分片序号只能有一条记录。

说明：

- 在这份可见 schema 中，`storage_upload_part` **不包含** `part_size` 字段
- 如果业务说明里提到“按实际上传内容处理分片大小”，那属于服务层行为，不是当前表结构字段

---

## 2.3 `storage_file`

用途：

- 保存正式文件元数据
- 记录正式内容区的 provider 和物理位置
- 记录文件与业务实体的归属关系

关键字段说明：

| 字段 | 含义 |
| --- | --- |
| `id` | 正式文件 ID |
| `file_name` | 文件名 |
| `file_extension` | 文件扩展名 |
| `file_mime_type` | MIME 类型 |
| `file_size` | 文件大小 |
| `file_hash` | 文件 hash |
| `storage_provider` | 正式内容存储 provider，如 `filesystem`、`db`、`minio` |
| `storage_key` | 正式内容存储 key |
| `storage_bucket` | 正式内容所在 bucket 或逻辑桶 |
| `source_entity` | 来源实体 |
| `source_id` | 来源实体 ID |
| `source_type` | 来源类型 |
| `upload_task_id` | 来源上传任务 ID |
| `upload_user_id` | 上传用户 ID |

说明：

- 在这份可见 schema 中，`upload_task_id` 是 `NOT NULL`，但**没有可见唯一约束**
- 从业务语义上看，bind 通常是一任务生成一条正式文件，但如果要在数据库层严格保证，仍需以真实生产 DDL 为准
- 这是业务层最常用的附件元数据表

---

## 2.4 `storage_content`

用途：

- 仅在正式内容 provider 选择 `db` 时承载文件二进制内容

关键字段说明：

| 字段 | 含义 |
| --- | --- |
| `storage_key` | 内容主键，与正式内容定位 key 对应 |
| `content` | 二进制文件内容 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

说明：

- 如果正式内容 provider 使用的是 filesystem 或 minio，这张表不会承担主要内容存储职责
- 如果 provider 使用 db，则实际文件 bytes 会落到这里

---

## 3. 表之间的关系

可以把几张表关系理解为：

```text
storage_upload_task (1)
   ├── (N) storage_upload_part
   └── (N?) storage_file   # 从可见 schema 看未做唯一约束，业务语义通常期望一任务绑定一文件

storage_file
   └── (0..1) storage_content   # 仅当 provider = db 时由 storage_key 对应
```

含义如下：

- 一个上传任务可以有多个分片
- 一个正式文件在 db provider 场景下会对应一份二进制内容
- 多个正式文件记录也可能复用同一个 `storage_key`，因此真实内容删除时不能只看单条记录

---

## 4. 状态字段说明

当前代码中已明确出现的任务状态包括：

- `INIT`
- `UPLOADING`
- `COMPLETED`
- `FAILED`

其中：

- `INIT`：任务已创建，尚未开始上传
- `UPLOADING`：正在上传分片
- `COMPLETED`：上传完成，临时文件已准备好，可执行 bind
- `FAILED`：上传或合并等流程失败

当前正式文件表没有额外的状态字段，说明正式文件是否可用主要由记录是否存在来体现。

---

## 5. 建表落地建议

如果你要把当前 H2 schema 落地到 MySQL，建议至少评估以下优化方向：

### 5.1 增加常用索引

建议评估索引方向：

- `storage_upload_part.task_id`
- `storage_file.source_entity, source_id`
- `storage_file.upload_user_id`
- `storage_file.file_hash, file_size`
- `storage_file.upload_task_id`

原因：

- 提升按业务实体查询附件的性能
- 提升内容复用查找效率
- 提升上传任务回溯能力

### 5.2 时间字段统一自动填充策略

当前测试 schema 中：

- `create_time`
- `update_time`

没有显式 `CURRENT_TIMESTAMP` 默认值，而是依赖测试或 ORM 写入。生产环境建议与你们现有 `nebula-base-mybatis` 的自动填充策略保持一致。

### 5.3 字段类型适配生产数据库

当前 H2 schema 用：

- `char(32)` 作为主键字段
- `blob` 作为 db provider 内容字段

迁移到 MySQL 时通常仍然可直接沿用，但建议根据你们已有数据库规范统一：

- 主键字符集与排序规则
- 大文件内容是否需要 `LONGBLOB`
- `varchar(500)` 是否满足 `storage_key` 长度要求

---

## 6. 业务表与 storage 表的关系建议

`storage_file` 已经通过：

- `source_entity`
- `source_id`
- `source_type`

表达业务归属。

如果你的业务还需要更复杂的附件管理，例如：

- 一个业务对象多个附件
- 区分附件用途（封面、正文附件、导入包）
- 维护附件排序

建议在业务侧再建一张关系表，而不是强行把所有业务语义都塞进 `storage_file`。

这样 storage 模块负责“统一文件中心”，业务模块负责“本业务如何组织这些文件”。
