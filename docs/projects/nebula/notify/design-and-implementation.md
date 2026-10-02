---
title: Nebula Notify 设计与实现
date: 2026-10-02 10:25
tags: [nebula, notify, guide]
---

# Nebula Notify 设计与实现

本文说明 `nebula-notify` 的关键设计：模板/变体/记录三层数据关系、渠道分发结构、站内信与推送的关系、订阅偏好判定优先级、推送扇出。

## 1. 三层数据关系

```text
sys_notify_template (1)
   ├── (N) sys_notify_template_field     自定义字段（参数校验）
   └── (N) sys_notify_template_variant   每个通道一条变体（内容模板）

发送时按通道取变体渲染
   └── (1) sys_notify_record             每次「通道 × 接收人」投递一条
             ├── SITE → sys_site_message（站内信载体）
             └── PUSH → sys_notify_push_record_detail (N) 逐设备明细
```

- **模板**回答「发什么」，**变体**回答「每个通道怎么发」，**记录**回答「发了没有、结果如何」。
- 记录是**投递维度**：同一次 `sendNotify` 走 2 个通道、3 个用户，落多条记录。
- 明细只在推送通道出现（一台设备一条），站内信没有明细表。

## 2. 渠道分发结构

发送时按 `channelTypes` 逐通道处理：

- **用户维度通道**（`USER_CHANNELS = [SITE, EMAIL, PUSH]`）：对每个 `receiverUserId` 渲染并投递，因此参与订阅偏好判定。
- **群机器人通道**（`WECOM/FEISHU/DINGTALK_GROUP_WEBHOOK`）：按 `channelTargetIds` 取渠道目标端点投递，无接收用户，不参与偏好判定。

当前分发是**固定的分支结构**，尚未抽象成 SPI——群机器人各家的报文差异较小，抽象收益不足以抵消成本。推送侧则已经抽象成扩展点（见 §6）。

## 3. 站内信与推送的关系

- **站内信是记录，推送是提醒**。`SITE` 渠道投递后额外落一条 `sys_site_message`，它永远参与、永不参与偏好判定——用户不能关闭站内信。
- 推送受用户偏好约束：用户在系统设置关掉通知权限只跳过推送（原因 `NOTIFICATION_DISABLED`），站内信照常。
- 被抑制的通道**仍落一条 `sys_notify_record`**，带 `category_code`、`send_status=SUPPRESSED` 与 `fail_reason`。这是「通知没到」可归因的关键：能区分是偏好挡住、没设备、权限被关、通道没配，还是厂商拒绝。

## 4. 订阅偏好判定优先级（最重要）

发送时对每个「用户 × 类别 × 渠道」调用 `INotifyPreferenceService.resolveBatch`，判定顺序**固定如下**，不可调换：

| 顺序 | 条件 | 结果 |
| --- | --- | --- |
| 1 | 渠道为 `SITE` | **放行**（站内信永不参与偏好过滤，最先判定） |
| 2 | 渠道不在类别 `allowedChannels` 内 | **抑制**，原因 `CHANNEL_NOT_ALLOWED`（与用户偏好无关） |
| 3 | 类别 `mandatory=true`（`SECURITY`） | **放行**（忽略用户偏好） |
| 4 | 有用户记录 → 取记录 `enabled`；无记录 → 取类别 `defaultEnabled` | 依值决定 |

补充规则：

- 判定过程异常 → **fail-open 放行**并记 `RESOLVE_FAILED`（打 ERROR 日志）。偏好是「少打扰」而非安全边界，服务故障不应导致所有通知发不出去。
- 类别元数据从 `sys_notify_category` 读取（带缓存）。类别不存在（已删除、或脚本未同步）→ 记 WARN 后**放行**，避免一个漏同步的类别把通知全挡掉。
- 未知/空类别 code 归一化为 `DEFAULT`；渠道名 trim + 大写。
- 扇出多用户时按渠道做一次**批量预取**，N 个用户不产生 N 次查询。

`NotifyPreferenceReasons` 的取值：`USER_DISABLED` / `CHANNEL_NOT_ALLOWED` / `RESOLVE_FAILED`，写入 `sys_notify_record.fail_reason`（与发送失败原因共用同列，取值不重叠）。

### 4.1 两个方向的失败取态（禁止互相套用）

| 场景 | 取态 | 理由 |
| --- | --- | --- |
| 订阅偏好判定异常 | **fail-open**（放行） | 偏好是「少打扰」，故障时宁可不打扰判定失效，也不能让通知全断 |
| 客户端接口面准入（client scope）异常 | **fail-closed**（拒绝） | 那是安全边界，出问题时宁可挡住 |

这两个方向相反，是有意取舍，**不要把它们当成同一套规则**。详见 [Auth 模块 · 客户端接口面准入](../auth/client-scope)。

## 5. 通知类别（可管理数据）

类别**不再是硬编码枚举**，而是表 `sys_notify_category` 里的数据：管理员可在管理端自助增删改，初始化脚本预置 5 个内置类别（`is_builtin=true`）。

| code | `mandatory` | `defaultEnabled` | `allowedChannels` |
| --- | --- | --- | --- |
| `SECURITY` | ✅ | ✅ | SITE, EMAIL, PUSH |
| `TODO` | ❌ | ✅ | SITE, PUSH |
| `BUSINESS` | ❌ | ✅ | SITE, PUSH |
| `ANNOUNCEMENT` | ❌ | ✅ | SITE |
| `DEFAULT` | ❌ | ✅ | SITE, EMAIL, PUSH |

- **内置类别**（`is_builtin=true`）不可删除、`code` 不可修改，其余属性（名称、说明、`mandatory`、`defaultEnabled`、`allowedChannels`、排序、启用状态）都可改。
- **自定义类别**由管理端新增，`code` 创建后不可改（模板、发送记录、用户偏好都以它为键），`builtin` 恒为 `false`。
- 删除规则：**被 `sys_notify_template` 引用则禁删**（`CATEGORY_IN_USE`，22043）——删掉会让存量模板的类别失联，只能先改模板或改为「停用」。`is_enabled=false` 的类别不出现在消息设置页、不能被新模板选中，但存量模板仍按它判定。
- 客户端**不为自定义类别新建操作系统通知渠道**：Android 8.0+ / HarmonyOS 的渠道 ID 必须稳定且与内置类别一一对应，自定义 code 推送时统一回退 `DEFAULT` 系统渠道（`channelIdForCategory` 的未知值回退分支）。
- 写入偏好时**强制类别项被静默忽略**；`SITE` 与强制类别渠道在 DTO 中 `editable=false`、`enabled=true`。
- 管理端模板 `category_code` 校验**从严**（未知 → `CATEGORY_CODE_UNKNOWN`，22037）；发送路径**宽进**（未知 → 归一 `DEFAULT` + WARN，不阻塞发送）。

### 5.1 模板与类别的关系

业务侧把模板归入某一类，类别本身由管理员维护：

- **一个类别对应多个模板**（`sys_notify_template.category_code` 是普通列 + `idx_notify_template_category` 索引，不是外键）。
- 模板是类别的唯一业务归属入口：模板上的类别决定该模板发出的通知落到用户消息设置里的哪一组开关。
- 未归类的模板（`category_code` 为空）**一律按 `DEFAULT`（「其他通知」）参与判定**，因此存量模板不回填也与改造前行为一致。

**发送时生效的类别按两层解析**（`resolveSendCategoryCode`）：

| 层 | 来源 | 取态 |
| --- | --- | --- |
| 1 | 模板 `category_code` | 非空即生效；**宽进**：未知值归 `DEFAULT` + WARN，不阻塞发送 |
| 2 | 兜底 | 模板为空 → `DEFAULT` |

`SendNotifyCommand.categoryCode` **已废弃并被忽略**（传了打 WARN），保留字段只为不破坏既有调用方编译；长期归属与临时调整都请落在模板上。

### 5.2 管理端类别管理

- 菜单：系统管理 → 通知管理 → 通知类别（组件 `CategoryManagementPage`，权限码 `NOTIFY_CATEGORY_QUERY` / `_CREATE` / `_EDIT` / `_DELETE`）。
- 接口：`POST /api/notify/categories`、`PUT|DELETE|GET /api/notify/categories/{id}`、`POST /api/notify/categories/page`、`GET /api/notify/categories/list`。`list` 只回启用中的类别并按 `sort` 排序，供模板表单下拉使用。
- 模板新增/编辑表单的「通知类别」下拉数据源即 `list` 接口（可留空，留空 = 归入「其他通知」）；模板列表与详情里，已停用类别的 code 会**原样显示**而不是伪装成「其他通知」，避免误判。
- 编辑时类别**可以改**：把模板从 `BUSINESS` 改成 `SECURITY`，下一次发送即按新类别判定（`SECURITY` 为强制类别，用户无法关闭）。
- 更新接口对 `categoryCode` 是**全量覆盖**语义：**不传即清空**（归 `DEFAULT`），而不是「保持原值」。管理端表单在打开时回填当前值，所以正常编辑不会丢类别；只有主动清空下拉才会回到 `DEFAULT`。

## 6. 推送扇出与 APNs

### 6.1 扇出（`PushDispatcherImpl`）

固定顺序：

1. `nebula.notify.push.enabled=false` → 整批记 `PUSH_DISABLED`，不碰设备表与厂商。
2. 解析目标设备：指定 `deviceId` 时校验归属（不符按不存在处理，防跨用户投递），否则取该用户活跃设备；为空记 `NO_ACTIVE_DEVICE`。
3. 超过 `max-devices-per-user` 按 `last_active_time DESC` 截断并 WARN。
4. 逐台投递：未授权记 `NOTIFICATION_DISABLED`；无发送器记 `PROVIDER_NOT_CONFIGURED`；发送异常记 `SEND_FAILED`；成功计数。
5. 有 `recordId` 时逐台落 `sys_notify_push_record_detail`（不存 `push_token`）。
6. 汇总：有成功 → `SUCCESS`；否则有失败 → `FAILED`；否则 `SUPPRESSED`。

**单台失败不中断其余设备**，且推送异常绝不冒泡到业务调用方。

### 6.2 `PushChannelSender` 扩展点

```java
public interface PushChannelSender {
    String vendor();                                     // 路由键，见 NotifyPushVendors
    PushSendResult send(PushMessage message, NotifyPushDeviceDto device);
}
```

约定：单台失败**不抛异常**而返回结果；token 失效置 `invalidToken=true`；未配置凭据的实现**不注册为 Bean**；凭据只走环境变量；收集注入需容忍空列表。当前唯一实现是 `ApnsPushChannelSender`。

### 6.3 iOS 发送器

- `ApnsJwtSigner`：ES256 provider token，header `{alg,kid}` + payload `{iss,iat}`，DER 签名转 JOSE 定长 `r‖s`，base64url 去填充，token 复用 50 分钟。
- `ApnsPushChannelSender`：HTTP/2 单请求，带 `apns-topic` / `apns-push-type: alert` / `apns-priority: 10` / 可选 `apns-collapse-id`；正文 1500 字符截断。
- `PushHttpTransport` / `JdkPushHttpTransport`：JDK `HttpClient`，5s 连接 / 10s 请求超时。

### 6.4 token 回收只针对厂商明确反馈

`INVALID_TOKEN_REASONS = {BadDeviceToken, Unregistered}`。**刻意不含**：

- `ExpiredProviderToken`——那是自己的 JWT 过期，属服务端问题；
- `DeviceTokenNotForTopic`——topic 配错，是全量配置事故。

把配置事故当作 token 失效处理，一次就会把整张设备表刷成 `INVALID`。

## 7. 设备归属与生命周期

- 归属**只来自登录态**（`CurrentUserContext`），请求体没有 `userId`。任何登录用户都无法触碰他人设备。
- 换人登录同一台设备 → **重归属**而不是新增行，否则已登出用户会继续收到该设备的推送（串号泄露）。
- `device_id` 全局唯一（唯一键）。并发注册同一设备时，后到方捕获 `DuplicateKeyException` 后**回退为覆盖更新**（重取已有行 → 复用实体 → 更新注册字段），不向客户端暴露 500。
- 注销时 `push_token` 真清空（走整列更新，避免实体式 `updateById` 跳过 null 字段清不掉）。
- 用户卸载不会调用注销，靠**心跳**老化设备。心跳是**窄字段条件更新**：仅 `device_status='ACTIVE'` 的行可刷新 `last_active_time` 与版本字段——已注销/失效设备不会被迟到的心跳重新点亮；设备不在 ACTIVE 状态时心跳静默忽略（不报错）。

## 8. 缓存

模板等热点数据走缓存（`nebula.notify.cache-ttl-seconds`，默认 300s）。模板更新后缓存按 TTL 过期，未做主动失效——接入方若需强一致，写入后不要立即依赖旧缓存读取。

通知类别**做了主动失效**：`NOTIFY_CATEGORY_BY_CODE`（按 code 取，含停用）与 `NOTIFY_CATEGORY_LIST`（启用列表，供偏好判定与模板下拉）两个缓存在类别增删改后立即清空，因此「改完类别马上生效」，不必等 TTL。偏好判定读的是按 code 的单条缓存，模板下拉读的是启用列表缓存。
