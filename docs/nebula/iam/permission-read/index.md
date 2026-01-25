# IAM权限系统设计方案

> **IAM**（Identity and Access Management，身份与访问管理）是指对系统中的用户身份进行认证（Authentication）和授权（Authorization）的管理体系。本系统基于IAM理念，提供统一的权限管理能力。

## 一、表关系图

### 1.1 主体关联关系

```
iam_user (用户)
  │
  ├── ia m_user_role ── iam_role (角色)
  │   (用户-角色关联)
  │
  └── iam_user_org ── iam_org (组织)
      (用户-组织关联)
        │
        └── iam_org (下级组织 - 自关联)
```

### 1.2 资源关联关系

```
iam_menu (菜单)
  │
  ├── iam_menu (子菜单 - 自关联)
  │
  └── iam_button (按钮)
```

### 1.3 权限关联关系

```
iam_permission (权限⭐) ── 主体
  │
  ├── USER  ── iam_user
  │
  ├── ROLE  ── iam_role
  │
  └── ORG   ── iam_org

iam_permission (权限⭐) ── 资源
  │
  ├── MENU   ── iam_menu
  │
  └── BUTTON ── iam_button
```

### 1.4 关系说明表

| 表名 | 关联表 | 关联字段 | 关系说明 |
|------|--------|----------|----------|
| iam_user_role | iam_user | user_id | 用户拥有多个角色 |
| iam_user_role | iam_role | role_id | 角色被分配给多个用户 |
| iam_user_org | iam_user | user_id | 用户属于多个组织 |
| iam_user_org | iam_org | org_id | 组织包含多个用户 |
| iam_org | iam_org | parent_id | 组织层级关系（自关联） |
| iam_menu | iam_menu | parent_id | 菜单层级关系（自关联） |
| iam_button | iam_menu | menu_id | 按钮属于某个菜单 |
| iam_permission | iam_user | subject_id + subject_type='USER' | 用户授权 |
| iam_permission | iam_role | subject_id + subject_type='ROLE' | 角色授权 |
| iam_permission | iam_org | subject_id + subject_type='ORG' | 组织授权 |
| iam_permission | iam_menu | resource_id + resource_type='MENU' | 菜单权限 |
| iam_permission | iam_button | resource_id + resource_type='BUTTON' | 按钮权限 |

## 二、方案概述

本权限系统采用统一权限模型（Unified Permission Model），核心特点：

| 特性 | 说明 |
|------|------|
| 多主体授权 | 支持用户(User)、角色(Role)、组织(Org)三种维度独立授权 |
| 资源分离 | 菜单和按钮为独立表结构，便于分别管理 |
| 灵活授权 | 支持授权(Allow)和拒绝(Deny)两种效果 |
| 自定义范围 | 权限范围字段为字符串，用户可自定义（默认ALL） |
| 动态扩展 | 新增资源类型无需修改权限表结构 |

**授权优先级**：用户授权 > 角色授权 > 组织授权，Deny（拒绝） > Allow（授权）

## 三、表结构定义

### 3.1 用户表 (iam_user)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| username | VARCHAR(50) | 用户名，唯一 |
| password | VARCHAR(100) | 密码 |
| nickname | VARCHAR(50) | 昵称 |
| avatar | VARCHAR(500) | 头像URL |
| email | VARCHAR(50) | 邮箱 |
| phone | VARCHAR(50) | 手机号 |
| status | TINYINT | 状态：0禁用 1启用 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.2 角色表 (iam_role)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| code | VARCHAR(50) | 角色编码，唯一 |
| name | VARCHAR(50) | 角色名称 |
| description | VARCHAR(200) | 描述 |
| status | TINYINT | 状态：0禁用 1启用 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.3 组织表 (iam_org)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| parent_id | BIGINT | 父组织ID，0为根节点 |
| code | VARCHAR(50) | 组织编码，唯一 |
| name | VARCHAR(100) | 组织名称 |
| type | TINYINT | 类型：1公司 2部门 3小组 |
| path | VARCHAR(500) | 层级路径，如：id1-id2-id3 |
| sort | INT | 排序，越大越靠前 |
| status | TINYINT | 状态：0禁用 1启用 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.4 用户-角色关联表 (iam_user_role)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 用户ID |
| role_id | BIGINT | 角色ID |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.5 用户-组织关联表 (iam_user_org)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 用户ID |
| org_id | BIGINT | 组织ID |
| is_priamry | TINYINT | 是否主组织：0否 1是 |
| create_time | TIMESTAMP | 创建时间 |

### 3.6 菜单表 (iam_menu) ⭐ 资源表1

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| parent_id | BIGINT | 父菜单ID，0为根节点 |
| code | VARCHAR(100) | 菜单编码，唯一 |
| name | VARCHAR(100) | 菜单名称 |
| path | VARCHAR(200) | 路由路径 |
| icon | VARCHAR(50) | 图标 |
| component | VARCHAR(200) | 前端组件路径 |
| type | VARCHAR(100) | 类型：菜单组、菜单、外链 |
| sort | INT | 排序号 |
| status | TINYINT | 状态：0禁用 1启用 |
| c re a te Ti me | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.7 按钮表 (iam_button) ⭐ 资源表2

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| menu_id | BIGINT | 所属菜单ID |
| code | VARCHAR(100) | 按钮编码，唯一 |
| name | VARCHAR(100) | 按钮名称 |
| type | VARCHAR(20) | 按钮类型：add/edit/delete/export等 |
| sort | INT | 排序号 |
| status | TINYINT | 状态：0禁用 1启用 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.8 权限表 (iam_permission) ⭐ 核心表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| subject_type | VARCHAR(20) | 主体类型：USER/ROLE/ORG |
| subject_id | BIGINT | 主体ID |
| resource_type | VARCHAR(20) | 资源类型：MENU/BUTTON |
| resource_id | BIGINT | 资源ID |
| effect | VARCHAR(100) | 效果：Allow（授权）或 Deny（拒绝），默认Allow |
| scope | VARCHAR(100) | 权限范围，用户自定义字符串，默认ALL |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

**唯一约束**：(subject_type, subject_id, resource_type, resource_id)

## 四、字段详细说明

### 4.1 effect（授权效果）

| 值 | 含义 | 优先级 |
|----|------|--------|
| Allow | 授权 | 低 |
| Deny | 拒绝 | 高 |

**规则**：同一资源同时存在Allow和Deny时，Deny优先

### 4.2 scope（权限范围）

| 示例值 | 含义 | 说明 |
|--------|------|------|
| ALL | 全部 | 默认，无限制 |

> scope字段为字符串，业务系统可根据需求自定义格式和解析逻辑
