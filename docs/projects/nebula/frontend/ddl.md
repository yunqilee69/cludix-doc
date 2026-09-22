# Nebula Frontend 建表语句

本文档基于以下实际文件整理：

- `nebula-frontend-service/src/test/resources/db/test/frontend-schema-h2.sql`

当前仓库里明确可读到的是 H2 测试 schema。字段设计已经足以反映生产表结构意图，因此本文档先按当前实际实现进行说明。

---

## 1. 建表语句

```sql
CREATE TABLE IF NOT EXISTS frontend_user_preference (
    id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    locale_tag VARCHAR(32),
    theme_code VARCHAR(64),
    navigation_layout_code VARCHAR(64),
    sidebar_layout_code VARCHAR(64),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_frontend_preference_user UNIQUE (user_id)
);
```

---

## 2. 表设计说明

`nebula-frontend` 当前核心只有一张主表：

- `frontend_user_preference`

它的职责不是保存平台级默认配置，而是保存**当前登录用户的个性化前端偏好**。

这张表与 frontend 模块的整体设计边界是：

- 平台默认配置 -> 走参数中心 `frontend.*`
- 用户个性化偏好 -> 落在 `frontend_user_preference`

---

## 3. `frontend_user_preference`

用途：

- 保存用户前端语言偏好
- 保存用户主题偏好
- 保存用户导航和侧边栏布局偏好
- 支撑用户下次登录后恢复自己的界面使用习惯

### 3.1 关键字段说明

| 字段 | 含义 |
| --- | --- |
| `id` | 偏好记录主键 ID |
| `user_id` | 用户 ID |
| `locale_tag` | 语言标签，例如 `zh-CN`、`en-US` |
| `theme_code` | 主题编码，例如 `nebula-light` |
| `navigation_layout_code` | 导航布局编码，例如 `side-nav` |
| `sidebar_layout_code` | 侧边栏布局编码，例如 `classic-sidebar` |
| `create_time` | 创建时间 |
| `update_time` | 更新时间 |

### 3.2 设计意图

这张表的设计非常轻量，反映出 frontend 模块对“用户偏好”这一能力的定位：

- 只存当前用户自己的界面偏好
- 不承载平台默认配置
- 不承载复杂的主题自定义历史
- 不承载多套偏好方案切换

也就是说，它更像“当前用户的前端配置快照”，而不是一个复杂的个性化配置中心。

---

## 4. 唯一约束说明

### 4.1 用户唯一偏好约束

```sql
CONSTRAINT uk_frontend_preference_user UNIQUE (user_id)
```

这个唯一约束非常关键，它保证：

- 一个用户最多只会有一条前端偏好记录

设计意图：

- 简化查询逻辑：按 `user_id` 可直接取唯一一条记录
- 简化更新逻辑：有则更新，无则创建
- 避免一个用户出现多条偏好记录导致前端恢复状态不确定

这也正好对应 `FrontendServiceImpl` 当前的保存逻辑：

- 先按 `userId` 查询
- 有记录就更新
- 没记录就创建

---

## 5. 与平台配置的关系

可以把 frontend 模块的数据关系理解为：

```text
参数中心 frontend.*
   └── 保存平台默认配置

frontend_user_preference
   └── 保存当前用户个性化偏好
```

含义如下：

- 如果用户没有设置过偏好，前端回退到平台默认配置
- 如果用户设置过偏好，优先使用用户记录中的值

这种双层设计避免了两个常见问题：

1. 平台默认值和用户偏好混在一张表里，职责不清
2. 管理员改默认值时，误覆盖用户个性化配置

---

## 6. 字段值的受控集合

虽然表结构本身只是字符串字段，但从 service 层可确认，这些值并不是任意写入，而是受到受控集合校验：

### 6.1 语言标签

- 通过 `Locale.forLanguageTag(...)` 规范化
- 必须落在平台可选语言集合中

### 6.2 主题编码

当前受控于内置主题集合，例如：

- `nebula-light`
- `nebula-graphite`

### 6.3 导航布局编码

当前支持：

- `side-nav`
- `top-nav`
- `mix-nav`

### 6.4 侧边栏布局编码

当前支持：

- `classic-sidebar`
- `double-sidebar`
- `collapsed-sidebar`

因此从数据库视角看是“几个字符串字段”，但从业务语义看，它其实是一组受控枚举型偏好数据。

---

## 7. 建表落地建议

### 7.1 建议保留 `user_id` 唯一约束

因为当前业务模型就是“一人一份当前偏好”。

如果去掉唯一约束，会导致：

- 查询逻辑变复杂
- 更新逻辑不稳定
- 前端恢复偏好时不知道取哪条记录

### 7.2 如果后续要支持更多偏好项，可继续按字段扩展

例如未来可能新增：

- 首页工作台布局
- 标签页行为偏好
- 默认打开菜单
- 是否启用动画效果

只要它们仍然属于“当前用户的一份前端偏好”，继续扩展在这张表上是合理的。

### 7.3 平台级配置不要混入这张表

例如：

- 项目名称
- 默认主题
- 默认语言
- 语言集合

这类配置当前设计上就应该继续放在参数中心，而不是落回 `frontend_user_preference`。
