# Nebula 包设计

## 1. 设计目的

Nebula 的包设计服务于两个核心目标：

- **让模块职责一眼可见**：看到包名就能判断类所处层次与用途；
- **让本地接入与远程接入保持统一契约**：通过稳定的包组织避免对象和实现散落。

从 `dict`、`notify`、`auth`、`comms` 与 `nebula-base` 的实际代码看，Nebula 已经形成了比较统一的包组织方式。它不是完全照搬 DDD 的 `application/domain/infrastructure` 命名，也不是传统项目里松散的 `controller/service/mapper/entity` 平铺，而是围绕“**模块子工程 + 分层包**”来组织。

---

## 2. 包设计总原则

### 2.1 先按模块切分，再按层次切分

Nebula 先通过 Maven 模块划出大边界，例如：

- `nebula-auth`
- `nebula-dict`
- `nebula-notify`
- `nebula-comms`
- `nebula-base`

然后每个子模块内部再按层次划分包，例如：

- `controller`
- `service`
- `model.command`
- `model.query`
- `model.dto`
- `model.entity`
- `dao`
- `dao.mapper`
- `dao.param`

因此，Nebula 的包设计顺序是：

> **先确定领域模块，再确定子模块层次，最后确定类所在包。**

### 2.2 包名表达职责，而不是表达技术细节

例如：

- `model.command` 表达“写入指令对象”；
- `model.query` 表达“查询条件对象”；
- `model.dto` 表达“跨层传输对象”；
- `model.req` / `model.resp` 表达“HTTP 接入对象”；
- `dao.param` 表达“DAO 查询参数对象”。

这比把所有对象都堆在 `vo`、`bo`、`pojo` 之类模糊包名里更清晰。

### 2.3 同一语义对象，尽量固定落点

Nebula 中对象落点已经比较稳定：

- 对外服务契约对象 → `*-api`
- Web 请求/响应对象 → `*-local`
- 数据库存储实体 → `*-core`
- 分页/DAO 查询参数 → `*-core/dao/param`

这让新增代码时不需要重新发明组织方式。

---

## 3. 根包命名规则

Nebula 的统一根包前缀是：

```java
com.cludix.nebula
```

在这个前缀下，包名按照“基础设施域”或“业务域”继续展开。

### 3.1 基础设施模块包名

基础设施模块一般直接使用能力名作为二级包，例如：

- `com.cludix.nebula.common`
- `com.cludix.nebula.mybatis`
- `com.cludix.nebula.web`
- `com.cludix.nebula.cache`
- `com.cludix.nebula.cloud`

这种命名表达的是“平台级能力域”，不绑定具体业务。

### 3.2 业务模块包名

业务模块使用领域名作为二级包，例如：

- `com.cludix.nebula.auth`
- `com.cludix.nebula.dict`
- `com.cludix.nebula.notify`
- `com.cludix.nebula.comms`

然后再在其下继续划分层级包。

---

## 4. 业务模块的标准包结构

从 `dict`、`notify`、`auth` 的代码中，可以抽出一个标准模板。

### 4.1 `*-api` 的标准包

典型结构：

```text
com.cludix.nebula.xxx
├── service
├── model.command
├── model.query
├── model.dto
├── constant
├── config / configuration
```

职责说明：

- `service`：定义服务接口，如 `IDictService`、`INotifyService`；
- `model.command`：新增、修改、发送等写操作命令对象；
- `model.query`：详情、分页、列表等读操作查询对象；
- `model.dto`：跨层传输结果对象；
- `constant`：错误码、缓存名、状态枚举、渠道枚举等；
- `config` / `configuration`：模块守卫、自动配置入口、装配约束。

代表例子：

- `com.cludix.nebula.dict.model.command.CreateDictTypeCommand`
- `com.cludix.nebula.notify.model.query.PageAnnouncementQuery`
- `com.cludix.nebula.auth.service.IUserService`

### 4.2 `*-core` 的标准包

典型结构：

```text
com.cludix.nebula.xxx
├── service.impl
├── dao
├── dao.mapper
├── dao.param
├── model.entity
├── config / configuration
├── support / security / route（按复杂度扩展）
```

职责说明：

- `service.impl`：接口实现与业务编排；
- `dao`：数据库访问门面；
- `dao.mapper`：MyBatis Mapper；
- `dao.param`：面向持久化层的查询参数；
- `model.entity`：数据库实体；
- `config/configuration`：模块内部缓存定义、属性配置、自动装配；
- `support/security/route/...`：复杂业务模块的内部支撑组件。

代表例子：

- `com.cludix.nebula.dict.service.impl.DictServiceImpl`
- `com.cludix.nebula.notify.dao.NotifyTemplateDAO`
- `com.cludix.nebula.notify.dao.param.NotifyTemplatePageParam`
- `com.cludix.nebula.dict.model.entity.DictItemEntity`

### 4.3 `*-local` 的标准包

典型结构：

```text
com.cludix.nebula.xxx
├── controller
├── model.req
├── model.resp
├── local
```

职责说明：

- `controller`：REST 接口入口；
- `model.req`：入参对象，承接校验与接口协议；
- `model.resp`：出参对象，面向 HTTP 返回；
- `local`：本地模式 marker 或模式识别类。

代表例子：

- `com.cludix.nebula.dict.controller.DictController`
- `com.cludix.nebula.notify.model.req.CreateAnnouncementReq`
- `com.cludix.nebula.auth.model.resp.UserDetailResp`

### 4.4 `*-remote` 的标准包

典型结构：

```text
com.cludix.nebula.xxx
├── feign
├── impl
├── config / configuration
├── remote
```

职责说明：

- `feign`：远程调用客户端接口；
- `impl`：对 `api` 服务接口的远程代理实现；
- `config/configuration`：remote 属性与自动配置；
- `remote`：远程模式 marker。

代表例子：

- `com.cludix.nebula.dict.feign.DictFeignClient`
- `com.cludix.nebula.dict.impl.DictRemoteServiceImpl`
- `com.cludix.nebula.notify.configuration.NotifyRemoteAutoConfiguration`

### 4.5 `*-service` 的标准包

通常比较轻，主要放：

```text
com.cludix.nebula.xxx
└── NebulaXxxServiceApplication
```

职责聚焦在启动入口，不在这里堆业务逻辑。

---

## 5. 对象分类与推荐落点

Nebula 的包设计里，最容易混淆的是各种对象放在哪里。下面可以作为新增代码时的直接参考。

| 对象类型 | 推荐落点 | 说明 |
| --- | --- | --- |
| Service 接口 | `*-api/service` | 稳定契约 |
| Command | `*-api/model/command` | 写操作输入 |
| Query | `*-api/model/query` | 读操作输入 |
| DTO | `*-api/model/dto` | 跨层结果对象 |
| Req | `*-local/model/req` | Controller 入参 |
| Resp | `*-local/model/resp` | Controller 出参 |
| Entity | `*-core/model/entity` | 持久化实体 |
| DAO | `*-core/dao` | 持久化访问门面 |
| Mapper | `*-core/dao/mapper` | MyBatis Mapper |
| DAO Param | `*-core/dao/param` | DAO 查询参数 |
| 错误码/缓存名/枚举 | `*-api/constant` | 领域常量 |
| AutoConfiguration / Properties | `config` 或 `configuration` | 装配配置 |
| Feign Client | `*-remote/feign` | 远程调用接口 |

其中一个很重要的边界是：

> **Req/Resp 属于接入层对象，不应该直接替代 Command/DTO。**

从 `DictController`、`UserController` 可以看出，Nebula 的实际做法是：

- `Req -> Command/Query`
- `DTO -> Resp`

这保证了 API 契约和 Web 协议不会耦合死。

---

## 6. 常见包的实际含义

### 6.1 `model.command`

用于承载“写请求”语义，通常对应：

- create
- update
- send
- bind
- start / complete

例如：

- `CreateDictTypeCommand`
- `UpdateNotifyTemplateCommand`
- `SendNotifyCommand`

它强调的是“我要系统执行什么动作”。

### 6.2 `model.query`

用于承载“读请求”语义，通常对应：

- get by id
- page
- list
- detail

例如：

- `GetDictTypeByIdQuery`
- `PageNotifyRecordQuery`
- `PageUserQuery`

它强调的是“我要怎么查”。

### 6.3 `model.dto`

DTO 是跨层传输结果，既要避免暴露实体，也要避免携带 HTTP 协议语义。

例如：

- `DictTypeDto`
- `AnnouncementDetailDto`
- `UserDetailDto`

DTO 常被：

- local 层转成 resp；
- remote 层直接反序列化返回；
- 其他模块作为契约结果消费。

### 6.4 `model.req` 与 `model.resp`

这两个包只在 `local` 层中常见，说明它们是“接口协议对象”，不是领域对象。

例如：

- `UserPageReq` 继承或复用分页请求语义，面向 Controller；
- `UserDetailResp` 是最终返回前端的对象。

### 6.5 `model.entity`

Entity 只放在 core 中，说明它属于实现细节与持久化模型。

例如：

- `DictTypeEntity`
- `NotifyTemplateEntity`
- `AnnouncementEntity`

它们不应直接作为对外 API 契约返回。

### 6.6 `dao.param`

这是 Nebula 比较有特点的一个包位。它把“数据库查询所需参数”单独抽出来，而不直接复用 Query。

这样做的好处是：

- Query 保持面对服务契约；
- DAO Param 保持面对持久化实现；
- 中间可以自由做字段裁剪、转换、补充。

例如：

- `PageAnnouncementQuery` 是服务层查询对象；
- `AnnouncementPageParam` 是 DAO 层分页查询参数。

---

## 7. 基础设施模块的包设计

`nebula-base` 的包结构和业务模块不同，它不是围绕领域，而是围绕平台能力。

### 7.1 `nebula-base-common`

常见包：

- `common.context`
- `common.exception`
- `common.model.dto`
- `common.model.req`
- `common.model.resp`
- `common.model.web`
- `common.constant`
- `common.util`

代表对象：

- `ApiResult`
- `PageResp`
- `BasePageReq`
- `BusinessException`
- `IErrorInfo`

这说明 common 层主要负责：公共模型、异常契约、上下文、工具。

### 7.2 `nebula-base-mybatis`

常见包：

- `mybatis.entity`
- `mybatis.config`
- `mybatis.handler`
- `mybatis.id`
- `mybatis.typehandler`
- `mybatis.util`

代表对象：

- `BaseIdEntity`
- `BaseEntity`
- `TreeEntity`
- `NebulaMybatisConfig`

这说明 mybatis 子模块负责 ORM 基础设施，而不是具体业务。

### 7.3 `nebula-base-web`

常见包：

- `web.advice`
- `web.config`
- `web.filter`
- `web.wrapper`
- `web.i18n`
- `web.annotation`

代表对象：

- `ApiResultAdvice`
- `ExceptionHandlerAdvice`
- `RequestContextFilter`

这说明 web 子模块负责统一响应包装、异常处理、请求上下文等横切能力。

### 7.4 `nebula-base-cache` 与 `nebula-base-cloud`

它们也遵循类似做法，按能力域划包：

- `cache.config`
- `cache.dynamic`
- `cache.service`
- `cache.model.dto`
- `cloud.config`
- `cloud.filter`
- `cloud.interceptor`
- `cloud.support`

这说明 Nebula 对基础设施的组织原则是：

> **以能力域为一级包，以职责为二级包。**

---

## 8. 类命名与包位置的搭配规则

Nebula 的包设计和命名通常是配套出现的。

| 包 | 常见类名后缀 | 例子 |
| --- | --- | --- |
| `service` | `I...Service` | `INotifyService` |
| `service.impl` | `...ServiceImpl` | `NotifyServiceImpl` |
| `controller` | `...Controller` | `DictController` |
| `dao` | `...DAO` | `NotifyTemplateDAO` |
| `dao.mapper` | `...Mapper` | `DictTypeMapper` |
| `model.command` | `...Command` | `CreateUserCommand` |
| `model.query` | `...Query` | `PageUserQuery` |
| `model.dto` | `...Dto` / `...DetailDto` | `UserDto` |
| `model.req` | `...Req` / `...PageReq` | `CreateAnnouncementReq` |
| `model.resp` | `...Resp` / `...DetailResp` | `UserDetailResp` |
| `model.entity` | `...Entity` | `AnnouncementEntity` |
| `feign` | `...FeignClient` | `DictFeignClient` |
| `config/configuration` | `...Properties` / `...AutoConfiguration` | `NotifyRemoteProperties` |

这类命名方式的优点是：即使不打开文件，也能通过“包 + 类名”快速判断其职责。

---

## 9. 新增模块或新增包时的建议

### 9.1 优先复用现有包名，不轻易创造新术语

如果语义明确落在现有结构里，优先使用：

- `model.command`
- `model.query`
- `model.dto`
- `model.req`
- `model.resp`
- `model.entity`
- `dao`
- `dao.mapper`
- `dao.param`

避免随意扩展出：

- `vo`
- `bo`
- `po`
- `form`
- `param2`
- `wrapper`

这类不稳定命名。

### 9.2 新包必须有稳定语义边界

只有在模块复杂度明显提升时，才建议新增包，例如：

- `support`
- `security`
- `route`
- `adapter`
- `listener`

新增前最好先回答两个问题：

1. 这个包是否对应一类长期稳定职责？
2. 这个职责是否已经能被现有包表达？

### 9.3 不要让 controller 直接操作 entity

按照 Nebula 已有代码风格，应保持：

- controller 用 req/resp
- service 接口用 command/query/dto
- core 内部再处理 entity/dao

这样包边界才不会被打穿。

### 9.4 不要让 remote 复制一套新模型

remote 层应尽量复用 `api` 中已有的 command/query/dto，而不是重新建 remote 专属对象。这样才能维持真正的统一契约。

---

## 10. 推荐的包模板

如果后续新增一个 `nebula-foo` 模块，可以参考下面的包模板。

### 10.1 `nebula-foo-api`

```text
com.cludix.nebula.foo
├── service
├── model.command
├── model.query
├── model.dto
├── constant
└── configuration
```

### 10.2 `nebula-foo-core`

```text
com.cludix.nebula.foo
├── service.impl
├── dao
├── dao.mapper
├── dao.param
├── model.entity
├── configuration
└── support
```

### 10.3 `nebula-foo-local`

```text
com.cludix.nebula.foo
├── controller
├── model.req
├── model.resp
└── local
```

### 10.4 `nebula-foo-remote`

```text
com.cludix.nebula.foo
├── feign
├── impl
├── configuration
└── remote
```

### 10.5 `nebula-foo-service`

```text
com.cludix.nebula.foo
└── NebulaFooServiceApplication
```

---

## 11. 小结

Nebula 的包设计可以概括为三句话：

1. **先按业务模块划边界，再按分层职责组织包。**
2. **对象按语义落包，而不是按习惯缩写乱放。**
3. **通过统一的包位设计，保证 local / remote / core 共用一套 api 契约。**

对于维护者来说，只要掌握下面这条主线，基本就不会放错位置：

> **接口契约进 api，核心实现进 core，HTTP 协议对象进 local，远程代理进 remote，启动入口留在 service。**

这也是当前 Nebula 项目最稳定、最值得继续沿用的包组织方式。
