# Nebula Dict 建表语句

本文档用于说明 `nebula-dict` 当前涉及的数据表结构。

## 1. 表结构概览

根据当前仓库里的初始化 SQL，可以确认模块围绕两张核心表展开：

- `sys_dict_type`
- `sys_dict_item`

它们分别承载：

- 字典类型元数据
- 字典项及树形层级关系

---

## 2. `sys_dict_type`

### 2.1 作用

用于维护字典类型本身，例如：

- `order_status`
- `user_status`
- `region`
- `certificate_type`

### 2.2 当前字段

- `id`：主键
- `code`：字典编码，唯一
- `name`：字典名称
- `status`：状态
- `remark`：备注
- `create_time`：创建时间
- `update_time`：更新时间

### 2.3 当前约束

- 主键：`id`
- 唯一键：`uk_dict_type_code (code)`
- 普通索引：`idx_dict_type_status (status)`

---

## 3. `sys_dict_item`

### 3.1 作用

用于维护字典项本身，并支持树形结构。

### 3.2 当前字段

- `id`：主键
- `dict_code`：所属字典编码
- `name`：字典项名称
- `parent_id`：父级字典项 ID
- `path`：树路径
- `item_value`：字典项值
- `sort`：排序
- `status`：状态
- `default_flag`：是否默认
- `tag_color`：标签颜色
- `extra_json`：扩展属性 JSON
- `remark`：备注
- `create_time`：创建时间
- `update_time`：更新时间

### 3.3 当前约束

- 主键：`id`
- 普通索引：`idx_dict_item_dict_code (dict_code)`
- 普通索引：`idx_dict_item_status (status)`
- 复合索引：`idx_dict_item_sort (dict_code, sort)`
- 普通索引：`idx_dict_item_parent_id (parent_id)`

### 3.4 树形字段说明

#### `parent_id`

用于表达父子关系：

- 为空：表示根节点
- 非空：表示当前节点属于某个父节点之下

#### `path`

用于表达树路径，当前服务层会自动维护，例如：

```text
根节点：a1
子节点：a1,b2
孙节点：a1,b2,c3
```

它主要用于：

- 快速表达节点祖先链路
- 更新节点父子关系后刷新后代路径
- 校验是否形成环形引用

---

## 4. 当前 MySQL 建表示例

```sql
CREATE TABLE IF NOT EXISTS `sys_dict_type` (
    `id` CHAR(32) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` SMALLINT NOT NULL DEFAULT 1,
    `remark` VARCHAR(255) DEFAULT NULL,
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_dict_type_code` (`code`),
    KEY `idx_dict_type_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sys_dict_item` (
    `id` CHAR(32) NOT NULL,
    `dict_code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `parent_id` CHAR(32) DEFAULT NULL,
    `path` VARCHAR(500) DEFAULT NULL,
    `item_value` VARCHAR(255) NOT NULL,
    `sort` INT NOT NULL DEFAULT 0,
    `status` SMALLINT NOT NULL DEFAULT 1,
    `default_flag` TINYINT NOT NULL DEFAULT 0,
    `tag_color` VARCHAR(50) DEFAULT NULL,
    `extra_json` TEXT DEFAULT NULL,
    `remark` VARCHAR(255) DEFAULT NULL,
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_dict_item_dict_code` (`dict_code`),
    KEY `idx_dict_item_status` (`status`),
    KEY `idx_dict_item_sort` (`dict_code`, `sort`),
    KEY `idx_dict_item_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. 建模建议

### 5.1 字典编码建议

- `code` 使用稳定、可复用、带业务语义的英文编码
- 不建议直接使用中文或临时业务文案

### 5.2 字典项值建议

当前模型不再保留 `item_code`，因此建议：

- `name` 承担展示名称
- `item_value` 承担实际值表达
- 若业务逻辑需要稳定值，直接依赖 `item_value`

### 5.3 树结构建议

- 由服务端自动维护 `path`
- 业务方只需要传 `parentId`
- 若不需要层级结构，直接把 `parentId` 留空即可

### 5.4 布尔字段建议

当前表结构里布尔语义字段使用：

- `default_flag` → Java 侧映射 `Boolean`

这也符合项目里关于布尔字段命名与映射的统一约定。
