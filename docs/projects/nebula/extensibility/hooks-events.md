---
title: 扩展点与领域事件清单
date: 2026-09-20
tags: [nebula, extensibility, hook, event, architecture]
---

# 扩展点与领域事件清单

本页按模块列出 nebula 当前对外暴露的全部扩展点。

- **同步 Hook（SPI）**：写操作前后在**同一事务内**回调，用于校验、联动、拦截
- **领域事件**：写操作成功后发布，用于跨模块通知、缓存刷新等异步场景

## 1. Hook 扩展点

Hook 是标准的 Spring Bean。业务侧声明自己的实现后，框架自动使用业务实现；未声明时由框架注册 `Noop*` 空实现兜底，因此接入是可选动作，不影响开箱可用。

当前只有 **Param** 和 **Dict** 两个模块提供写操作 Hook。

### Param 模块

接口：`cn.cloudomni.nebula.param.hook.SystemParamOperationHook`（空实现基类 `NoopSystemParamOperationHook`）

| Hook | 入参 |
| --- | --- |
| `beforeCreateSystemParam` | `CreateSystemParamCommand` |
| `afterCreateSystemParam` | `SystemParamDetailDto` |
| `beforeUpdateSystemParam` | `UpdateSystemParamCommand`、更新前的 `SystemParamDetailDto` |
| `afterUpdateSystemParam` | `SystemParamDetailDto` |
| `beforeSaveOrUpdateSystemParamByKey` | `SaveOrUpdateSystemParamByKeyCommand`、更新前的 `SystemParamDetailDto` |
| `afterSaveOrUpdateSystemParamByKey` | `SystemParamDetailDto`、`created`（是否为新建） |
| `beforeDeleteSystemParam` | `SystemParamDetailDto` |
| `afterDeleteSystemParam` | `SystemParamDetailDto` |
| `beforeBatchUpdateParamValues` | `List<ParamValueUpdateItem>` |
| `afterBatchUpdateParamValues` | `List<ParamValueUpdateItem>` |

### Dict 模块

接口：`cn.cloudomni.nebula.dict.hook.DictOperationHook`（空实现基类 `NoopDictOperationHook`）

字典类型与字典项是两套独立的 Hook 方法：

| 对象 | Hook |
| --- | --- |
| 字典类型 | `beforeCreateDictType` / `afterCreateDictType` |
| 字典类型 | `beforeUpdateDictType` / `afterUpdateDictType` |
| 字典类型 | `beforeDeleteDictType` / `afterDeleteDictType` |
| 字典项 | `beforeCreateDictItem` / `afterCreateDictItem` |
| 字典项 | `beforeUpdateDictItem` / `afterUpdateDictItem` |
| 字典项 | `beforeDeleteDictItem` / `afterDeleteDictItem` |

> Auth、Storage、Frontend、Notify 模块目前**不提供**写操作 Hook。这些模块的可扩展入口只有领域事件，以及下方「其它 SPI 扩展点」。

### 其它 SPI 扩展点（非 Hook）

除写操作 Hook 外，模块还暴露两个**策略型 SPI**。它们的共同特点是：**没有 `Noop*` 空实现兜底**——未提供实现时要么走框架默认策略，要么明确失败。

#### Notify：推送发送器 `PushChannelSender`

接口：`cn.cloudomni.nebula.notify.service.PushChannelSender`

```java
public interface PushChannelSender {
    String vendor();                                              // 路由键，见 NotifyPushVendors
    PushSendResult send(PushMessage message, NotifyPushDeviceDto device);
}
```

- 实现要求：单台失败**不抛异常**而返回 `PushSendResult`；token 失效置 `invalidToken=true`；**未配置凭据的实现不注册为 Bean**；凭据只走环境变量；收集注入需容忍空列表。
- 框架内置实现：`ApnsPushChannelSender`（iOS APNs），**仅在推送总开关打开且四项 APNs 凭据齐备时注册**，缺任一即不注册。
- **没有兜底实现**：某 vendor 没有对应发送器时，投递记 `PROVIDER_NOT_CONFIGURED`（不会静默成功）。当前没有 Android / 鸿蒙发送器。
- 扩展点用途：接入 Android 厂商通道（HMS / 小米 / OPPO / vivo / 荣耀）或聚合通道。

#### Auth：客户端作用域判定 `IClientScopeResolver`

接口：`cn.cloudomni.nebula.auth.service.IClientScopeResolver`（详见 [Auth · 客户端接口面准入](../auth/client-scope)）

- 责任链模式，按 `@Order` 升序取首个非 null 结果。
- 框架默认实现 `DefaultClientScopeResolver` 恒返回 `INTERNAL`（不限制），业务侧提供 Resolver 才能把某类账号判为受限作用域。
- 实现类**必须**显式声明 `< Ordered.LOWEST_PRECEDENCE` 的 `@Order`，否则启动期失败。

> **通知订阅偏好不是扩展点**：类别是**可管理数据**（表 `sys_notify_category`，管理员可在「通知类别」页增删改），但没有提供 SPI——类别判定逻辑固定在 `NotifyPreferenceServiceImpl`，接入方通过维护类别数据（而非实现接口）来调整行为。内置 5 个类别（`NotifyCategoryTypes` 常量）之所以收敛且不可删，是因为移动端（Android 8.0+ / HarmonyOS）的通知渠道一旦创建，用户即拥有完全控制权，渠道 ID 必须稳定且与内置类别一一对应；自定义类别不新建系统渠道，推送时回退 `DEFAULT`。

## 2. 领域事件

事件类型（`eventType`）由注解 `@NebulaEventDefinition` 的 `module` 与 `code` 拼成，格式为 `module-code`。

| 模块 | eventType | 事件类 | 说明 |
| --- | --- | --- | --- |
| Param | `param-created` | `SystemParamCreatedEvent` | 系统参数已创建 |
| Param | `param-updated` | `SystemParamUpdatedEvent` | 系统参数已更新 |
| Param | `param-deleted` | `SystemParamDeletedEvent` | 系统参数已删除 |
| Dict | `dict-typeCreated` | `DictTypeCreatedEvent` | 字典类型已创建 |
| Dict | `dict-typeUpdated` | `DictTypeUpdatedEvent` | 字典类型已更新 |
| Dict | `dict-typeDeleted` | `DictTypeDeletedEvent` | 字典类型已删除 |
| Dict | `dict-itemCreated` | `DictItemCreatedEvent` | 字典项已创建 |
| Dict | `dict-itemUpdated` | `DictItemUpdatedEvent` | 字典项已更新 |
| Dict | `dict-itemDeleted` | `DictItemDeletedEvent` | 字典项已删除 |
| Auth | `auth-userLogin` | `UserLoginEvent` | 用户登录事件 |
| Auth | `auth-userCreated` | `UserCreatedEvent` | 用户创建事件（用户名注册、手机号 / 邮箱首次登录建号、OAuth2 自动开通、后台建号，payload 带 `source` 区分来源） |
| Auth | `auth-passwordReset` | `UserPasswordResetEvent` | 用户密码重置事件 |
| Auth | `auth-permissionChanged` | `UserPermissionChangedEvent` | 用户权限变更事件 |
| Storage | `storage-upload-task-bound` | `StorageUploadTaskBoundEvent` | 上传任务绑定完成 |
| Audit | `audit-recorded` | `AuditRecordedEvent` | 审计记录事件 |

注意 Dict 的事件 code 是**驼峰**（`typeCreated`），拼出来的 eventType 是 `dict-typeCreated` 而不是 `dict-type-created`，写监听器时不要漏掉大小写。

## 3. 对外发布事件

业务侧要发布自己的事件，注入 `NebulaEventPublisher` 即可。事件类需继承 `AbstractNebulaEvent` 并标注 `@NebulaEventDefinition`。

```java
@NebulaEventDefinition(
        module = "order",
        code = "paid",
        name = "订单已支付",
        description = "订单支付成功后发布"
)
public class OrderPaidEvent extends AbstractNebulaEvent<OrderPaidEvent.Payload> {

    public OrderPaidEvent(String aggregateId, String traceId, Payload payload) {
        super(aggregateId, traceId, payload);
    }

    public record Payload(String orderId, BigDecimal amount) {
    }
}
```

```java
nebulaEventPublisher.publish(new OrderPaidEvent(orderId, traceId, new OrderPaidEvent.Payload(orderId, amount)));
```

框架会自动补全 `eventId`、`occurredAt`、`orderingKey`（缺省取 `aggregateId`）和 `idempotencyKey`（缺省取 `eventId`）。

## 4. 实现 Hook

继承 `Noop*` 基类并声明为 Spring Bean，只覆写关心的方法。`before*` 抛出 `BusinessException` 会中止本次写操作并回滚。

```java
@Component
public class MemberLevelParamHook extends NoopSystemParamOperationHook {

    @Override
    public void beforeUpdateSystemParam(UpdateSystemParamCommand command, SystemParamDetailDto existing) {
        if ("member.level.max".equals(existing.getParamKey())
                && Integer.parseInt(command.getParamValue()) < currentUsedMaxLevel()) {
            throw new BusinessException("会员等级上限不能低于当前已使用的最高等级");
        }
    }
}
```

## 5. 监听领域事件

标注 `@NebulaEventListener(eventType = ...)` 并实现 `NebulaEventHandler<Payload>`。框架负责反序列化 payload、幂等包装和消费日志，业务侧只需处理业务逻辑。

```java
@Slf4j
@Component
@RequiredArgsConstructor
@NebulaEventListener(eventType = "param-updated")
public class ParamUpdatedCacheHandler implements NebulaEventHandler<SystemParamUpdatedEvent.Payload> {

    private final ParamCache paramCache;

    @Override
    public void onEvent(NebulaEventContext context, SystemParamUpdatedEvent.Payload payload) {
        paramCache.evict(payload.paramKey());
    }
}
```

`@NebulaEventListener` 支持两个可选属性：

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| `consumerName` | `""` | 消费者名称，用于记录幂等消费状态；同一事件有多个消费者时应显式区分 |
| `idempotent` | `true` | 是否启用幂等消费包装 |

需要异步执行时，在 `onEvent` 上叠加 Spring 的 `@Async`（参见 `UserLoginEventHandler`）。

## 相关配置

事件行为由 `nebula.event.*` 控制，常用项：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `nebula.event.local.publish-after-commit` | `true` | 存在活跃事务时，延迟到事务提交后再分发本地事件 |
| `nebula.event.local.async-enabled` | `false` | 本地事件是否异步分发 |
| `nebula.event.local.failure-policy` | `CONTINUE_ON_ERROR` | 分发失败策略 |
| `nebula.event.consumer.dedup-enabled` | `true` | 是否启用消费去重 |
| `nebula.event.consumer.default-idempotent` | `true` | 监听器未显式声明时的默认幂等开关 |
| `nebula.event.remote.relay-enabled` | `true` | 是否启用远程事件转发 |

## 推荐阅读

- [扩展点与领域事件总览](./index.md)
- 各模块 `design-and-implementation.md` 中的扩展点章节
- `@NebulaEventListener`、`NebulaEventHandler` 位于 `nebula-event-api` 模块
