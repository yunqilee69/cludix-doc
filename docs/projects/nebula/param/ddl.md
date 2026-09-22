# Nebula Param 建表语句

本文档基于以下实际文件整理：

- `nebula-param-service/src/test/resources/db/test/param-schema-mysql.sql`

当前仓库里明确可读到的是 MySQL 测试 schema。字段设计已经足以反映生产表结构意图，因此本文档先按当前实际实现进行说明。

---

## 1. 建表语句

```sql
DROP TABLE IF EXISTS `sys_param`;

CREATE TABLE IF NOT EXISTS `sys_param` (
    `id` CHAR(32) NOT NULL,
    `param_key` VARCHAR(150) NOT NULL,
    `param_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `param_value` TEXT DEFAULT NULL,
    `data_type` VARCHAR(20) NOT NULL DEFAULT 'STRING',
    `option_code` VARCHAR(50) DEFAULT NULL COMMENT '选项编码，关联数据字典',
    `min_value` DECIMAL(20, 6) DEFAULT NULL,
    `max_value` DECIMAL(20, 6) DEFAULT NULL,
    `min_length` INT DEFAULT NULL,
    `max_length` INT DEFAULT NULL,
    `default_value` VARCHAR(500) DEFAULT NULL,
    `validator_regex` VARCHAR(500) DEFAULT NULL,
    `validator_message` VARCHAR(500) DEFAULT NULL,
    `render_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用自动渲染：0-否，1-是',
    `placeholder` VARCHAR(200) DEFAULT NULL,
    `module_code` VARCHAR(50) DEFAULT NULL COMMENT '所属模块编码',
    `display_order` INT NOT NULL DEFAULT 0 COMMENT '显示排序',
    `sensitive_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否敏感：0-否，1-是',
    `builtin_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内建：0-否，1-是',
    `editable_flag` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否可编辑：0-否，1-是',
    `visible_flag` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否可见：0-否，1-是',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记：0-正常，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sys_param_key` (`param_key`),
    INDEX `idx_sys_param_module_code` (`module_code`),
    INDEX `idx_sys_param_data_type` (`data_type`),
    INDEX `idx_sys_param_module_order` (`module_code`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. 表设计说明

`nebula-param` 当前核心只有一张主表：

- `sys_param`

它的职责不是简单存一组 `key/value`，而是同时承载：

- 参数定义
- 参数值
- 参数类型
- 参数校验规则
- 页面展示元数据
- 安全与治理标记

---

## 3. `sys_param`

用途：

- 存储系统参数定义与当前值
- 支撑按 key 读取、后台维护和前端设置页渲染
- 作为其他业务模块的统一运行期配置中心

### 3.1 基础标识字段

| 字段 | 含义 |
| --- | --- |
| `id` | 参数主键 ID |
| `param_key` | 参数键，系统内唯一 |
| `param_name` | 参数名称 |
| `description` | 参数说明 |
| `module_code` | 所属模块编码 |
| `display_order` | 展示顺序 |

设计意图：

- `param_key` 负责给程序按 key 读取
- `param_name` 和 `description` 负责给后台或前端设置页展示
- `module_code + display_order` 负责按模块组织和排序参数

### 3.2 值与类型字段

| 字段 | 含义 |
| --- | --- |
| `param_value` | 当前参数值 |
| `data_type` | 数据类型 |
| `default_value` | 默认值 |
| `option_code` | 选项编码，关联字典模块 |

设计意图：

- 所有参数值最终以字符串形式存储
- `data_type` 决定服务层按什么规则解释和校验它
- 当参数不是自由输入而是受控选项时，可通过 `option_code` 绑定字典

### 3.3 校验字段

| 字段 | 含义 |
| --- | --- |
| `min_value` | 最小值 |
| `max_value` | 最大值 |
| `min_length` | 最小长度 |
| `max_length` | 最大长度 |
| `validator_regex` | 正则校验规则 |
| `validator_message` | 校验失败提示 |

设计意图：

- 参数约束以数据方式落库，而不是硬编码在页面或业务逻辑里
- 保存和批量更新时可以统一执行数据校验

### 3.4 页面渲染与治理字段

| 字段 | 含义 |
| --- | --- |
| `render_enabled` | 是否启用自动渲染 |
| `placeholder` | 输入框占位提示 |
| `editable_flag` | 是否允许编辑 |
| `visible_flag` | 是否可见 |

设计意图：

- 这组字段说明参数表不仅面向后端读取，也面向设置页渲染和配置治理
- `editable_flag` 可以阻止某些参数被批量设置页修改
- `visible_flag` 可以控制参数是否参与模块级展示

### 3.5 安全与生命周期字段

| 字段 | 含义 |
| --- | --- |
| `sensitive_flag` | 是否敏感 |
| `builtin_flag` | 是否内建 |
| `deleted_flag` | 软删除标记 |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

设计意图：

- 敏感参数可以在展示和处理上做特殊策略
- 内建参数可以被识别为平台默认能力的一部分
- 删除采用软删除，便于治理和恢复

---

## 4. 关键约束与索引

### 4.1 唯一约束

```sql
UNIQUE KEY `uk_sys_param_key` (`param_key`)
```

这个唯一约束非常关键，它保证系统内同一个 `param_key` 只能存在一条记录。

设计意图：

- 保证按 key 读取永远有唯一结果
- 防止不同模块误创建相同参数键

### 4.2 模块索引

```sql
INDEX `idx_sys_param_module_code` (`module_code`)
INDEX `idx_sys_param_module_order` (`module_code`, `display_order`)
```

设计意图：

- 支撑按模块加载参数
- 支撑模块设置页按展示顺序快速读取

### 4.3 类型索引

```sql
INDEX `idx_sys_param_data_type` (`data_type`)
```

设计意图：

- 便于按类型筛选参数
- 适合后台参数管理页按数据类型过滤

---

## 5. 与业务的关系理解

可以把 `sys_param` 理解为：

```text
sys_param
   ├── 给后端程序按 key 读取运行期配置
   ├── 给前端设置页按 moduleCode 加载配置项
   ├── 给其他模块保存平台默认值
   └── 在 SINGLE / MULTIPLE 场景下通过 option_code 关联 dict 模块
```

含义如下：

- 程序关心的是 `param_key -> param_value`
- 配置中心页面关心的是参数定义、约束和渲染元数据
- 参数值若需受控集合约束，可借助字典模块完成合法性治理

---

## 6. 建表落地建议

### 6.1 建议保持 `param_key` 稳定

因为：

- 它会被代码直接引用
- 它还会被前端和其他模块作为稳定配置键使用

### 6.2 布尔字段命名已遵循项目约定

当前表里使用的是：

- `sensitive_flag`
- `builtin_flag`
- `editable_flag`
- `visible_flag`
- `deleted_flag`

这与项目约定一致，避免了布尔字段使用 `isXxx` 带来的 JavaBean 推导歧义。

### 6.3 大文本配置要谨慎使用 `param_value`

虽然 `param_value` 是 `TEXT`，可以容纳较长内容，但更适合：

- 中小型配置文本
- JSON 字符串配置
- 一般表单型参数值

如果配置体量很大、结构很复杂，建议单独建模，不要全部压到参数表中。
