# 多租户建表与数据模型

本文列出租户相关表结构、租户字段与索引约定。完整 DDL 以 `docs/sql/init/mysql/01-init-structure.sql` 与 PostgreSQL 对应文件为准。

## 1. 数据分类

多租户只有两类表：

- **G（全局表）**：没有 `tenant_id`，或虽然有 `tenant_id` 但不参与自动过滤；
- **T（租户表）**：查询、更新、删除自动追加 `tenant_id = ?`，插入自动填充。

没有“继承表”或“回退系统租户”的分类。租户表查不到就是没有。

### 1.1 全局表（G）

```text
auth_tenant
auth_tenant_domain
auth_person
auth_person_user
auth_oauth2_provider
frontend_app_release
QRTZ_*（Quartz 物理表）
```

其中：

- `auth_tenant_domain`、`auth_person_user` 含 `tenant_id`，但必须由业务代码显式查询，不能被拦截器自动填充/过滤；
- `QRTZ_*` 不修改结构，租户信息放在任务数据（JobDataMap / 任务记录）中。

### 1.2 租户表（T）

```text
auth_user
auth_role
auth_org
auth_user_role
auth_user_org
auth_menu
auth_button
auth_api
auth_permission
auth_data_scope
auth_oauth2_account
auth_login_record
auth_tenant_oauth2_provider
auth_tenant_invitation
sys_dict_type
sys_dict_item
sys_param
sys_notify_category
sys_notify_template
sys_notify_template_field
sys_notify_template_variant
sys_notify_channel_target
sys_notify_push_device
sys_notify_push_record_detail
sys_notify_record
sys_notify_user_preference
sys_site_message
sys_announcement
sys_announcement_read_record
sys_announcement_target
scheduler_job
scheduler_job_run
audit_record
storage_file
storage_file_variant
storage_upload_part
storage_upload_task
storage_content
event_outbox
event_consume_record
frontend_user_preference
```

`TenantTableRegistry` 是这份清单的唯一代码口径；新增表必须同时：

1. 在 `TenantTableRegistry.TENANT_TABLES` 登记；
2. 表结构增加 `tenant_id`；
3. 实体继承 `TenantBaseEntity`。

否则 `strict=true` 时启动失败。

## 2. 新增表

### 2.1 `auth_tenant`：租户

```sql
CREATE TABLE auth_tenant (
    id CHAR(32) NOT NULL,
    code VARCHAR(64) NOT NULL COMMENT '租户编码，公开且不可变',
    name VARCHAR(100) NOT NULL COMMENT '租户名称',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        COMMENT 'ACTIVE/SUSPENDED/EXPIRED/DELETED',
    logo VARCHAR(500),
    contact_email VARCHAR(100),
    settings_json TEXT COMMENT '租户设置 JSON',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tenant_code (code),
    KEY idx_tenant_status (status)
);
```

### 2.2 `auth_tenant_domain`：租户域名

```sql
CREATE TABLE auth_tenant_domain (
    id CHAR(32) NOT NULL,
    tenant_id CHAR(32) NOT NULL,
    domain VARCHAR(255) NOT NULL COMMENT '租户子域名（小写）',
    primary_domain TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    verified_at DATETIME,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tenant_domain (domain),
    KEY idx_tenant_domain_tenant (tenant_id)
);
```

### 2.3 `auth_person`：平台账号

```sql
CREATE TABLE auth_person (
    id CHAR(32) NOT NULL,
    username VARCHAR(64) NOT NULL COMMENT '全局唯一用户名（小写）',
    display_name VARCHAR(100),
    email VARCHAR(100),
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    phone VARCHAR(32),
    phone_verified TINYINT(1) NOT NULL DEFAULT 0,
    password_hash VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        COMMENT 'ACTIVE/DISABLED/LOCKED',
    platform_admin TINYINT(1) NOT NULL DEFAULT 0,
    recovery_mode VARCHAR(20) NOT NULL DEFAULT 'ADMIN_ONLY'
        COMMENT 'EMAIL/PHONE/ADMIN_ONLY',
    last_login_time DATETIME,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_person_username (username),
    UNIQUE KEY uk_person_email (email),
    UNIQUE KEY uk_person_phone (phone)
);
```

空的 `email` / `phone` 写 `NULL`，不能写空串，否则会破坏全局唯一键。

### 2.4 `auth_person_user`：平台账号-租户账号关联

```sql
CREATE TABLE auth_person_user (
    id CHAR(32) NOT NULL,
    person_id CHAR(32) NOT NULL,
    tenant_id CHAR(32) NOT NULL,
    user_id CHAR(32) NOT NULL,
    link_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        COMMENT 'PENDING/ACTIVE/REVOKED',
    link_source VARCHAR(20) NOT NULL
        COMMENT 'INVITE/FIRST_LOGIN/BIND_EXISTING/ADMIN',
    verified_at DATETIME,
    revoked_at DATETIME,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_person_user_tenant_user (tenant_id, user_id),
    KEY idx_person_user_person (person_id),
    KEY idx_person_user_tenant_status (tenant_id, link_status)
);
```

约束语义：

- `(tenant_id, user_id)` 唯一：一个租户账号最多一条关联；
- 一个平台账号可以关联多个租户，但同一租户内只能关联一个租户账号；“同一平台账号是否已关联本租户”由业务查询校验，冲突返回 `19018`；
- 修改关联时更新原记录，不追加第二行。

### 2.5 `auth_oauth2_provider`：平台 provider 目录

```sql
CREATE TABLE auth_oauth2_provider (
    id CHAR(32) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    protocol VARCHAR(20) NOT NULL COMMENT 'OAUTH2/OIDC/WECHAT',
    supports_channels VARCHAR(100) COMMENT '逗号分隔',
    tenant_configurable TINYINT(1) NOT NULL DEFAULT 0,
    allowed_endpoints TEXT COMMENT '允许的端点 JSON',
    icon_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_oauth2_provider_code (code)
);
```

### 2.6 `auth_tenant_oauth2_provider`：租户 OAuth 配置

```sql
CREATE TABLE auth_tenant_oauth2_provider (
    id CHAR(32) NOT NULL,
    tenant_id CHAR(32) DEFAULT '0194f3c8b6b77c0d91a7d9af9c7d0100',
    provider_id CHAR(32) NOT NULL,
    channel VARCHAR(20) NOT NULL COMMENT 'WEB/MINI/APP',
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    client_id VARCHAR(200),
    client_secret_cipher TEXT COMMENT 'Client Secret 密文（只写不读）',
    redirect_uri VARCHAR(500),
    frontend_callback_uri VARCHAR(500),
    frontend_callback_allowlist TEXT COMMENT '前端回调白名单 JSON',
    authorize_url VARCHAR(500),
    token_url VARCHAR(500),
    userinfo_url VARCHAR(500),
    scope VARCHAR(500),
    config_json TEXT,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tenant_oauth2_provider (tenant_id, provider_id, channel),
    KEY idx_tenant_oauth2_tenant (tenant_id)
);
```

### 2.7 `auth_tenant_invitation`：租户邀请

```sql
CREATE TABLE auth_tenant_invitation (
    id CHAR(32) NOT NULL,
    tenant_id CHAR(32) DEFAULT '0194f3c8b6b77c0d91a7d9af9c7d0100',
    email VARCHAR(100),
    phone VARCHAR(32),
    role_id CHAR(32),
    org_id CHAR(32),
    token_hash VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        COMMENT 'PENDING/ACCEPTED/REVOKED/EXPIRED',
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tenant_invitation_token (token_hash),
    KEY idx_tenant_invitation_tenant (tenant_id, status)
);
```

## 3. 改造表

所有改造表都增加 `tenant_id CHAR(32) DEFAULT '0194f3c8b6b77c0d91a7d9af9c7d0100'`，并把原唯一键前置 `tenant_id`。

| 表 | 额外字段 | 新唯一键 / 索引 |
| --- | --- | --- |
| `auth_user` | `tenant_id`、`employee_no` | `(tenant_id, username)`、`(tenant_id, phone)`、`(tenant_id, email)`、`(tenant_id, employee_no)`、`(tenant_id, status)` |
| `auth_role` | `tenant_id` | `(tenant_id, code)`、`(tenant_id, status)` |
| `auth_org` | `tenant_id` | `(tenant_id, code)`、`(tenant_id, status)`、`(tenant_id, parent_id)` |
| `auth_user_role` | `tenant_id` | `(tenant_id, user_id, role_id)` |
| `auth_user_org` | `tenant_id` | `(tenant_id, user_id, org_id)` |
| `auth_menu` | `tenant_id` | `(tenant_id, code)`、`(tenant_id, status)`、`(tenant_id, parent_id)` |
| `auth_button` | `tenant_id` | `(tenant_id, code)`、`(tenant_id, status)`、`(tenant_id, menu_id)` |
| `auth_api` | `tenant_id` | `(tenant_id, code)` |
| `auth_permission` | `tenant_id` | 以 `tenant_id` 开头 |
| `auth_data_scope` | `tenant_id` | 以 `tenant_id` 开头 |
| `auth_oauth2_account` | `tenant_id` | `(tenant_id, provider_id, provider_user_id)`、`(tenant_id, user_id)` |
| `auth_login_record` | `tenant_id`、`person_id` | `(tenant_id, user_id)`、`(tenant_id, login_time)`、`(tenant_id, client_type)` |
| `sys_param` | `tenant_id` | `(tenant_id, param_key)`、`(tenant_id, module_code)`、`(tenant_id, data_type)` |
| `sys_dict_type` | `tenant_id` | `(tenant_id, code)` |
| `sys_dict_item` | `tenant_id` | `(tenant_id, dict_code)`、`(tenant_id, is_enabled)`、`(tenant_id, dict_code, sort)`、`(tenant_id, parent_id)` |
| `sys_notify_*` | `tenant_id` | 现有唯一键前置 `tenant_id` |
| `sys_site_message` / `sys_announcement*` | `tenant_id` | 以 `tenant_id` 开头 |
| `scheduler_job` | `tenant_id` | `(tenant_id, job_code)` |
| `scheduler_job_run` | `tenant_id` | 以 `tenant_id` 开头 |
| `audit_record` | `tenant_id`、`person_id`、`operator_tenant_id`、`target_tenant_id` | `(tenant_id, create_time)` 等 |
| `storage_file` | `tenant_id` | `(tenant_id, file_hash)`、`(tenant_id, storage_key)`、`(tenant_id, upload_task_id)` 等 |
| `storage_file_variant` / `storage_upload_part` / `storage_upload_task` | `tenant_id` | 以 `tenant_id` 开头 |
| `storage_content` | `tenant_id` | `(tenant_id, storage_key)` |
| `event_outbox` | `tenant_id` | `(tenant_id, event_id)` 等 |
| `event_consume_record` | `tenant_id` | `(tenant_id, consumer_name, idempotency_key)` |
| `frontend_user_preference` | `tenant_id` | `(tenant_id, user_id)` |

## 4. 索引与查询约定

- 所有租户表的联合索引以 `tenant_id` 开头，保证自动追加的租户条件能命中索引；
- 唯一约束必须包含 `tenant_id`，同名角色、组织、字典、参数可以在不同租户重复存在；
- 全局表 `auth_person` 的用户名/邮箱/手机号保持全局唯一；
- 手写 SQL 必须显式写 `tenant_id`，拦截器不会改写；
- 统计、报表、运维脚本访问租户表时要显式指定租户或用 `TenantContext.ignore` 做全局扫描。

## 5. 初始化数据

`02-init-data.sql` 中的关键数据：

| 数据 | 说明 |
| --- | --- |
| `auth_tenant` 两行 | 默认租户 `0194f3c8b6b77c0d91a7d9af9c7d0100 / default` 与系统租户 `__system__ / system` |
| 平台管理员 person | `platform_admin`，`platform_admin=1` |
| 默认租户管理员 | `auth_user` admin、`ADMIN` 角色、`ROOT` 组织 |
| 关联 | 平台管理员 person 与默认租户 admin 的 `auth_person_user` |
| 模板资源 | 系统租户下的组织、角色、管理员、菜单、按钮、API、权限 |
| provider 目录 | GitHub、微信 web/mini |
| 租户/平台菜单 | 租户设置、租户 OAuth、成员邀请、平台租户管理、平台账号 |

新建租户时从系统租户复制模板；字典、通知、参数由各模块 `TenantDataProvisioner` 补齐。复制后各租户数据自包含，运行时不再回退系统租户。

## 6. 迁移说明

- 多租户改造只维护全量初始化 SQL，不提供增量脚本；
- 不做存量数据回填；
- 已有单租户数据库需要先导出业务数据，按新结构重建后再导入，并补齐默认租户与平台账号关联；
- 不要直接在生产库执行 `ALTER TABLE` 后开启 `enabled=true`，缺少 `auth_person_user` 关联会导致所有租户用户无法登录。

## 7. 相关文档

- [配置说明](./configuration.md)
- [设计与实现](./design-and-implementation.md)
- [使用方式](./usage-guide.md)
