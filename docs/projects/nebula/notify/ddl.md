---
title: Nebula Notify 数据表
date: 2026-10-02 10:30
tags: [nebula, notify, configuration]
---

# Nebula Notify 数据表

本文按实际 Entity 与全量初始化脚本整理 `nebula-notify` 的表结构。表名与字段以代码为准；方言差异（H2 测试用 `TINYINT`/`CLOB`，PostgreSQL 用 `BOOLEAN`/`TEXT`）属实现细节，这里以 PostgreSQL 全量脚本口径描述。

## 1. 表清单

| # | 表名 | 用途 | 本批 |
| --- | --- | --- | --- |
| 1 | `sys_notify_template` | 通知模板 | 新增列 `category_code` |
| 2 | `sys_notify_template_field` | 模板自定义字段 | — |
| 3 | `sys_notify_template_variant` | 模板渠道变体 | — |
| 4 | `sys_notify_channel_target` | 渠道目标（webhook） | — |
| 5 | `sys_notify_record` | 发送记录 | 新增列 `category_code` |
| 6 | `sys_site_message` | 站内信 | — |
| 7 | `sys_announcement` | 公告 | — |
| 8 | `sys_announcement_target` | 公告定向 | — |
| 9 | `sys_announcement_read_record` | 公告已读 | — |
| 10 | `sys_notify_user_preference` | 用户订阅偏好 | ✅ 新增 |
| 11 | `sys_notify_category` | 通知类别（内置 + 自定义） | ✅ 新增 |
| 12 | `sys_notify_push_device` | 移动推送设备 | ✅ 新增 |
| 13 | `sys_notify_push_record_detail` | 逐设备推送明细 | ✅ 新增 |

增量脚本位于 `docs/sql/unreleased/{mysql,postgresql}/` 下的 `01-notify-category-preference.sql` 与 `03-notify-push-device.sql`，全量脚本已同步进 `docs/sql/init/`。`01` 脚本同时带 `DROP TABLE IF EXISTS sys_notify_user_setting`（免打扰功能已整体下线）。

---

## 2. 模板相关

### 2.1 `sys_notify_template`

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | varchar(64) | PK | 主键 |
| `template_code` | varchar(100) | NOT NULL | 模板编码 |
| `template_name` | varchar(100) | NOT NULL | 模板名称 |
| `remark` | varchar(500) | | 备注 |
| `category_code` | varchar(32) | | 通知类别 code，空值归入 `DEFAULT`（本批新增）；管理端模板表单可设置/修改，见[使用方式 · 设置模板类别](./usage-guide) |
| `create_time` / `update_time` | timestamp | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建/更新时间 |

索引：`uk_notify_template_code` UNIQUE(`template_code`)、`idx_notify_template_category`(`category_code`)。

### 2.2 `sys_notify_template_field`

`id`、`template_id`（NOT NULL）、`field_code`（NOT NULL）、`field_name`（NOT NULL）、`is_required`（NOT NULL DEFAULT FALSE）、`default_value`、`example_value`、`remark`、时间列。

索引：`uk_notify_template_field_code` UNIQUE(`template_id`,`field_code`)、`idx_notify_template_field_template`(`template_id`)。

### 2.3 `sys_notify_template_variant`

`id`、`template_id`（NOT NULL）、`channel_type`（NOT NULL）、`subject_template`、`content_template`（NOT NULL）、`is_enabled`（NOT NULL DEFAULT FALSE）、`remark`、时间列。

索引：`uk_notify_template_variant_channel` UNIQUE(`template_id`,`channel_type`)、`idx_notify_template_variant_template`(`template_id`)、`idx_notify_template_variant_channel`(`channel_type`)。

### 2.4 `sys_notify_channel_target`

`id`、`target_name`（NOT NULL）、`channel_type`（NOT NULL）、`endpoint_url`（varchar(1000) NOT NULL）、`config_json`（TEXT）、`remark`、时间列。

索引：`idx_notify_channel_target_channel`(`channel_type`)。**`PUSH` 不允许建渠道目标。**

---

## 3. 记录与站内信

### 3.1 `sys_notify_record`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | varchar(64) PK | 主键 |
| `channel_type` | varchar(20) NOT NULL | 渠道类型 |
| `template_code` | varchar(100) | 模板编码 |
| `template_variant_id` | varchar(64) | 模板变体 ID |
| `target_id` | varchar(64) | 渠道目标 ID |
| `receiver_user_id` | varchar(64) | 接收用户 ID |
| `category_code` | varchar(32) | 通知类别，历史记录为空（本批新增） |
| `subject_text` | varchar(255) | 标题文本 |
| `content_text` | TEXT NOT NULL | 内容文本 |
| `receiver` | varchar(255) NOT NULL | 接收人 |
| `send_status` | varchar(20) | `SUCCESS` / `FAILED` / `SUPPRESSED` |
| `fail_reason` | varchar(500) | 失败或被抑制原因 |
| `send_time` | timestamp | 发送时间 |
| `ext_json` | TEXT | 扩展信息 |

索引：`idx_notify_record_channel`、`_template`、`_variant`、`_target`、`_receiver_user`、`_status`、`_receiver`、`_create_time`。

### 3.2 `sys_site_message`

`id`、`record_id`（NOT NULL）、`receiver_user_id`（NOT NULL）、`title`、`content`（TEXT NOT NULL）、`read_status`（NOT NULL DEFAULT FALSE）、`read_time`、时间列。

索引：`idx_site_message_receiver`、`_read`、`_record`、`idx_site_message_receiver_read_time`(`receiver_user_id`,`read_status`,`create_time`)。

---

## 4. 公告

### 4.1 `sys_announcement`

`id`、`title`（NOT NULL）、`content`（TEXT NOT NULL）、`status`（SMALLINT NOT NULL DEFAULT 0：`DRAFT=0`/`PUBLISHED=1`/`OFFLINE=2`）、`publish_time`（NOT NULL）、`expire_time`、`is_pinned`（NOT NULL DEFAULT FALSE）、`sort_num`（NOT NULL DEFAULT 0）、`is_popup`（NOT NULL DEFAULT FALSE）、`target_type`（NOT NULL：`ALL`/`USER`/`ROLE`/`ORG`）、时间列。

索引：`idx_announcement_status`、`_publish_time`、`_target_type`、`_is_popup`、`_is_pinned`。

### 4.2 `sys_announcement_target`

`id`、`announcement_id`（NOT NULL）、`target_type`（NOT NULL）、`target_value`（NOT NULL）、时间列。索引：`idx_announcement_target_announcement`、`idx_announcement_target_lookup`(`target_type`,`target_value`)。

### 4.3 `sys_announcement_read_record`

`id`、`announcement_id`（NOT NULL）、`user_id`（NOT NULL）、`read_time`（NOT NULL）、时间列。索引：`uk_announcement_read_user` UNIQUE(`announcement_id`,`user_id`)、`idx_announcement_read_user`、`idx_announcement_read_time`。

---

## 5. 本批新增表

### 5.1 `sys_notify_user_preference`（用户订阅偏好）

```sql
CREATE TABLE sys_notify_user_preference (
    id            varchar(64) NOT NULL,
    user_id       varchar(64) NOT NULL,
    category_code varchar(32) NOT NULL,
    channel       varchar(32) NOT NULL,
    is_enabled    boolean     NOT NULL DEFAULT TRUE,
    create_time   timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time   timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uk_notify_user_preference ON sys_notify_user_preference (user_id, category_code, channel);
CREATE INDEX idx_notify_user_preference_user ON sys_notify_user_preference (user_id);
```

一行表示一个「用户 × 类别 × 渠道」开关。`channel` 取 `SITE` / `EMAIL` / `PUSH`。

### 5.2 `sys_notify_category`（通知类别）

```sql
CREATE TABLE sys_notify_category (
    id                 varchar(64) NOT NULL,
    code               varchar(32) NOT NULL,
    name               varchar(50) NOT NULL,
    description        varchar(200),
    is_mandatory       boolean     NOT NULL DEFAULT FALSE,
    is_default_enabled boolean     NOT NULL DEFAULT TRUE,
    sort               int         NOT NULL DEFAULT 100,
    allowed_channels   varchar(255) NOT NULL,
    is_builtin         boolean     NOT NULL DEFAULT FALSE,
    is_enabled         boolean     NOT NULL DEFAULT TRUE,
    remark             varchar(500),
    create_time        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time        timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uk_notify_category_code ON sys_notify_category (code);
```

| 字段 | 说明 |
| --- | --- |
| `code` | 类别编码，**唯一且创建后不可修改**（模板 / 记录 / 偏好都以它为键） |
| `is_mandatory` | 强制类别：忽略用户偏好始终放行，消息设置页整组置灰 |
| `is_default_enabled` | 用户无偏好记录时的默认开关 |
| `sort` | 消息设置页排序号，值越小越靠前 |
| `allowed_channels` | 允许渠道，逗号分隔（如 `SITE,PUSH`）；不在名单内的渠道直接抑制 `CHANNEL_NOT_ALLOWED` |
| `is_builtin` | 内置类别：不可删除、`code` 不可改；其余属性可改 |
| `is_enabled` | 停用后不出现在消息设置页、不能被新模板选中；存量模板仍按它判定 |

种子 5 行内置类别（`is_builtin=TRUE`）：`SECURITY`（强制，SITE,EMAIL,PUSH，sort 10）/ `TODO`（SITE,PUSH，20）/ `BUSINESS`（SITE,PUSH，30）/ `ANNOUNCEMENT`（SITE，40）/ `DEFAULT`（SITE,EMAIL,PUSH，90）。**不设外键**：删除由业务校验（被模板引用则拒删）。

### 5.3 `sys_notify_push_device`（移动推送设备）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | varchar(64) PK | 主键 |
| `user_id` | varchar(64) NOT NULL | 所属用户，**来自登录态** |
| `device_id` | varchar(128) NOT NULL | 客户端稳定设备标识，**全局唯一** |
| `platform` | varchar(16) NOT NULL | `IOS` / `ANDROID` / `OHOS` |
| `vendor` | varchar(32) NOT NULL | `APNS` / `HMS` / `XIAOMI` / `OPPO` / `VIVO` / `HONOR` / `AGGREGATOR` |
| `push_token` | varchar(512) | 厂商 token，个人数据；注销时清空 |
| `is_notification_enabled` | boolean NOT NULL DEFAULT FALSE | 用户是否已授予通知权限 |
| `device_status` | varchar(16) NOT NULL DEFAULT 'ACTIVE' | `ACTIVE` / `INVALID` / `UNREGISTERED`，仅 `ACTIVE` 参与扇出 |
| `app_version` / `app_build` / `os_version` / `device_model` | | 客户端信息 |
| `last_active_time` | timestamp | 最后活跃时间，用于老化失效设备 |
| `invalid_reason` | varchar(255) | 失效原因，厂商反馈回填 |
| 时间列 | | |

索引：`uk_notify_push_device` UNIQUE(`device_id`)、`idx_notify_push_device_user_status`(`user_id`,`device_status`)、`idx_notify_push_device_token`(`push_token`)。

### 5.4 `sys_notify_push_record_detail`（逐设备推送明细）

`id`、`record_id`（NOT NULL，关联 `sys_notify_record.id`）、`device_id`（NOT NULL）、`user_id`、`vendor`、`send_status`（NOT NULL：`SUCCESS`/`FAILED`/`SUPPRESSED`）、`fail_reason`、`message_id`（厂商消息号，排障对账）、`send_time`（未实际投递时为空）、时间列。

索引：`idx_notify_push_detail_record`(`record_id`)、`idx_notify_push_detail_device`(`device_id`)。

> **单表刻意不存 `push_token`**：明细用于排障，设备 token 属个人数据，只在设备表保存并在注销时清空。
