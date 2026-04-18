# Nebula 分层设计

## 1. 设计目标

Nebula 的分层设计不是单纯的 `controller -> service -> dao` 三层结构，而是围绕“**模块边界稳定**、**支持单体接入**、**支持远程调用**、**支持独立服务化部署**”这几个目标构建的。

从根 `pom.xml` 与各业务模块结构来看，Nebula 采用的是：

- 根聚合工程统一管理所有能力模块；
- 每个领域模块内部再按 `api / core / local / remote / service` 进行拆分；
- 基础设施能力由 `nebula-base`、`nebula-event` 等通用模块下沉；
- 业务应用既可以通过 `*-local` 以单体方式接入，也可以通过 `*-remote` 消费独立部署的服务。

这意味着 Nebula 的分层，本质上是一种“**模块化分层 + 接入模式分层 + 部署形态分层**”的组合设计。

---

## 2. 总体分层视图

可以把 Nebula 的总体结构理解为下面几层：

```text
┌──────────────────────────────────────────────┐
│ 应用与运行入口层                              │
│ nebula-app / *-service / nebula-gateway      │
├──────────────────────────────────────────────┤
│ 业务模块接入层                                │
│ *-local / *-remote                           │
├──────────────────────────────────────────────┤
│ 业务能力核心层                                │
│ *-core                                       │
├──────────────────────────────────────────────┤
│ 业务契约层                                    │
│ *-api                                        │
├──────────────────────────────────────────────┤
│ 基础设施层                                    │
│ nebula-base / nebula-event / dependency      │
└──────────────────────────────────────────────┘
```

各层职责如下：

### 2.1 基础设施层

这一层主要由以下模块组成：

- `nebula-dependency`：统一三方依赖版本；
- `nebula-base`：提供通用对象、Web、MyBatis、缓存、云调用等基础能力；
- `nebula-event`：提供本地事件、Outbox、Relay、RocketMQ 等事件能力。

这一层不承载具体业务，而是为所有业务模块提供共用支撑。

### 2.2 业务契约层

对应各领域模块中的 `*-api`，例如：

- `nebula-dict-api`
- `nebula-notify-api`
- `nebula-auth-api`
- `nebula-comms-api`

这一层主要定义：

- 对外服务接口，如 `IDictService`、`INotifyService`；
- 命令对象 `model.command`；
- 查询对象 `model.query`；
- 结果对象 `model.dto`；
- 常量、错误码、模块守卫与装配约束。

这层的核心价值是“**稳定契约**”。无论底层是本地实现还是远程实现，对上层依赖者来说，看到的都是同一套接口与模型。

### 2.3 业务能力核心层

对应各领域模块中的 `*-core`，例如：

- `nebula-dict-core`
- `nebula-notify-core`
- `nebula-auth-core`
- `nebula-comms-core`

这一层承载真正的业务实现，通常包括：

- `service.impl`：领域服务实现；
- `dao`、`dao.mapper`、`dao.param`：持久化访问；
- `model.entity`：数据库实体；
- `configuration` / `config`：缓存、属性、自动装配等内部配置；
- 复杂模块中的 adapter、support、security、route 等支撑实现。

例如：

- `DictServiceImpl` 在 core 层中实现了 `IDictService`；
- `NotifyServiceImpl` 在 core 层中编排公告、模板、记录、站内信等逻辑；
- `CommsServiceImpl` 在 core 层中做平台路由与统一通信抽象落地。

### 2.4 业务模块接入层

这一层分为两种模式：

#### `*-local`

用于单体集成，典型内容包括：

- `controller`
- `model.req`
- `model.resp`
- 本地模式标记类（如 `DictLocalMarker`）

其职责是：

- 暴露 HTTP 接口；
- 将请求对象 `req` 转为 `command/query`；
- 调用 `api` 层接口；
- 将 `dto` 转为 `resp`。

例如 `DictController` 就非常典型：

- 入参使用 `CreateDictTypeReq`、`DictTypePageReq`；
- 中间转换成 `CreateDictTypeCommand`、`PageDictTypeQuery`；
- 调用 `IDictService`；
- 最终返回 `ApiResult<PageResp<...>>`。

#### `*-remote`

用于微服务消费者，典型内容包括：

- `feign`
- `impl`
- `config` / `configuration`
- `remote` marker

其职责是：

- 基于 Feign 或远程调用封装实现 `api` 层接口；
- 对远程响应进行统一解包与分页恢复；
- 让业务方依旧面向同一个服务接口编程。

例如 `DictRemoteServiceImpl` 也实现了 `IDictService`，但内部是通过 `DictFeignClient` 远程调用字典服务。

因此，Nebula 的一个关键设计点是：

> **local 和 remote 都是对同一个 api 契约的两种实现，而不是两套独立业务模型。**

### 2.5 应用与运行入口层

这一层主要包含：

- `nebula-app`：默认组合式应用入口；
- 各业务模块 `*-service`：独立微服务启动入口；
- `nebula-gateway`：统一网关与文档聚合入口。

它们负责把上面的能力真正装配成可运行应用。

其中：

- `nebula-app-starter` 更偏向“单体集成入口”；
- `nebula-auth-service`、`nebula-dict-service` 等更偏向“独立服务入口”；
- `nebula-gateway-service` 则负责统一路由和 API 文档聚合。

---

## 3. 典型业务模块的标准分层

从 `dict`、`notify`、`comms`、`auth` 等模块看，Nebula 已经形成了比较稳定的标准结构：

```text
nebula-xxx/
├── nebula-xxx-api
├── nebula-xxx-core
├── nebula-xxx-local
├── nebula-xxx-remote
└── nebula-xxx-service
```

各子模块职责如下。

### 3.1 `api`：稳定契约层

主要解决“别人怎么依赖我”的问题。

通常放置：

- `service` 接口
- `model.command`
- `model.query`
- `model.dto`
- `constant`
- `config` 或 `configuration` 中的模块守卫

适合依赖方：

- 其他业务模块
- `local` 层
- `remote` 层
- 对外的公共 SDK 式调用方

### 3.2 `core`：领域实现层

主要解决“能力怎么实现”的问题。

通常放置：

- `service.impl`
- `dao`
- `dao.mapper`
- `dao.param`
- `model.entity`
- 内部配置与业务支撑类

适合依赖方：

- `local`
- `service`
- 少量必要的内部装配模块

不建议由外部业务模块直接绕过 `api` 去依赖 `core` 暴露能力。

### 3.3 `local`：本地接入层

主要解决“单体模式下怎么被 Web 应用直接使用”的问题。

通常放置：

- `controller`
- `model.req`
- `model.resp`
- local marker

它与 `core` 搭配后，可以直接提供单体 REST 能力。

### 3.4 `remote`：远程代理层

主要解决“能力独立部署后，其他服务怎么复用”的问题。

通常放置：

- Feign Client
- 接口代理实现
- 远程配置属性
- AutoConfiguration

这让调用方在代码层仍然依赖 `IDictService`、`INotifyService` 这类接口，而不必关心底层调用位置。

### 3.5 `service`：独立服务启动层

主要解决“这个模块如何单独跑起来”的问题。

通常放置：

- Spring Boot 启动类
- 服务配置文件
- 服务端口、注册、连接组件配置

这一层不承载核心业务逻辑，而是负责运行时装配。

---

## 4. 单体模式与微服务模式的分层差异

Nebula 的分层不是静态的，它会随着部署方式切换。

### 4.1 单体模式

单体模式下，常见依赖关系是：

```text
Controller(req/resp)
    -> API(command/query/dto + service interface)
        -> Core(service impl + dao + entity)
```

此时：

- 应用直接引入 `*-local`；
- `local` 通过 Spring 条件装配启用本地实现；
- `core` 中的 `service.impl` 直接执行业务与持久化。

### 4.2 微服务模式

微服务模式下，调用方与提供方会分离：

```text
消费方 Controller / Service
    -> API(service interface)
        -> Remote(Feign proxy)
            -> Provider Local Controller
                -> API
                    -> Core
```

此时：

- 消费方依赖 `*-remote`；
- 提供方独立运行 `*-service`；
- provider 的 `local + core` 对外提供接口；
- consumer 的 `remote` 作为代理实现相同的服务接口。

这种设计确保：

- 业务调用代码几乎不需要因为“本地/远程”切换而大改；
- 模块可以先单体落地，再逐步拆服务；
- `api` 成为本地与远程的统一协议边界。

---

## 5. 模块间依赖原则

Nebula 当前结构体现出几个清晰的依赖原则。

### 5.1 业务模块优先依赖基础设施层与 api 层

推荐依赖顺序：

- 先依赖 `nebula-base-*` 这类基础设施；
- 再依赖目标领域模块的 `*-api`；
- 根据运行方式选择 `*-local` 或 `*-remote`。

### 5.2 `api` 不依赖 `core`

`api` 是契约边界，应保持轻量与稳定。它可以放：

- DTO
- 命令
- 查询
- 常量
- 接口

但不应该反向依赖 `core` 的实现细节。

### 5.3 `local` 与 `remote` 是平行接入层

两者都依赖 `api`，但服务于不同场景：

- `local`：本地直连；
- `remote`：远程代理。

两者不是上下级关系，而是“同一契约的两种接入实现”。

### 5.4 `service` 是运行时装配层，不承载业务沉淀

业务逻辑应该落在 `core`，而不是塞在 `service` 启动模块里。这样才能保证：

- 本地接入与独立服务复用同一套核心实现；
- 测试与演进更稳定；
- 后续切换部署方式时成本更低。

---

## 6. 与传统三层架构的对应关系

如果从更熟悉的传统三层角度理解，Nebula 可以粗略映射为：

| 传统分层 | Nebula 中的主要落点 |
| --- | --- |
| Controller / Adapter 层 | `*-local`、部分 `*-remote` |
| Service / Domain 层 | `*-api` + `*-core` |
| Repository / Persistence 层 | `*-core` 中的 `dao` / `mapper` / `entity` |
| Application Boot 层 | `nebula-app`、`*-service` |
| Infrastructure 层 | `nebula-base`、`nebula-event`、`nebula-dependency` |

因此，Nebula 并不是抛弃三层，而是在三层之上增加了：

- 模块化边界；
- 本地 / 远程接入切换；
- 服务化部署入口。

---

## 7. 新增业务模块时的分层建议

如果后续在 Nebula 中新增一个标准业务模块，建议优先沿用现有分层。

推荐结构：

```text
nebula-foo/
├── nebula-foo-api
├── nebula-foo-core
├── nebula-foo-local
├── nebula-foo-remote
└── nebula-foo-service
```

建议原则：

1. **先定义 api，再写 core**
   - 先明确服务接口、命令、查询、DTO；
   - 再实现核心逻辑。

2. **local 只处理接入转换，不吞业务逻辑**
   - req -> command/query
   - dto -> resp
   - 真正业务留在 core。

3. **remote 复用 api 契约，不另起一套对象系统**
   - 避免出现“本地一套 DTO、远程再一套 DTO”的重复设计。

4. **service 保持瘦启动**
   - 只负责 Spring Boot 装配、配置与运行入口。

5. **基础能力优先复用 nebula-base / nebula-event**
   - 不重复造响应包装、异常体系、分页对象、缓存封装、远程调用基础类。

---

## 8. 小结

Nebula 的分层设计有三个关键词：

- **模块化**：每个业务域都是独立聚合模块；
- **契约优先**：通过 `api` 保持本地与远程调用的一致性；
- **可切换部署**：通过 `local / remote / service` 同时支持单体与微服务形态。

对于文档阅读者来说，理解 Nebula 分层的关键不是只盯着某一个 `controller` 或 `service`，而是先建立下面这个认知：

> **Nebula 的基本单元不是单个类，而是“一个领域模块 + 一组标准子模块”。**

掌握这一点后，再去看 `auth`、`dict`、`notify`、`comms` 等模块，结构就会非常清晰。
