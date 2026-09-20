# Nebula Param 设计与实现

## 1. 设计目标

`nebula-param` 要解决的不是单一“把配置存到数据库里”这么简单的问题，而是要同时解决下面几类系统级需求：

- 参数如何支持多种数据类型，而不是只有字符串
- 参数如何在保存时完成范围、长度、格式和选项合法性校验
- 参数如何既能作为后台配置中心，又能作为业务代码运行期读取入口
- 参数如何支持前端设置页按模块展示和批量保存
- 单体与微服务模式下如何复用同一套参数契约

因此它的设计是“**统一参数模型 + 类型化校验 + 按 key 缓存读取 + local/remote 可切换接入方式**”的组合。

---

## 2. 分层结构

### 2.1 `nebula-param-api`

这一层定义稳定契约，主要包括：

- `ISystemParamService`
- `CreateSystemParamCommand` / `UpdateSystemParamCommand`
- `SaveOrUpdateSystemParamByKeyCommand`
- `PageSystemParamQuery`
- `SystemParamDto` / `SystemParamDetailDto`
- `SystemParamDataTypeEnum`
- `ParamErrorInfo`
- `SystemParamOperationHook` / `NoopSystemParamOperationHook`
- `SystemParamCreatedEvent` / `SystemParamUpdatedEvent` / `SystemParamDeletedEvent`

它的意义是让业务模块、local 层和 remote 层都围绕同一套参数对象协作。

### 2.2 `nebula-param-core`

核心实现层主要承载：

- 参数新增、更新、删除
- 参数按键读取与类型转换
- 分页查询与按模块加载
- 批量更新参数值
- 数据类型校验与字典选项校验
- 缓存清理与软删除支持
- 写操作 Hook 调用与领域事件发布

### 2.3 `nebula-param-local`

这一层负责把参数能力暴露成 HTTP 接口。

设计上，Controller 主要做三件事：

- 接收请求参数
- 把 req 转成 command / query
- 调用 service 并组装 resp

这样接口层比较薄，业务逻辑集中在 core 层，便于本地接入和远程接入共用同一套语义。

### 2.4 `nebula-param-remote`

这一层提供远程代理实现，适用于参数中心独立部署时的服务消费方。

它的价值在于：

- 业务系统仍然可以面向 `ISystemParamService` 编程
- 业务侧不需要手工拼接参数中心 HTTP 请求
- 切换本地模式和远程模式时，业务层改动较小

### 2.5 `nebula-param-service`

这一层是独立参数中心服务入口。

它的职责不是新增业务逻辑，而是把 local + core 组合成可独立部署的参数中心服务。

---

## 3. 参数模型设计

`SystemParamEntity` 当前映射表为 `sys_param`，字段设计体现了它不是单纯的 `param_key / param_value` 二元模型，而是一个可治理的系统参数定义。

### 3.1 基础标识字段

- `paramKey`：参数键，唯一约束
- `paramName`：参数名称
- `description`：参数说明
- `moduleCode`：所属模块编码
- `displayOrder`：展示顺序

这些字段解决的是“这个参数是谁、给谁看、按什么顺序展示”的问题。

### 3.2 值与类型字段

- `paramValue`：当前参数值
- `dataType`：参数数据类型
- `defaultValue`：默认值
- `optionCode`：选项编码

这些字段解决的是“这个参数应该按什么规则解释”的问题。

### 3.3 校验字段

- `minValue / maxValue`
- `minLength / maxLength`
- `validatorRegex / validatorMessage`

这些字段解决的是“参数值是不是合法”的问题。

### 3.4 前端治理字段

- `renderEnabled`
- `placeholder`
- `visibleFlag`
- `editableFlag`

这些字段说明参数模块并不只给后端程序员使用，还带有面向前端设置页和后台配置中心的建模意图。

### 3.5 安全与生命周期字段

- `sensitiveFlag`
- `builtinFlag`
- `deletedFlag`

这些字段分别对应：

- 敏感参数值需要特殊处理
- 内建参数不应被随意删除
- 删除采用软删除，而不是物理删除

---

## 4. 数据类型校验设计

`SystemParamServiceImpl` 的核心设计之一，是在参数保存和批量更新时统一走校验逻辑，而不是让非法值先落库再让读取方兜底。

### 4.1 校验入口

创建和更新参数时，会先统一调用：

- `validateBeforeSave(...)`

该方法会串联以下检查：

1. `validateDataType(dataType)`
2. `validateRange(minValue, maxValue)`
3. `validateLengthRange(minLength, maxLength)`
4. `validateRegex(validatorRegex)`
5. `validateValueByDataType(...)`

也就是说，系统同时校验：

- 元数据配置是否合理
- 当前参数值本身是否符合配置要求

### 4.2 STRING 类型

`STRING` 类型当前支持：

- 最小长度
- 最大长度
- 正则表达式校验

适合场景：

- 平台标题
- URL 前缀
- 编码规则
- JSON 字符串配置

### 4.3 INT / DOUBLE 类型

数值类型当前支持：

- 最小值
- 最大值
- 格式合法性校验

适合场景：

- 登录失败次数上限
- 超时时间
- 默认分页大小
- 比例系数与阈值

### 4.4 BOOLEAN 类型

布尔类型要求值必须能解析为：

- `true`
- `false`

这意味着它适合承载各种功能开关，而不会因为录入了 `1/0/yes/no` 这类非标准值造成语义不一致。

### 4.5 SINGLE / MULTIPLE 类型

这两类参数不是自由输入，而是依赖 `optionCode` 关联字典模块的选项列表：

- `SINGLE`：单选
- `MULTIPLE`：多选，通常为逗号分隔值集合

服务层会调用 `IDictService.listDictItems()` 拉取合法选项，再验证当前值是否落在可选集合中。

这使参数模块和字典模块形成了一个很实用的组合：

> **字典模块负责维护“可选项全集”，参数模块负责维护“当前选了哪个或哪些值”。**

---

## 5. 参数维护流程设计

### 5.1 创建参数

`createSystemParam` 的核心流程是：

1. 校验 `paramKey` 是否唯一
2. 校验参数值与参数元数据是否合法
3. 调用 `SystemParamOperationHook.beforeCreateSystemParam`
4. 构建 `SystemParamEntity` 并写入数据库
5. 调用 `afterCreateSystemParam`
6. 发布 `SystemParamCreatedEvent`
7. 清理按 key 读取缓存

设计意图：

- 从入口阻断重复参数键
- 把非法参数配置挡在落库前
- 保证后续按 key 读取不会读到脏数据
- 给业务留下同事务拦截点和写后通知点

### 5.2 更新参数

`updateSystemParam` 的核心流程是：

1. 读取参数实体，不存在则报错
2. 再次执行完整校验
3. 调用 `beforeUpdateSystemParam`（可拿到更新前快照）
4. 更新元数据和参数值
5. 持久化并清理缓存
6. 调用 `afterUpdateSystemParam`
7. 发布 `SystemParamUpdatedEvent`（带 `old*` 快照和 `valueChanged`）

它的特点是：

- 更新不是只改 `paramValue`
- 参数定义本身也可以被维护
- 每次更新后都保证缓存失效
- 监听器能区分“只改了元数据”还是“参数值真的变了”

### 5.3 按 key 保存或更新参数

`saveOrUpdateSystemParamByKey` 的设计更偏向“平台内部程序化写参数”的场景。

核心流程：

1. 校验参数值
2. 按 key 查参数
3. 调用 `beforeSaveOrUpdateSystemParamByKey`（`existing == null` 表示即将新建）
4. 不存在就新建，已存在就更新
5. 清理缓存
6. 调用 `afterSaveOrUpdateSystemParamByKey`（`created=true` 表示走了新建分支）
7. 新建发 `SystemParamCreatedEvent`，更新发 `SystemParamUpdatedEvent`

这类接口很适合：

- frontend 模块保存自己的平台配置
- 各业务模块写入模块级默认参数
- 启动初始化时自动补齐缺失参数

---

## 6. 按键读取与缓存设计

### 6.1 按 key 读取字符串

`getParamValueByKey(paramKey)` 是最基础的读取方式。

它返回原始字符串值，适合：

- 保留业务自己解释值含义
- 读取 JSON 字符串或复杂文本配置

### 6.2 按 key 读取布尔与整数

在原始字符串读取之上，模块还提供：

- `getBooleanParamByKey`
- `getIntegerParamByKey`

这样做的价值是：

- 把常见类型转换封装在参数模块内
- 避免业务方各自重复解析和处理异常
- 对非法值统一抛出参数错误

### 6.3 缓存设计

当前核心缓存为：

- `systemParamByKey`

在以下操作完成后会主动清理对应缓存：

- create
- update
- delete
- saveOrUpdateByKey
- batchUpdateParamValues

也就是说，参数模块的读取模型是：

> **读尽量走缓存，写完立即失效。**

这非常适合“读多写少”的系统参数场景。

---

## 7. 按模块展示与批量更新设计

### 7.1 按模块展示

`listParamsByModule(moduleCode)` 的查询条件里，当前明确只返回：

- 指定 `moduleCode`
- `visibleFlag = true`
- 按 `displayOrder` 排序

这说明它不是面向后台审计全量参数的接口，而更像“给设置页渲染一组当前可展示参数”的接口。

### 7.2 批量更新参数值

`batchUpdateParamValues` 的设计非常适合后台设置页：

1. 前端一次提交多个 `paramKey + paramValue`
2. 服务端逐条处理
3. 每条结果都记录成功或失败
4. 返回成功数、失败数和逐项信息

它还有两个关键约束：

- 参数不存在时不会静默忽略
- `editableFlag != true` 时会拒绝修改

Hook 只在全部项校验通过后调用一次：`beforeBatchUpdateParamValues` → 逐项写库 → `afterBatchUpdateParamValues`。只有**参数值确实变化**的项才会发布 `SystemParamUpdatedEvent`。

这使“页面一键保存设置”具备更稳定的治理能力，而不是所有参数都能随便改。

---

## 8. 写操作 Hook 设计

`SystemParamOperationHook` 是参数模块的同步扩展点（SPI），接口放在 api 模块，core 通过 `@ConditionalOnMissingBean` 注册 `NoopSystemParamOperationHook`。业务声明同类型 Bean 后，Spring 会优先使用业务实现。

### 8.1 调用时机

统一顺序是：

```text
既有校验通过 → before* → 写库 / 清缓存 → after* → 发布事件
```

- `before*`：校验通过之后、写库之前。抛出 `BusinessException` 即中止（不写库、不发事件）
- `after*`：写库之后、事件发布之前、**同一事务内**。抛出异常会回滚本次操作且不发布事件

因此 Hook 适合做“必须和参数写入一起成功或一起失败”的联动；跨模块异步通知应走事件，而不是 Hook。

### 8.2 参数语义

- `command` / 批量更新的 `items` 是服务层传入的**同一实例**，在 `before*` 中修改会影响本次操作
- `existing` / `created` / `updated` / `deleted` 是 `SystemParamConverter` 新构建的副本，修改不影响持久化结果
- `afterCreate*` / `afterUpdate*` / `afterSaveOrUpdate*` 的 DTO 由内存实体转换，`createTime` / `updateTime` 可能为 `null`（未回查数据库），业务不得依赖
- `beforeSaveOrUpdateSystemParamByKey` 的 `existing` 为 `null` 表示该键不存在、将执行新建

### 8.3 方法清单

| 方法 | 触发操作 |
| --- | --- |
| `beforeCreateSystemParam` / `afterCreateSystemParam` | 创建参数 |
| `beforeUpdateSystemParam` / `afterUpdateSystemParam` | 按 ID 更新参数 |
| `beforeSaveOrUpdateSystemParamByKey` / `afterSaveOrUpdateSystemParamByKey` | 按 key 保存或更新 |
| `beforeDeleteSystemParam` / `afterDeleteSystemParam` | 删除参数 |
| `beforeBatchUpdateParamValues` / `afterBatchUpdateParamValues` | 批量更新参数值 |

---

## 9. 领域事件设计

写成功后，`SystemParamServiceImpl` 通过 `NebulaEventPublisher` 发布事件。事件类同样放在 api 模块，继承 `AbstractNebulaEvent`，`eventType` 由 `@NebulaEventDefinition` 的 `module + code` 拼接。

### 9.1 事件清单

| 事件类 | eventType | 触发时机 |
| --- | --- | --- |
| `SystemParamCreatedEvent` | `param-created` | `createSystemParam`，以及 `saveOrUpdateByKey` 的新建分支 |
| `SystemParamUpdatedEvent` | `param-updated` | `updateSystemParam`、`saveOrUpdateByKey` 的更新分支，以及批量更新中值确实变化的项 |
| `SystemParamDeletedEvent` | `param-deleted` | `deleteSystemParam` |

### 9.2 载荷约定

三类事件的 Payload **都不含 `paramValue`**，避免敏感配置进入 outbox 与事件日志。需要当前值的监听器，应在同一进程内调用 `ISystemParamService.getParamValueByKey(paramKey)`。

`SystemParamUpdatedEvent.Payload` 额外提供：

- `oldParamName` / `oldOptionCode` / `oldModuleCode`：更新前快照
- `valueChanged`：参数值是否变化

`dataType` 使用 `SystemParamDataTypeEnum.name()`，例如 `INT`、`BOOLEAN`。

### 9.3 发布与消费边界

- Hook 失败会阻止事件发布
- 本地模式默认可在事务提交后再分发；远程模式把事件写入 outbox，由 relay 投递
- Hook 跑在**真正执行写操作的那一侧**（local 应用或独立 param-service），remote 消费方注册 Hook 不会拦截远端写入

---

## 10. 错误码与治理策略

从 `ParamErrorInfo` 可确认，当前主要错误包括：

- 参数键已存在
- 参数不存在
- 参数值与数据类型不匹配
- 参数可选项配置不合法
- 参数最小值不能大于最大值

这类错误码设计反映出模块最关心的两个问题：

1. **参数定义是否合理**
2. **参数值是否符合定义**

因此它的设计重点不是复杂权限编排，而是“把运行期配置数据治理好”。

---

## 11. 本地 / 远程模式切换设计

从配置和模块守卫可以确认，param 模块明确支持两类运行方式。

### 11.1 local

- Controller 在当前应用中直接生效
- Service 使用本地实现
- 适合单体应用或参数中心不拆分的场景

### 11.2 remote

- 当前应用只依赖 remote 代理
- 通过 `service-name` 或 `service-url` 访问独立参数服务
- 适合多个业务系统共享一套参数中心

这种设计的价值在于：

> **业务侧依旧围绕同一套参数 service 和 DTO 契约编程，而不是随着部署方式切换重写参数调用逻辑。**

---

## 12. 小结

Nebula Param 的实现可以概括为下面几条：

1. **参数不是简单字符串键值，而是有完整元数据和治理属性的配置模型**
2. **保存参数时统一完成类型、范围、长度、格式和选项校验**
3. **读取参数时支持按 key 获取字符串、布尔和整数值**
4. **按模块加载和批量更新使它天然适合做后台设置页**
5. **缓存围绕按 key 读取构建，写后立即失效**
6. **与字典模块协作后，可以把“参数值必须从可选项中选”这类场景治理得更稳**
7. **写路径提供同事务 Hook 和写后领域事件：Hook 负责拦截与联动，事件负责跨模块通知；事件负载不含参数值**

这套设计使 param 模块既能服务于业务代码中的运行期配置读取，也能覆盖后台系统设置、前端配置中心和模块化参数管理等更复杂的场景。
