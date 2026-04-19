# Nebula Auth 建表与迁移说明

## 1. SQL 文件位置

当前 `nebula-auth` 已提供 2 份与数据库相关的 SQL 文件，均位于：

- `nebula-auth/nebula-auth-core/src/main/resources/db/schema/`

具体包括：

1. `01-auth-schema-mysql.sql`：auth 模块初始化建表脚本
2. `02-auth-org-type-migration-mysql.sql`：组织类型字段迁移脚本

从文件头部说明可确认：

- 目标数据库：MySQL 8
- 默认字符集：`utf8mb4`
- 排序规则：`utf8mb4_unicode_ci`
- 主键采用 32 位 UUID v7 字符串

---

## 2. 初始化脚本

初始化脚本会先执行：

```sql
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;
```

最后再恢复：

```sql
SET FOREIGN_KEY_CHECKS = 1;
```

这样做的目的是：

- 保证建表阶段统一使用 UTF-8 编码
- 让脚本在容器化或不同环境中执行时更稳定
- 降低建表顺序受外键检查影响的风险

---

## 3. 表结构说明

## 3.1 用户表 `auth_user`

作用：

- 存储平台基础用户信息
- 支撑登录、当前用户信息与用户管理

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键，UUID v7 |
| `username` | 用户名，唯一 |
| `password` | 密码 |
| `nickname` | 昵称 |
| `avatar` | 头像 URL |
| `email` | 邮箱 |
| `phone` | 手机号 |
| `status` | 状态：`0` 禁用，`1` 启用 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_user_username(username)`
- 索引：`idx_user_status(status)`

## 3.2 角色表 `auth_role`

作用：

- 存储后台角色定义
- 作为权限聚合主体之一

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `code` | 角色编码，唯一 |
| `name` | 角色名称 |
| `description` | 角色描述 |
| `status` | 状态 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_role_code(code)`
- 索引：`idx_role_status(status)`

## 3.3 组织表 `auth_org`

作用：

- 存储组织结构
- 支撑组织树、组织授权与用户组织归属

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `name` | 组织名称 |
| `parent_id` | 父组织 ID |
| `path` | 层级路径 |
| `sort` | 排序 |
| `code` | 组织编码，唯一 |
| `type` | 类型：`COMPANY` / `DEPARTMENT` / `TEAM` |
| `status` | 状态 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_org_code(code)`
- 索引：`idx_org_status(status)`
- 索引：`idx_org_parent_id(parent_id)`

## 3.4 用户组织关联表 `auth_user_org`

作用：

- 建立用户与组织之间的多对多关系
- 标识用户主组织

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `user_id` | 用户 ID |
| `org_id` | 组织 ID |
| `primary_flag` | 是否主组织：`0` 否，`1` 是 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_user_org(user_id, org_id)`
- 索引：`idx_user_org_user_id(user_id)`
- 索引：`idx_user_org_org_id(org_id)`

## 3.5 用户角色关联表 `auth_user_role`

作用：

- 建立用户与角色之间的多对多关系

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `user_id` | 用户 ID |
| `role_id` | 角色 ID |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_user_role(user_id, role_id)`
- 索引：`idx_user_role_user_id(user_id)`
- 索引：`idx_user_role_role_id(role_id)`

## 3.6 菜单表 `auth_menu`

作用：

- 存储后台菜单与路由元数据
- 为菜单树渲染与菜单授权提供数据支撑

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `name` | 菜单名称 |
| `parent_id` | 父菜单 ID |
| `path` | 路由路径 |
| `sort` | 排序号 |
| `code` | 菜单编码，唯一 |
| `icon` | 图标 |
| `component` | 前端组件路径 |
| `type` | 类型 |
| `status` | 状态 |
| `hidden` | 是否隐藏 |
| `external_flag` | 是否外链 |
| `external_url` | 外链地址 |
| `visible_in_breadcrumb` | 是否显示在面包屑 |
| `visible_in_tab` | 是否显示在标签页 |
| `active_menu_path` | 激活菜单路径 |
| `remark` | 备注 |

关键约束：

- 唯一键：`uk_menu_code(code)`
- 索引：`idx_menu_status(status)`
- 索引：`idx_menu_parent_id(parent_id)`

## 3.7 按钮表 `auth_button`

作用：

- 存储页面按钮资源
- 用于动作级权限控制

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `menu_id` | 所属菜单 ID |
| `code` | 按钮编码，唯一 |
| `name` | 按钮名称 |
| `type` | 按钮类型，如 add / edit / delete / export |
| `sort` | 排序号 |
| `status` | 状态 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_button_code(code)`
- 索引：`idx_button_status(status)`
- 索引：`idx_button_menu_id(menu_id)`

## 3.8 权限表 `auth_permission`

作用：

- 表示某个主体对某个资源的授权结果

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `subject_type` | 主体类型：`USER` / `ROLE` / `ORG` |
| `subject_id` | 主体 ID |
| `resource_type` | 资源类型：`MENU` / `BUTTON` |
| `resource_id` | 资源 ID |
| `effect` | 效果：`Allow` / `Deny` |
| `scope` | 权限范围，默认 `ALL` |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_permission(subject_type, subject_id, resource_type, resource_id)`
- 索引：`idx_permission_subject(subject_type, subject_id)`
- 索引：`idx_permission_resource(resource_type, resource_id)`
- 索引：`idx_permission_effect(effect)`

## 3.9 OAuth2 账户表 `auth_oauth2_account`

作用：

- 存储第三方账号与本地用户绑定关系

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `user_id` | 本地用户 ID |
| `provider_id` | 提供商 ID |
| `provider_user_id` | 提供商用户 ID |
| `provider_attributes` | 提供商返回的用户属性 JSON |
| `linked_at` | 绑定时间 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_provider_user(provider_id, provider_user_id)`
- 索引：`idx_oauth2_account_user_id(user_id)`

## 3.10 OAuth2 客户端表 `auth_oauth2_client`

作用：

- 存储 OAuth2 客户端配置
- 用于第三方授权接入管理

核心字段：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `client_id` | 客户端 ID |
| `client_secret` | 客户端密钥 |
| `client_name` | 客户端名称 |
| `grant_types` | 授权类型 |
| `scopes` | 授权范围 |
| `redirect_uris` | 重定向 URI，换行分隔 |
| `auto_approve` | 是否自动批准 |
| `access_token_validity` | access token 有效期（秒） |
| `refresh_token_validity` | refresh token 有效期（秒） |
| `additional_information` | 额外信息 JSON |
| `status` | 状态 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

关键约束：

- 唯一键：`uk_client_id(client_id)`
- 索引：`idx_oauth2_client_status(status)`

---

## 4. 初始化 SQL 原文

当前模块提供的初始化 SQL 如下：

```sql
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `auth_user` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名，唯一',
    `password` VARCHAR(100) NOT NULL COMMENT '密码',
    `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    `email` VARCHAR(50) DEFAULT NULL COMMENT '邮箱',
    `phone` VARCHAR(50) DEFAULT NULL COMMENT '手机号',
    `status` SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_username` (`username`),
    KEY `idx_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `auth_role` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `code` VARCHAR(50) NOT NULL COMMENT '角色编码，唯一',
    `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
    `description` VARCHAR(200) DEFAULT NULL COMMENT '描述',
    `status` SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_code` (`code`),
    KEY `idx_role_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

CREATE TABLE IF NOT EXISTS `auth_org` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `name` VARCHAR(100) NOT NULL COMMENT '组织名称',
    `parent_id` CHAR(32) DEFAULT NULL COMMENT '父组织ID，NULL为根节点',
    `path` VARCHAR(500) DEFAULT NULL COMMENT '层级路径',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序，越大越靠前',
    `code` VARCHAR(50) NOT NULL COMMENT '组织编码，唯一',
    `type` VARCHAR(32) NOT NULL COMMENT '类型：COMPANY公司 DEPARTMENT部门 TEAM小组',
    `status` SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_org_code` (`code`),
    KEY `idx_org_status` (`status`),
    KEY `idx_org_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织表';

CREATE TABLE IF NOT EXISTS `auth_user_org` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `user_id` CHAR(32) NOT NULL COMMENT '用户ID',
    `org_id` CHAR(32) NOT NULL COMMENT '组织ID',
    `primary_flag` TINYINT NOT NULL DEFAULT 0 COMMENT '是否主组织：0否 1是',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_org` (`user_id`, `org_id`),
    KEY `idx_user_org_user_id` (`user_id`),
    KEY `idx_user_org_org_id` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-组织关联表';

CREATE TABLE IF NOT EXISTS `auth_user_role` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `user_id` CHAR(32) NOT NULL COMMENT '用户ID',
    `role_id` CHAR(32) NOT NULL COMMENT '角色ID',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    KEY `idx_user_role_user_id` (`user_id`),
    KEY `idx_user_role_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-角色关联表';

CREATE TABLE IF NOT EXISTS `auth_menu` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `name` VARCHAR(100) NOT NULL COMMENT '菜单名称',
    `parent_id` CHAR(32) DEFAULT NULL COMMENT '父菜单ID，NULL为根节点',
    `path` VARCHAR(200) DEFAULT NULL COMMENT '路由路径',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
    `code` VARCHAR(100) NOT NULL COMMENT '菜单编码，唯一',
    `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标',
    `component` VARCHAR(200) DEFAULT NULL COMMENT '前端组件路径',
    `type` VARCHAR(100) DEFAULT NULL COMMENT '类型：菜单组、菜单、外链',
    `status` SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    `hidden` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否隐藏：0否 1是',
    `external_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否外链：0否 1是',
    `external_url` VARCHAR(500) DEFAULT NULL COMMENT '外链地址',
    `visible_in_breadcrumb` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示在面包屑：0否 1是',
    `visible_in_tab` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示在标签页：0否 1是',
    `active_menu_path` VARCHAR(200) DEFAULT NULL COMMENT '激活菜单路径',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_menu_code` (`code`),
    KEY `idx_menu_status` (`status`),
    KEY `idx_menu_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表';

CREATE TABLE IF NOT EXISTS `auth_button` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `menu_id` CHAR(32) NOT NULL COMMENT '所属菜单ID',
    `code` VARCHAR(100) NOT NULL COMMENT '按钮编码，唯一',
    `name` VARCHAR(100) NOT NULL COMMENT '按钮名称',
    `type` VARCHAR(20) DEFAULT NULL COMMENT '按钮类型：add/edit/delete/export等',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
    `status` SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_button_code` (`code`),
    KEY `idx_button_status` (`status`),
    KEY `idx_button_menu_id` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='按钮表';

CREATE TABLE IF NOT EXISTS `auth_permission` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `subject_type` VARCHAR(20) NOT NULL COMMENT '主体类型：USER/ROLE/ORG',
    `subject_id` CHAR(32) NOT NULL COMMENT '主体ID',
    `resource_type` VARCHAR(20) NOT NULL COMMENT '资源类型：MENU/BUTTON',
    `resource_id` CHAR(32) NOT NULL COMMENT '资源ID',
    `effect` VARCHAR(100) NOT NULL DEFAULT 'Allow' COMMENT '效果：Allow（授权）或 Deny（拒绝）',
    `scope` VARCHAR(100) NOT NULL DEFAULT 'ALL' COMMENT '权限范围，默认ALL',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_permission` (`subject_type`, `subject_id`, `resource_type`, `resource_id`),
    KEY `idx_permission_subject` (`subject_type`, `subject_id`),
    KEY `idx_permission_resource` (`resource_type`, `resource_id`),
    KEY `idx_permission_effect` (`effect`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

CREATE TABLE IF NOT EXISTS `auth_oauth2_account` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `user_id` CHAR(32) NOT NULL COMMENT '用户ID',
    `provider_id` VARCHAR(50) NOT NULL COMMENT '提供商ID',
    `provider_user_id` VARCHAR(100) NOT NULL COMMENT '提供商用户ID',
    `provider_attributes` TEXT DEFAULT NULL COMMENT '提供商返回的用户属性(JSON)',
    `linked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_provider_user` (`provider_id`, `provider_user_id`),
    KEY `idx_oauth2_account_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OAuth2账户表';

CREATE TABLE IF NOT EXISTS `auth_oauth2_client` (
    `id` CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    `client_id` VARCHAR(100) NOT NULL COMMENT '客户端ID（OAuth2使用）',
    `client_secret` VARCHAR(255) NOT NULL COMMENT '客户端密钥',
    `client_name` VARCHAR(100) NOT NULL COMMENT '客户端名称',
    `grant_types` VARCHAR(500) NOT NULL COMMENT '授权类型',
    `scopes` VARCHAR(500) NOT NULL COMMENT '授权范围',
    `redirect_uris` TEXT NOT NULL COMMENT '重定向URI，换行分隔',
    `auto_approve` TINYINT NOT NULL DEFAULT 0 COMMENT '是否自动批准：0否 1是',
    `access_token_validity` INT NOT NULL DEFAULT 7200 COMMENT '访问令牌有效期（秒）',
    `refresh_token_validity` INT NOT NULL DEFAULT 604800 COMMENT '刷新令牌有效期（秒）',
    `additional_information` TEXT DEFAULT NULL COMMENT '额外信息(JSON)',
    `status` SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_client_id` (`client_id`),
    KEY `idx_oauth2_client_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OAuth2客户端表';

SET FOREIGN_KEY_CHECKS = 1;
```

---

## 5. 组织类型迁移脚本

当前还提供了一份组织类型迁移脚本，用于把旧的数字语义迁移到显式字符串类型：

```sql
ALTER TABLE `auth_org`
    MODIFY COLUMN `type` VARCHAR(32) NOT NULL COMMENT '类型：COMPANY公司 DEPARTMENT部门 TEAM小组';

UPDATE `auth_org`
SET `type` = CASE `type`
    WHEN '1' THEN 'COMPANY'
    WHEN '2' THEN 'DEPARTMENT'
    WHEN '3' THEN 'TEAM'
    ELSE `type`
END
WHERE `type` IN ('1', '2', '3');
```

迁移含义：

- `1` → `COMPANY`
- `2` → `DEPARTMENT`
- `3` → `TEAM`

这个迁移让组织类型从“只能靠约定记忆的数字值”升级为“具有明确业务语义的枚举字符串”，可读性更高，也更方便接口层直接透出。
