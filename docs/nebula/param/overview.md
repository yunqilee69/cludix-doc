# Nebula Param 模块总览

## 1. 模块定位

`nebula-param` 是 Nebula 中台里的统一系统参数中心，负责把“运行期要按 key 读取、允许后台维护、又需要按类型约束和分组展示”的配置能力收敛到一个标准模块中。

它适合承载的场景包括：

- 登录与注册开关
- 页面默认配置
- 阈值与限制参数
- 可动态调整的业务行为开关
- 面向前端渲染的配置项
- 需要按模块分组展示的系统设置

从当前代码可以确认，它不是简单的 `key/value` 存储，而是一套带有**数据类型、范围校验、长度校验、正则校验、字典选项约束、可见性与可编辑性治理属性**的参数模型。

---

## 2. 模块结构

当前 `nebula-param` 按照 Nebula 标准拆成 5 个子模块：

```text
nebula-param/
├── nebula-param-api      # 契约层：接口、DTO、Command、Query、常量
├── nebula-param-core     # 核心实现：service、dao、entity、缓存定义
├── nebula-param-local    # 本地接入层：Controller + 请求/响应模型
├── nebula-param-remote   # 远程接入层：Feign Client + 远程代理实现
└── nebula-param-service  # 独立服务启动模块
```

各子模块职责如下：

- `nebula-param-api`
  - 放 `ISystemParamService`
  - 放参数相关命令、查询、DTO、错误码和数据类型枚举
  - 为其他业务模块提供稳定的参数读取与维护契约
- `nebula-param-core`
  - 放真正的业务实现，如 `SystemParamServiceImpl`
  - 放 DAO / Entity / 分页查询参数对象
  - 放缓存定义和参数校验逻辑
- `nebula-param-local`
  - 放 REST Controller
  - 适合单体应用直接接入
- `nebula-param-remote`
  - 放 Feign Client 与远程代理实现
  - 适合参数中心独立部署后由其他服务远程消费
- `nebula-param-service`
  - 放独立服务启动入口
  - 默认端口 `17780`

---

## 3. 当前已确认的核心能力

根据 `ISystemParamService`、`SystemParamController` 与 `SystemParamServiceImpl`，当前模块对外提供的能力包括：

### 3.1 参数管理能力

- 创建系统参数
- 更新系统参数
- 删除系统参数
- 查询系统参数详情
- 按参数键查询详情
- 分页查询系统参数
- 按模块编码查询参数列表
- 按参数键保存或更新参数
- 批量更新参数值

### 3.2 按键读取能力

当前模块除了后台维护接口，还提供面向业务代码与前端配置读取的按键读取能力：

- 按键读取原始字符串值
- 按键读取布尔值
- 按键读取整数值

这意味着业务方既可以把它当成“后台配置中心”，也可以把它当成“运行期参数读取接口”。

### 3.3 参数治理属性

从 `SystemParamEntity` 可以确认，当前参数模型除了基础键值之外，还支持：

- `paramKey`：参数键，唯一约束
- `paramName`：参数名称
- `description`：参数说明
- `dataType`：数据类型
- `optionCode`：字典选项编码
- `minValue / maxValue`：数值范围
- `minLength / maxLength`：长度范围
- `defaultValue`：默认值
- `validatorRegex / validatorMessage`：正则校验规则与提示信息
- `renderEnabled`：是否启用前端渲染
- `placeholder`：前端占位提示
- `moduleCode`：模块分组编码
- `displayOrder`：展示顺序
- `sensitiveFlag`：是否敏感参数
- `builtinFlag`：是否内建参数
- `editableFlag`：是否允许批量修改
- `visibleFlag`：是否在模块查询中可见
- `deletedFlag`：软删除标记

这说明 `nebula-param` 不只是面向后端读取，也有明确的“前端可配置表单项”和“后台配置中心”建模意图。

---

## 4. 支持的数据类型

从 `SystemParamDataTypeEnum` 与服务层校验逻辑可确认，当前支持以下类型：

- `STRING`
- `INT`
- `DOUBLE`
- `BOOLEAN`
- `SINGLE`
- `MULTIPLE`

其中：

- `STRING` 支持长度校验与正则校验
- `INT` / `DOUBLE` 支持最小值和最大值校验
- `BOOLEAN` 要求值必须可解析为 `true/false`
- `SINGLE` / `MULTIPLE` 会通过 `optionCode` 关联字典模块，对可选值进行合法性校验

因此参数模块与字典模块之间存在明确协作关系：

> **当参数不是自由输入，而是“从可选项中选”的配置时，`nebula-param` 会借助 `nebula-dict` 保证参数值不会超出合法选项集合。**

---

## 5. 当前接口边界

当前本地控制器入口统一挂在：

```text
/api/param/system-params
```

主要包括以下接口分组：

### 5.1 参数维护

- `POST /api/param/system-params`
- `PUT /api/param/system-params/{id}`
- `DELETE /api/param/system-params/{id}`
- `GET /api/param/system-params/{id}`
- `GET /api/param/system-params/key/{paramKey}/detail`
- `PUT /api/param/system-params/key/{paramKey}`
- `POST /api/param/system-params/page`
- `GET /api/param/system-params/module/{moduleCode}`
- `POST /api/param/system-params/batch-update-values`

### 5.2 按键读取

- `GET /api/param/system-params/key/{paramKey}`
- `GET /api/param/system-params/key/{paramKey}/boolean`
- `GET /api/param/system-params/key/{paramKey}/integer`

其中：

- `/module/{moduleCode}` 更适合前端按模块加载一组可见参数
- `/batch-update-values` 更适合后台“设置页一次保存多个参数值”的场景
- `/key/{paramKey}` 系列更适合业务逻辑和前端初始化直接读取运行期配置

---

## 6. 当前缓存边界

从 `ParamCacheNames` 与 `SystemParamServiceImpl` 可确认，当前至少存在一类核心缓存：

- `systemParamByKey`：按参数键缓存参数实体或参数值读取结果

在以下场景中，服务层会主动清理对应缓存：

- 创建参数
- 更新参数
- 删除参数
- 按键保存或更新参数
- 批量更新参数值

这样做的目的是让：

- 高频读取走缓存
- 配置修改后及时失效
- 业务方不需要自己手工处理参数缓存一致性

---

## 7. 本地模式与远程模式

`nebula-param` 支持两种主要接入方式。

### 7.1 单体 / 本地模式

直接引入 `nebula-param-local` 时：

- 当前应用直接暴露 `/api/param/*`
- `ISystemParamService` 由本地实现提供
- 适合单体项目或 app-starter 直接集成

### 7.2 远程模式

独立部署 `nebula-param-service` 后，业务服务只依赖 `nebula-param-remote`：

- 当前服务不直接实现参数逻辑
- 通过 remote 层转调远程参数中心
- 适合多个业务系统共享一套系统参数中心

---

## 8. 文档阅读建议

建议按下面顺序阅读：

1. [设计与实现](./design-and-implementation.md)
   - 先理解参数模型、数据类型和校验逻辑
2. [业务功能](./business-capabilities.md)
   - 再理解参数维护、批量更新、按模块加载分别解决什么问题
3. [接口信息](./api-reference.md)
   - 然后查看具体 API 形态
4. [使用方式](./usage-guide.md)
   - 最后看如何单体接入、拆服务与远程消费
5. [建表语句](./ddl.md)
   - 若要真正落库，再查看表结构和字段约束

---

## 9. 推荐阅读源码入口

如果你要继续深入源码，建议优先阅读这些文件：

- `nebula-param/nebula-param-api/src/main/java/com/cludix/nebula/param/service/ISystemParamService.java`
- `nebula-param/nebula-param-local/src/main/java/com/cludix/nebula/param/controller/SystemParamController.java`
- `nebula-param/nebula-param-core/src/main/java/com/cludix/nebula/param/service/impl/SystemParamServiceImpl.java`
- `nebula-param/nebula-param-core/src/main/java/com/cludix/nebula/param/model/entity/SystemParamEntity.java`
- `nebula-param/nebula-param-service/src/main/resources/application.yml`
- `nebula-param/nebula-param-service/src/test/resources/db/test/param-schema-mysql.sql`
