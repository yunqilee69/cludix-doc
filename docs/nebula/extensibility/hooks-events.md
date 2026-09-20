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

> Auth、Storage、Frontend 模块目前**不提供**写操作 Hook。这些模块的可扩展入口只有领域事件。

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
