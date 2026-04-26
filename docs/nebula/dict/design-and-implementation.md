# Nebula Dict 设计与实现

## 1. 分层设计

`nebula-dict` 采用 Nebula 一致的 `api / core / local / remote / service` 五段式分层。

### 1.1 `nebula-dict-api`

这一层负责稳定契约，当前可以确认包括：

- `IDictService`
- `CreateDictTypeCommand`、`UpdateDictTypeCommand`
- `CreateDictItemCommand`、`UpdateDictItemCommand`
- `PageDictTypeQuery`、`PageDictItemQuery`
- `DictTypeDto`、`DictTypeDetailDto`
- `DictItemDto`、`DictItemDetailDto`、`DictItemTreeDto`
- 字典相关错误码与缓存名称常量

### 1.2 `nebula-dict-core`

这一层是真正的业务核心，当前可以确认包括：

- `DictServiceImpl`
- `DictTypeDAO`、`DictItemDAO`
- `DictTypeEntity`、`DictItemEntity`
- `DictCacheService`
- `DictCacheDefinitionConfiguration`

### 1.3 `nebula-dict-local`

这一层对外暴露 REST 接口，当前核心入口是：

- `DictController`

它负责：

- 请求对象到 Command / Query 的转换
- 响应 DTO 到 Resp 的转换
- 对外暴露 `/api/dict/*` 接口

### 1.4 `nebula-dict-remote`

这一层为微服务消费者提供远程代理能力，当前关键入口包括：

- `DictFeignClient`
- `DictRemoteServiceImpl`
- `DictRemoteProperties`

### 1.5 `nebula-dict-service`

这一层是独立字典服务的启动模块：

- 默认端口 `17779`
- 服务内自身使用 `nebula.dict.mode=local`
- 可被其他服务以 remote 模式调用

---

## 2. 核心数据模型

当前字典模块围绕两张核心业务表组织。

### 2.1 `sys_dict_type`

用于承载字典类型元数据，主要字段包括：

- `id`
- `code`
- `name`
- `status`
- `remark`
- `create_time`
- `update_time`

它的业务意义是：

- 定义一个字典域，例如 `order_status`、`user_status`、`region`
- 作为字典项的归属字典
- 作为对外查询时的稳定字典编码入口

### 2.2 `sys_dict_item`

用于承载字典项本身，主要字段包括：

- `id`
- `dict_code`
- `name`
- `parent_id`
- `path`
- `item_value`
- `sort`
- `status`
- `default_flag`
- `tag_color`
- `extra_json`
- `remark`
- `create_time`
- `update_time`

它的业务意义是：

- `dict_code` 用于归属到某个字典类型
- `name` 用于前端展示名称
- `item_value` 用于实际值表达
- `parent_id + path` 用于构建树形字典
- `default_flag / tag_color / extra_json` 用于承载富业务元数据

这里最关键的变化是：

- 字典类型不再使用 `type_code / type_name`，而是统一为 `code / name`
- 字典项不再保留 `item_code`，而是收敛到 `dict_code + name + item_value`

---

## 3. 树形字典设计

这是当前 `nebula-dict` 相比纯平铺字典模块最关键的增强点。

### 3.1 层级字段

当前层级结构通过两个字段表达：

- `parentId`：父级字典项 ID
- `path`：树路径

其中：

- 根节点的 `parentId` 为空
- 根节点的 `path` 为自身 ID
- 子节点的 `path` 会拼成 `祖先ID,当前ID` 这样的链路

例如：

```text
中国      path = cnId
上海      path = cnId,shId
浦东新区  path = cnId,shId,pdId
```

### 3.2 创建节点

创建字典项时，服务层会先做以下事情：

1. 校验字典类型存在
2. 如果带了 `parentId`，校验父节点存在
3. 校验父节点与当前项属于同一个 `dictCode`
4. 保存当前节点
5. 计算并回写 `path`
6. 清理该字典编码下的缓存

### 3.3 更新节点

更新字典项时，服务层不仅更新普通字段，还会处理层级关系：

1. 查询当前节点
2. 校验新父节点是否合法
3. 校验不能形成环
4. 更新 `parentId`
5. 重建当前节点 `path`
6. 递归刷新所有后代节点路径
7. 清理该字典编码下缓存

### 3.4 删除节点

删除字典项时，服务层会先检查：

- 当前节点是否存在子节点

如果仍有子节点，则直接拒绝删除。

### 3.5 按编码查询树形字典

当前按字典编码查询接口为：

```text
GET /api/dict/items/dict/{dictCode}
```

返回模型为 `DictItemTreeDto`，其核心字段包括：

- `id`
- `dictCode`
- `name`
- `parentId`
- `path`
- `itemValue`
- `children`

当前树构建策略是：

1. 先按 `parentId` 对节点分组
2. 再递归挂载子节点
3. 若某节点的父节点不在当前加载结果里，则把它提升为根节点返回

这最后一点很重要，因为在 `onlyEnabled=true` 的场景下，如果父节点被过滤掉、子节点仍然启用，按编码查询接口也不会把这个子节点静默丢失。

---

## 4. 查询与分页设计

### 4.1 字典类型分页

字典类型分页基于 `PageDictTypeQuery`，支持按以下条件查询：

- `code`
- `name`
- `status`

### 4.2 字典项分页

字典项分页基于 `PageDictItemQuery`，支持按以下条件查询：

- `dictCode`
- `name`
- `status`

### 4.3 按编码读取字典项

按编码查询接口：

```text
GET /api/dict/items/dict/{dictCode}
```

它统一返回树结构，适合：

- 下拉选项
- 单选项列表
- 状态值显示
- 分类树
- 区域树
- 多级联动选择器
- 树形筛选条件

---

## 5. 缓存设计

`nebula-dict` 当前使用单独的 `DictCacheService` 统一处理字典读取缓存。

### 5.1 缓存域

根据 `DictCacheDefinitionConfiguration`，当前存在两个缓存域：

- `dictItemByType`
- `dictItemTreeByType`

### 5.2 缓存键

缓存键由：

- `dictCode`
- `onlyEnabled`

共同组成，形如：

```text
order_status::true
order_status::false
```

### 5.3 缓存读取

- 平铺缓存通过 `getOrLoadFlatList(...)` 获取缓存或回源
- 树形读取通过 `getOrLoadTree(...)` 获取缓存或回源

### 5.4 缓存失效

当以下操作发生时，会自动清理对应字典编码的平铺缓存和树缓存：

- 更新字典类型
- 删除字典类型
- 创建字典项
- 更新字典项
- 删除字典项

这意味着：

- 前端读取字典时可以享受缓存收益
- 后台维护字典时不需要自己额外处理缓存清理

---

## 6. local / remote 模式设计

### 6.1 local 模式

`DictController` 使用了：

```java
@ConditionalOnNebulaModuleMode(module = "dict", value = "local", matchIfMissing = true)
```

因此在 `nebula.dict.mode=local` 时：

- 本地控制器生效
- 当前应用直接提供字典能力

### 6.2 remote 模式

业务应用切换到 `nebula.dict.mode=remote` 后：

- 不再直接启用本地控制器与实现
- 通过 `DictFeignClient` 远程转调字典服务
- 业务代码仍然面向 `IDictService` 编程

### 6.3 设计价值

这套设计的价值在于：

- 单体接入时，简单直接
- 微服务拆分时，不需要改业务代码接口层写法
- 字典能力可以从“内嵌模块”平滑升级为“共享字典中心”

---

## 7. 当前实现中的约束与边界

### 7.1 唯一性约束

- 字典类型 `code` 唯一

当前字典项不再使用 `itemCode` 作为独立身份字段，因此服务与表结构不再保留 `(dict_code, item_code)` 唯一约束。

### 7.2 层级约束

- 父节点必须存在
- 父节点必须属于同一字典编码
- 不允许环形引用
- 有子节点时不允许删除

### 7.3 类型删除约束

- 字典类型下仍有字典项时，不允许删除

### 7.4 过滤语义

`onlyEnabled` 默认语义是：

- 传 `null` 时，等价于 `true`
- 即默认只返回启用状态的字典项

这既适用于树形读取，也适用于服务内部的平铺缓存视图。

---

## 8. 推荐继续阅读入口

如果要进一步看源码实现细节，建议重点阅读：

- `nebula-dict/nebula-dict-core/src/main/java/com/cludix/nebula/dict/service/impl/DictServiceImpl.java`
- `nebula-dict/nebula-dict-core/src/main/java/com/cludix/nebula/dict/service/DictCacheService.java`
- `nebula-dict/nebula-dict-local/src/main/java/com/cludix/nebula/dict/controller/DictController.java`
- `nebula-dict/nebula-dict-remote/src/main/java/com/cludix/nebula/dict/feign/DictFeignClient.java`
- `nebula-dict/nebula-dict-api/src/main/java/com/cludix/nebula/dict/model/dto/DictItemTreeDto.java`
