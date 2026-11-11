---
title: 事件观测与审计日志计划
date: 2026-10-31
tags: [nebula, event, audit, observability, plan]
---

# 事件观测与审计日志计划

本页记录两项可观测性工作的边界与计划：

1. **事件目录**：本期要做的能力，用于在前端查看系统中定义了哪些事件、每个事件被哪些监听器监听。
2. **审计日志**：当前已经具备的能力，以及本期**暂缓处理**的待办事项（含“审计动作与页面按钮绑定”的设计问题）。

> 前提：当前按单体部署使用，只考虑同一进程内的全部事件定义与监听器；不做 outbox、RocketMQ、跨服务聚合。

## 0. 待处理事项速览

| 编号 | 事项 | 优先级 | 状态 |
| --- | --- | --- | --- |
| E1 | 事件目录（复用现有菜单 + 目录接口 + 前端页面） | P0 | 本期计划 |
| E2 | 事件契约校验告警（无监听事件、孤儿监听、重复类型/消费者） | P0 | 随 E1 |
| A1 | 审计动作与页面按钮/菜单绑定 | P1 | 暂缓 |
| A2 | `audit_action` 字典种子（90 个动作中文名） | P1 | 暂缓 |
| A3 | 审计写入可靠性（事件监听失败导致静默丢记录） | P1 | 暂缓 |
| A4 | 审计覆盖度校验（写接口漏加 `@NebulaAudit`） | P1 | 暂缓 |
| A5 | 审计查询增强（时间范围、跨租户过滤） | P2 | 暂缓 |

---

## 1. 事件目录

### 1.1 现状

| 位置 | 现状 |
| --- | --- |
| 菜单 | `docs/sql/init/mysql/02-init-data.sql:733` 已种下“事件记录”，路径 `/system/monitor/event-log`，组件名 `EventLogPage` |
| 前端组件 | `web/src/route/menu-component-registry.tsx` 没有 `EventLogPage` |
| 路由行为 | 未知组件回退到 `EmptyModule`（`web/src/route/build-menu-routes.tsx:50`），页面空白 |
| 后端接口 | 原 `EventManageController` 已在 2026-07-26 的 `807a856b` 中删除；`nebula-event/README.md` 仍宣称存在 |
| 数据来源 | 事件定义与监听器关系只在启动时被收集到 dispatcher 内部列表（`nebula-event/nebula-event-core/.../NebulaEventCoreAutoConfiguration.java:61`），未暴露 |

当前仓库内共 **16 个事件定义**、**6 个生产监听器**，其中 **10 个事件在默认单体应用中没有监听器**。这些信息目前只能靠翻代码或读日志得到。

### 1.2 目标与非目标

**目标**

- 在前端查看系统中定义的全部事件类型：`eventType`、`module`、`code`、名称、描述、定义类。
- 查看每个事件的监听器：`consumerName`、handler 类、是否幂等、是否为异步、事件类型是否真实存在。
- 标出异常契约：无监听事件、监听器指向未定义事件、重复 `eventType`、重复 `consumerName`。
- 复用现有“事件记录”菜单，不新增重复入口。

**非目标**

- 不展示事件实际发布次数、监听器执行耗时、成功/失败结果。这些需要运行时埋点，属于后续独立能力。
- 不做事件历史明细、回放、重试。
- 不做跨服务聚合。

### 1.3 数据模型

建议在 `nebula-event-api` 增加目录 DTO：

```text
EventCatalogDto
├── mode                 // LOCAL / REMOTE
├── totalEvents
├── listenedEvents
├── unlistenedEvents
├── events: List<EventDefinitionDto>
└── warnings: List<EventCatalogWarningDto>

EventDefinitionDto
├── eventType            // module + "-" + code
├── module
├── code
├── name
├── description
├── eventClass
├── listened
├── listenerCount
└── listeners: List<EventListenerDto>

EventListenerDto
├── consumerName
├── eventType
├── handlerClass
├── beanName
├── idempotent
├── async
└── matchedDefinition    // 监听的事件类型是否存在对应定义

EventCatalogWarningDto
├── type                 // EVENT_WITHOUT_LISTENER / LISTENER_WITHOUT_DEFINITION /
│                        // DUPLICATE_EVENT_TYPE / DUPLICATE_CONSUMER_NAME /
│                        // PAYLOAD_TYPE_UNRESOLVED
├── eventType
├── consumerName
└── message
```

### 1.4 后端实现步骤

**Step 1：事件定义扫描**

- 事件定义类不是 Spring Bean，不能只靠 `getBeansWithAnnotation`，需要 classpath 扫描。
- 使用 `ClassPathScanningCandidateComponentProvider(false)` + `AnnotationTypeFilter(NebulaEventDefinition.class)`，兼容 Spring Boot fat jar。
- 扫描根包计算顺序：
  1. 配置项 `nebula.event.catalog.scan-packages`（逗号分隔）显式指定；
  2. Spring Boot 启动类的 `@SpringBootApplication(scanBasePackages/basePackages)`；
  3. 启动类所在包；
  4. 框架根包 `cn.cloudomni.nebula`（保证 `backend` 这类只扫描自己包的模板工程也能发现框架事件）。
- 读取 `@NebulaEventDefinition` 的 `module/code/name/description`，计算 `eventType = module + "-" + code`。

**Step 2：监听器收集**

- 从 `ApplicationContext.getBeansWithAnnotation(NebulaEventListener.class)` 获取监听器 Bean。
- 用 `AopUtils.getTargetClass` 解析真实类型，避免 `@Async`/AOP 代理丢注解。
- 解析 `consumerName`（注解值或 Bean 名）、`eventType`、`idempotent`、payload 泛型（`ResolvableType.forClass(...).as(NebulaEventHandler.class).getGeneric(0).resolve()`）。
- 判断 `@Async`：检查 `onEvent` 方法或类上的 `@Async`。

**Step 3：聚合与告警**

- 按 `eventType` 把监听器挂到事件定义下。
- 生成 warnings：
  - 事件定义没有监听器；
  - 监听器的 `eventType` 没有对应定义；
  - 两个定义类解析出相同 `eventType`；
  - 同一 `consumerName` 出现在多个监听器；
  - payload 泛型无法解析。
- 启动期通过 `ApplicationReadyEvent` 打一条 WARN 汇总；默认**不阻断启动**，这是诊断能力，不是安全边界。可选 `nebula.event.catalog.fail-on-warning` 供 CI 使用。

**Step 4：缓存**

- 目录在启动后是静态的，扫描一次后缓存不可变快照。
- 提供 `refresh()` 供后续管理端刷新；单体场景重启刷新已足够。

**Step 5：注册 Bean**

- 目录服务放 `nebula-event-core`（不依赖 Web），在 core 自动配置中注册。
- 控制器放 `nebula-event-local`，通过 `NebulaLocalEventAutoConfiguration` 的 `@ComponentScan("cn.cloudomni.nebula.event.local.controller")` 或显式 `@Bean` 注册。不能只依赖组件扫描，因为模板工程主类只扫描自己的包（`backend` 为 `cn.cloudomni.nebula.template`）。

### 1.5 接口契约

```text
GET /api/event/catalog
→ ApiResult<EventCatalogDto>
```

- 数据量小（当前 16 条），不分页。
- 按规范补 `@Tag`、`@Operation`、`@Schema`。
- 只读诊断接口，**不要加 `@NebulaAudit`**，避免打开页面就产生审计噪声。

**权限**

推荐增加 `EventApiCodes.EVENT_CATALOG_VIEW` + `@NebulaApiPermission` + `auth_api` 登记，和审计日志一致。代价是 `nebula-event-local` 需要增加 `nebula-auth-api` 依赖；`nebula-audit-local` 已有同样先例。

如果希望实现更轻，也可以按现有“管理端读接口免权限”的约定不加码，只靠菜单权限控制；但任何已登录用户知道 URL 就能读取系统内部事件结构，防御弱一层。

### 1.6 前端实现

| 文件 | 内容 |
| --- | --- |
| `web/src/types/event-catalog.ts` | 目录类型定义 |
| `web/src/services/event-catalog.ts` | `GET /api/event/catalog` 请求封装 |
| `web/src/pages/system/monitor/event-log/index.tsx` | 页面入口 |
| `web/src/pages/system/monitor/event-log/components/event-catalog-table.tsx` | 事件表格 |
| `web/src/pages/system/monitor/event-log/components/event-listener-drawer.tsx` | 监听器详情抽屉 |
| `web/src/i18n/locales/{zh-CN,en-US}/event-catalog.ts` | 文案 |
| `web/src/route/menu-component-registry.tsx` | 注册 `EventLogPage` |

页面结构：

1. 顶部统计卡：事件总数、已监听、未监听、孤儿监听。
2. 有 warning 时展示 `Alert`，按类型分组。
3. 事件表格：事件类型、模块、名称、描述、监听器数量、状态（已监听 / 无监听）、操作（查看监听器）。
4. 展开行或抽屉：监听器列表，显示 `consumerName`、handler 类、幂等、异步、匹配状态。
5. 筛选：按模块、事件类型、名称、是否已监听；数据量小，前端过滤即可。

### 1.7 菜单、权限与 SQL

**菜单**

复用现有菜单，不新增：

- code：`system-monitor-event-log`（保持不变）
- path：`/system/monitor/event-log`（保持不变）
- component：`EventLogPage`（保持不变）
- 显示名：建议“事件记录” → **“事件目录”**，因为本期不含历史记录。

需要同步的位置：

- `docs/sql/init/mysql/02-init-data.sql`、`docs/sql/init/postgresql/02-init-data.sql`
- `docs/sql/unreleased/{mysql,postgresql}/` 新增增量脚本，更新存量库菜单名称

**权限**

如果采用 `EVENT_CATALOG_VIEW`：

- 在 `nebula-event-api` 增加 `EventApiCodes`；
- 控制器方法加 `@NebulaApiPermission(EventApiCodes.EVENT_CATALOG_VIEW)`；
- 在 `auth_api` 的初始化数据与增量脚本中登记同名 code；
- 给 `nebula-event-local` 增加 `nebula-auth-api` 依赖。

### 1.8 测试与验收

**后端测试**

- `NebulaEventCatalogServiceTest`：
  - 正常事件 + 监听器 → `listened=true`；
  - 无监听事件 → `listened=false` + warning；
  - 监听器指向不存在事件 → `LISTENER_WITHOUT_DEFINITION`；
  - 重复 `eventType`、重复 `consumerName` → 对应 warning。
- `EventCatalogControllerTest`：MockMvc 验证接口返回结构与权限。

**前端测试**

- `web/src/pages/system/monitor/event-log/index.test.tsx`：
  - 统计卡数值；
  - 无监听事件标记；
  - warning 展示；
  - 打开监听器抽屉。

**验收标准**

- 菜单可以打开，页面不再空白。
- 列出当前全部 16 个事件定义和 6 个监听器。
- 无监听事件和孤儿监听被明确标记。
- 页面不产生数据库写入，不产生审计记录。
- `nebula-app` 与模板工程 `backend` 都能访问。
- 非授权用户调用接口被拒绝（如果启用 API 权限码）。

### 1.9 实施顺序与工作量

| 阶段 | 内容 | 预估 |
| --- | --- | --- |
| 0 | 确认菜单命名、权限策略、扫描根包 | 0.5 天 |
| 1 | `nebula-event-api` DTO + `nebula-event-core` 扫描/聚合/告警/缓存 | 1 天 |
| 2 | `nebula-event-local` 控制器、响应对象、converter、自动配置注册 | 0.5 天 |
| 3 | 菜单/权限 SQL（init + unreleased） | 0.5 天 |
| 4 | 前端类型、service、页面、i18n、组件注册 | 1 天 |
| 5 | 单元测试、接口测试、前端测试、双应用验证 | 1 天 |
| 合计 |  | 约 4~5 天 |

### 1.10 风险与待确认

- **扫描根包**：不同接入形态的主类包不同；必须支持 `nebula.event.catalog.scan-packages` 兜底。
- **fat jar 扫描**：使用 Spring 的扫描器，不要手写文件遍历。
- **AOP 代理**：监听器注解必须解析目标类。
- **启动快照**：运行期新增/销毁 Bean 不会自动反映，需要重启或手动刷新。
- **重复事件类型**：不同模块定义了相同 `module + code` 时只告警，不阻断启动。
- **决策待定**：接口是否加 `EVENT_CATALOG_VIEW` 权限码；菜单显示名是“事件目录”还是“事件管理”。

---

## 2. 审计日志：暂缓事项

### 2.1 当前能力

审计日志不是缺失能力，现状如下：

| 能力 | 现状 |
| --- | --- |
| 采集入口 | `@NebulaAudit` 注解 + `NebulaAuditAspect` 切面 |
| 覆盖范围 | 90 处注解，覆盖 auth、dict、frontend、notify、param、scheduler、storage 七个模块的写操作 |
| 采集内容 | 操作人、personId、操作者租户、目标租户、模块、动作、资源、请求参数、响应数据、IP、成功/失败、错误信息 |
| 脱敏与截断 | 默认脱敏敏感字段；快照按 `audit.request.max.length` / `audit.response.max.length` 截断，默认 4000 |
| 落库 | 默认走事件总线：`audit-recorded` → `AuditRecordHandler` → `audit_record`；无事件发布器或 `event-enabled=false` 时直写库 |
| 查询接口 | `POST /api/audit/records/page`、`GET /api/audit/records/{id}` |
| 前端 | `/system/monitor/audit-log`，支持模块、动作、操作人、资源、IP、结果状态筛选；详情带 JSON 查看 |
| 权限 | 菜单 `system-monitor-audit-log`；接口权限码 `AUDIT_RECORD_VIEW` |
| 保留 | 每天 2:30 清理，默认 180 天，参数 `audit.retention.days` |

因此审计日志**本期不实现**，只记录以下待办。

### 2.2 A1：审计动作与页面按钮/菜单绑定

**问题**

当前 `audit_action` 是一个独立的字典类型，只保存“动作编码 → 中文名称”的映射；`auth_button` 保存的是“菜单下的操作按钮”。两者之间没有关联：

- `auth_button` 只有 `menu_id`、`code`、`name`、`type`，没有指向审计动作或 API 的字段；
- `audit_record` 只有 `module`、`action`、`resourceType`、`resourceId`，没有 `menuCode`、`buttonCode`、`pagePath`；
- 前端审计页只能按动作编码筛选和显示，无法回答“这个操作来自哪个页面、哪个按钮”。

因此只补 `audit_action` 字典种子，只能解决“显示中文”，不能解决“动作绑定到页面按钮”。审计动作需要和页面按钮建立明确关系。

**可选方向**

| 方向 | 做法 | 优点 | 代价 |
| --- | --- | --- | --- |
| 方向 A | 给 `audit_record` 增加 `menu_code`、`button_code`、`page_path`（可空），在 `@NebulaAudit` 上增加 `buttonCode/menuCode` 或从请求上下文解析 | 改动集中，审计页可按页面/按钮筛选；不要求每个动作都有按钮 | 需要给 90 处注解补属性，或做路径→按钮解析 |
| 方向 B | 让审计动作直接引用 `auth_button.code`，`audit_action` 字典与按钮合并 | 按钮、权限、审计三者同源 | 并非所有审计动作都有页面按钮（定时任务、签名下载、上传等） |
| 方向 C | 新增 `audit_action` ↔ `auth_button` 映射表 | 不动现有表结构，灵活 | 多一张表，需要维护映射 |

**推荐方向：A + C 的混合**

- `audit_record` 增加可空的 `menu_code`、`button_code`、`page_path`；
- 有页面按钮的动作，在 `@NebulaAudit` 上显式声明 `buttonCode/menuCode`，或通过请求路径 + 菜单/按钮注册表解析；
- 无页面按钮的系统动作（定时任务、签名下载、上传）保持为空；
- `audit_action` 字典继续负责“动作编码 → 中文名称”，不承担页面归属；
- 审计页增加“页面/按钮”筛选与展示；
- 覆盖度校验时，UI 触发的写动作应有 `buttonCode`，系统动作可豁免。

**待确认**

- 是否所有审计动作都必须绑定按钮？如果不是，如何区分 UI 动作与系统动作？
- 按钮绑定是从注解显式声明，还是从请求路径自动解析？
- 是否需要把审计动作的授权也纳入 `auth_button`（即“没有按钮权限就不能触发该动作”）？

### 2.3 A2：`audit_action` 字典种子

当前 `docs/sql/init/mysql/02-init-data.sql:1139` 只登记了字典类型 `audit_action`，没有登记任何字典项。前端 `useAuditActionDictionary` 找不到 label 时会回退显示原始动作码（如 `CREATE_USER`）。

待办：

- 把 90 个动作编码的中文名称补进 `sys_dict_item`（`dict_code='audit_action'`）；
- MySQL / PostgreSQL 初始化脚本同步；
- 存量库用 `docs/sql/unreleased/{mysql,postgresql}/` 增量脚本补齐；
- 新增审计动作时同步补字典项，或由启动期校验提示缺失。

### 2.4 A3：审计写入可靠性

默认 `nebula.audit.local.event-enabled=true`，审计记录通过 `audit-recorded` 事件交给 `AuditRecordHandler` 落库。单体默认 `CONTINUE_ON_ERROR`，监听器抛异常时只打 error 日志，请求继续成功，**审计记录静默丢失**。

待办：

- 为审计写入失败增加指标/告警；
- 或对强一致要求高的场景关闭事件模式，直写库（`nebula.audit.local.event-enabled=false`）；
- 或在 `AuditRecordHandler` 失败时降级为直写库兜底；
- 在事件目录中确保 `audit-recorded → AuditRecordHandler` 可见，作为该链路的诊断入口。

### 2.5 A4：审计覆盖度校验

当前覆盖度靠人工添加 `@NebulaAudit`，没有全局校验。新增写接口忘记加注解不会报错。

待办：

- 从 `RequestMappingHandlerMapping` 扫描所有 POST/PUT/DELETE/PATCH；
- 没有 `@NebulaAudit` 且不在白名单的端点，启动期 WARN 或测试期失败；
- 白名单需说明理由（例如登录、验证码等不需要审计的入口）。

### 2.6 A5：审计查询增强

待办：

- 增加时间范围筛选（`startTime` / `endTime`）；
- 增加 `operatorTenantId` / `targetTenantId` 筛选，支持平台管理员跨租户查询；
- 按需增加导出能力。

---

## 3. 决策记录

| 日期 | 决策 | 状态 |
| --- | --- | --- |
| 2026-10-31 | 事件目录复用现有“事件记录”菜单，不新增入口 | 已定 |
| 2026-10-31 | 本期只做静态目录，不做运行时耗时/历史明细 | 已定 |
| 2026-10-31 | 审计日志整体暂缓，先记录待办 | 已定 |
| 待定 | 事件目录接口是否加 `EVENT_CATALOG_VIEW` 权限码 | 待确认 |
| 待定 | 审计动作与按钮绑定的具体实现方向（A/B/C） | 待确认 |
