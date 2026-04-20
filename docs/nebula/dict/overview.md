# Nebula Dict 模块总览

## 1. 模块定位

`nebula-dict` 是 Nebula 中台里的统一数据字典模块，负责把“可配置、可维护、可分页、可缓存、可按字典编码读取”的字典数据收敛到一个标准能力中。

从当前代码可以确认，它不仅支持传统的“字典类型 + 平铺字典项”模型，还支持带 `parentId` 和 `path` 的**树形字典项结构**。

因此它适合承载的场景包括：

- 订单状态、用户状态、证件类型等稳定枚举
- 分类编码、标签类型、业务分组等可配置项
- 前端下拉选项、单选项、枚举展示名称
- 带层级关系的区域、部门类别、业务分类树
- 需要颜色、默认值、扩展 JSON 的富字典模型

---

## 2. 模块结构

当前 `nebula-dict` 采用 Nebula 标准五段式结构：

```text
nebula-dict/
├── nebula-dict-api      # 契约层：接口、DTO、Command、Query、常量
├── nebula-dict-core     # 核心实现：service、dao、entity、缓存定义
├── nebula-dict-local    # 本地接入层：Controller + 请求/响应模型
├── nebula-dict-remote   # 远程接入层：Feign Client + 远程代理实现
└── nebula-dict-service  # 独立服务启动模块
```

各子模块职责如下：

- `nebula-dict-api`
  - 放 `IDictService`
  - 放字典类型、字典项相关的命令、查询、DTO
  - 放错误码、缓存常量等稳定契约
- `nebula-dict-core`
  - 放真正的业务实现，如 `DictServiceImpl`
  - 放 DAO / Entity / 分页查询参数对象
  - 放缓存定义与 `DictCacheService`
- `nebula-dict-local`
  - 放 REST Controller
  - 适合单体应用直接接入
- `nebula-dict-remote`
  - 放 Feign Client 与远程代理实现
  - 适合字典中心独立部署后由其他服务远程消费
- `nebula-dict-service`
  - 放独立服务启动入口
  - 默认端口 `17779`

---

## 3. 当前已确认的核心能力

根据 `IDictService`、`DictController` 与 `DictServiceImpl`，当前模块对外提供的能力包括：

### 3.1 字典类型能力

- 创建字典类型
- 更新字典类型
- 删除字典类型
- 查询字典类型详情
- 分页查询字典类型

### 3.2 字典项能力

- 创建字典项
- 更新字典项
- 删除字典项
- 查询字典项详情
- 分页查询字典项
- 按字典编码查询字典项平铺列表
- 按字典编码查询字典项树

### 3.3 层级与约束能力

当前字典项除了基础字段外，还支持：

- `dictCode`：所属字典编码
- `name`：字典项名称
- `parentId`：父级字典项 ID
- `path`：树路径
- `itemValue`：字典项值
- `defaultFlag`：是否默认值
- `tagColor`：标签颜色
- `extraJson`：扩展属性 JSON

同时服务层包含以下业务约束：

- 父节点必须存在
- 父节点必须与当前字典项属于同一个 `dictCode`
- 不允许把节点挂到自己或自己的后代下面
- 有子节点的字典项不允许直接删除
- 有字典项的字典类型不允许直接删除

---

## 4. 当前接口边界

当前本地控制器入口统一挂在：

```text
/api/dict
```

主要包括以下接口分组：

### 4.1 字典类型

- `POST /api/dict/types`
- `PUT /api/dict/types/{id}`
- `DELETE /api/dict/types/{id}`
- `GET /api/dict/types/{id}`
- `POST /api/dict/types/page`

### 4.2 字典项

- `POST /api/dict/items`
- `PUT /api/dict/items/{id}`
- `DELETE /api/dict/items/{id}`
- `GET /api/dict/items/{id}`
- `POST /api/dict/items/page`
- `GET /api/dict/items/dict/{dictCode}`
- `GET /api/dict/items/dict/{dictCode}/tree`

其中：

- `/items/dict/{dictCode}` 返回平铺列表 `List<DictItemDto>`
- `/items/dict/{dictCode}/tree` 返回树结构 `List<DictItemTreeDto>`

---

## 5. 当前缓存边界

`nebula-dict` 当前不仅支持查询，还内置了字典读取缓存。

根据 `DictCacheService` 与缓存定义配置，可以确认当前存在两类缓存：

- `dictItemByType`：按字典编码缓存字典项平铺列表
- `dictItemTreeByType`：按字典编码缓存字典项树

缓存键会区分：

- `dictCode`
- `onlyEnabled=true/false`

也就是说，同一个字典编码至少会对应以下两个常见缓存视图：

- 只看启用项
- 看全部项

当字典类型或字典项发生新增、更新、删除时，服务层会自动清理对应字典编码的平铺缓存和树缓存。

---

## 6. 本地模式与远程模式

`nebula-dict` 支持两种主要接入方式。

### 6.1 单体 / 本地模式

直接引入 `nebula-dict-local` 时：

- 当前应用直接暴露 `/api/dict/*`
- `IDictService` 由本地实现提供
- 适合单体项目或 app-starter 直接集成

### 6.2 远程模式

独立部署 `nebula-dict-service` 后，业务服务只依赖 `nebula-dict-remote`：

- 当前服务不直接实现字典逻辑
- 通过 `DictFeignClient` 转调远程字典服务
- 适合多个业务系统共享一套字典中心

---

## 7. 文档阅读建议

建议按下面顺序阅读：

1. [设计与实现](./design-and-implementation.md)
   - 先理解字典项树、路径字段、缓存和 remote 模式
2. [业务功能](./business-capabilities.md)
   - 再理解字典类型、字典项、树查询分别解决什么问题
3. [接口信息](./api-reference.md)
   - 然后查看具体 API 形态
4. [使用方式](./usage-guide.md)
   - 最后看如何单体接入、拆服务与远程消费
5. [建表语句](./ddl.md)
   - 若要真正落库，再查看表结构和字段约束

---

## 8. 推荐阅读源码入口

如果你要继续深入源码，建议优先阅读这些文件：

- `nebula-dict/nebula-dict-api/src/main/java/com/cludix/nebula/dict/service/IDictService.java`
- `nebula-dict/nebula-dict-local/src/main/java/com/cludix/nebula/dict/controller/DictController.java`
- `nebula-dict/nebula-dict-core/src/main/java/com/cludix/nebula/dict/service/impl/DictServiceImpl.java`
- `nebula-dict/nebula-dict-core/src/main/java/com/cludix/nebula/dict/service/DictCacheService.java`
- `nebula-dict/nebula-dict-core/src/main/java/com/cludix/nebula/dict/config/DictCacheDefinitionConfiguration.java`
- `nebula-dict/nebula-dict-service/src/test/resources/db/test/dict-schema-mysql.sql`
