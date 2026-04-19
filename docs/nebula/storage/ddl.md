# Nebula Storage 建表语句

本文档基于以下实际文件整理：

- `nebula-storage-service/src/test/resources/db/test/storage-schema-h2.sql`

当前仓库里明确可读到的是 H2 测试 schema。字段设计已经足以反映生产表结构意图，因此本文档先按当前实际实现进行说明。

---

## 1. 建表语句

```sql
CREATE TABLE storage_upload_task (
    id char(32) NOT NULL,
    task_mode varchar(20) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_extension varchar(50) DEFAULT NULL,
    file_mime_type varchar(100) DEFAULT NULL,
    file_size bigint NOT NULL,
    file_hash varchar(64) DEFAULT NULL,
    chunk_size int DEFAULT NULL,
    chunk_count int DEFAULT NULL,
    uploaded_chunk_count int NOT NULL DEFAULT 0,
    temp_storage_key varchar(500) DEFAULT NULL,
    status varchar(20) NOT NULL,
    upload_user_id char(32) DEFAULT NULL,
    last_chunk_time datetime DEFAULT NULL,
    create_time datetime DEFAULT CURRENT_TIMESTAMP,
    update_time datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE storage_upload_part (
    id char(32) NOT NULL,
    task_id char(32) NOT NULL,
    part_number int NOT NULL,
    part_size int NOT NULL,
    part_hash varchar(64) DEFAULT NULL,
    part_storage_key varchar(500) DEFAULT NULL,
    status varchar(20) NOT NULL,
    upload_time datetime DEFAULT CURRENT_TIMESTAMP,
    create_time datetime DEFAULT CURRENT_TIMESTAMP,
    update_time datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (task_id, part_number)
);

CREATE TABLE storage_file (
    id char(32) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_extension varchar(50) DEFAULT NULL,
    file_mime_type varchar(100) DEFAULT NULL,
    file_size bigint NOT NULL,
    file_hash varchar(64) DEFAULT NULL,
    storage_provider varchar(32) NOT NULL,
    storage_key varchar(500) NOT NULL,
    storage_bucket varchar(100) DEFAULT NULL,
    source_entity varchar(100) NOT NULL,
    source_id char(32) NOT NULL,
    source_type varchar(100) NOT NULL DEFAULT 'default',
    upload_task_id char(32) DEFAULT NULL,
    upload_user_id char(32) DEFAULT NULL,
    create_time datetime DEFAULT CURRENT_TIMESTAMP,
    update_time datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (upload_task_id)
);

CREATE TABLE storage_content (
    storage_key varchar(500) NOT NULL,
    content blob NOT NULL,
    create_time datetime DEFAULT CURRENT_TIMESTAMP,
    update_time datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (storage_key)
);
```

---

## 2. 表设计说明

## 2.1 `storage_upload_task`

用途：

- 记录上传任务主信息
- 承接普通上传和分片上传的统一流程状态
- 保存临时文件位置和最终绑定结果

关键字段说明：

| 字段 | 含义 |
| --- | --- |
| `id` | 上传任务 ID |
| `task_mode` | 任务类型，如 `simple`、`chunk` |
| `file_name` | 原始文件名 |
| `file_extension` | 文件扩展名 |
| `file_mime_type` | MIME 类型 |
| `file_size` | 文件大小 |
| `file_hash` | 文件 hash，当前实现中用于内容复用与完整性校验 |
| `chunk_size` | 分片大小 |
| `chunk_count` | 分片总数 |
| `uploaded_chunk_count` | 已上传分片数 |
| `temp_storage_key` | 临时文件存储位置标识 |
| `status` | 任务状态，如 `INIT`、`UPLOADING`、`COMPLETED`、`FAILED` |
| `source_entity` | 来源实体 |
| `source_id` | 来源实体 ID |
| `source_type` | 来源类型，默认 `default` |
| `upload_user_id` | 上传用户 ID |
| `result_file_id` | 绑定成功后生成的正式文件 ID |
| `last_chunk_time` | 最后一次分片上传时间 |

设计意图：

- 这个表描述的是“上传过程”本身，不是正式业务文件
- 它不保存业务归属字段，业务归属只在 `storage_file` 中维护
- 即使上传完成，也只有 bind 后才算真正形成正式附件

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
| `part_size` | 分片大小 |
| `part_hash` | 分片 hash |
| `part_storage_key` | 分片临时存储位置 |
| `status` | 分片状态 |
| `upload_time` | 上传时间 |

关键约束：

```sql
UNIQUE (task_id, part_number)
```

这个唯一约束非常关键，它保证同一个上传任务内，某个分片序号只能有一条记录。

设计意图：

- 避免重复分片写入污染数据
- 支撑“已上传则直接幂等返回”的处理方式

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

关键约束：

```sql
UNIQUE (upload_task_id)
```

这表示同一个上传任务最多只能绑定出一条正式文件记录。

设计意图：

- bind 之后才进入这个表
- 这是业务层最常用的附件元数据表
- 一个业务如果只保存 fileId，通常最终就是回到这里查询详情或下载

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
   └── (0..1) storage_file

storage_file
   └── (0..1) storage_content   # 仅当 provider = db 时由 storage_key 对应
```

含义如下：

- 一个上传任务可以有多个分片
- 一个上传任务最多绑定出一个正式文件
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

如果你要把当前 H2 schema 落地到 MySQL，建议至少补充以下优化：

### 5.1 增加常用索引

建议补索引方向：

- `storage_upload_part.task_id`
- `storage_file.source_entity, source_id`
- `storage_file.upload_user_id`
- `storage_file.file_hash, file_size`
- `storage_upload_task.result_file_id`

原因：

- 提升按业务实体查询附件的性能
- 提升内容复用查找效率
- 提升上传任务回溯能力

### 5.2 时间字段统一自动更新策略

当前测试 schema 中：

- `create_time`
- `update_time`

默认值是 `CURRENT_TIMESTAMP`，但 MySQL 生产环境通常还会配合 ORM 自动填充，建议与你们现有 `nebula-base-mybatis` 的自动填充策略保持一致。

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

示意：

```sql
CREATE TABLE contract_attachment (
    id char(32) NOT NULL,
    contract_id char(32) NOT NULL,
    file_id char(32) NOT NULL,
    attachment_type varchar(50) DEFAULT 'default',
    sort_num int DEFAULT 0,
    create_time datetime DEFAULT CURRENT_TIMESTAMP,
    update_time datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

这样 storage 模块负责“统一文件中心”，业务模块负责“本业务如何组织这些文件”。

---

## 7. 小结

storage 模块的表设计体现了三个清晰思路：

1. **上传过程和正式文件分表**
   - `storage_upload_task / storage_upload_part` 管过程
   - `storage_file` 管结果

2. **正式元数据和二进制内容分离**
   - `storage_file` 管索引与归属
   - `storage_content` 只在 db provider 下存内容

3. **业务归属和物理存储同时记录**
   - 既能知道“文件属于谁”
   - 也能知道“文件实际存哪”

这也是 `nebula-storage` 能同时支持上传流程管理、正式文件管理、内容复用和多 provider 存储的关键基础。
