---
title: Nebula Notify 使用方式
date: 2026-10-02 10:15
tags: [nebula, notify, usage]
---

# Nebula Notify 使用方式

本文面向接入方，给出从建模板到发通知、查记录、偏好与设备注册的可复用步骤。示例中的 `{token}` 为登录态 access token，`{host}` 为应用地址。

## 0. 前置：权限码与登录

管理端接口需要对应权限码（见[业务功能](./business-capabilities)），请求需带 `Authorization: Bearer {token}`。面向当前用户的接口只需登录态。

---

## 1. 创建通知模板与渠道变体

### 1.1 创建模板

```bash
curl -X POST "http://{host}/api/notify/templates" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "templateCode": "ORDER_PAID",
    "templateName": "订单已支付",
    "categoryCode": "BUSINESS",
    "fields": [
      { "fieldCode": "orderNo", "fieldName": "订单号", "required": true }
    ]
  }'
```

- `categoryCode` 可空，空值归入 `DEFAULT`；取值须是**已启用**的类别 code（内置 5 类为 `SECURITY/TODO/BUSINESS/ANNOUNCEMENT/DEFAULT`，管理员可另建自定义类别，见 §1.4）。
- 创建后模块会为 `ALL` 通道自动生成空变体。

### 1.2 填写渠道变体

变体逐通道填写，`channelType` 取 `SITE` / `EMAIL` / `PUSH` / 各群机器人通道。模板中用 `${orderNo}` 引用自定义字段，`${notify.currentDate}` 等为系统内置变量。

`PUSH` 变体的 `contentTemplate` 是**推送 JSON**：

```json
{
  "title": "订单已支付",
  "body": "订单 ${orderNo} 已支付成功",
  "deeplink": "app://orders/${orderNo}",
  "collapseKey": "ORDER_PAID",
  "extra": { "orderNo": "${orderNo}" }
}
```

> `body` 必填。不是合法 JSON 或缺 `body` 时发送会失败并记 `PUSH_TEMPLATE_INVALID`（22038）。

SITE / EMAIL 变体的 `subjectTemplate` + `contentTemplate` 是普通文本模板。

### 1.3 设置 / 修改模板的通知类别

类别决定这条通知落到用户「消息设置」里的哪一组开关（类别清单与含义见[设计与实现](./design-and-implementation) §5）。类别本身是**可管理数据**，管理员可以新建/停用/删除（见 §1.4）。

**管理端操作**：通知管理 → 模板管理 → 新增/编辑模板，在「通知类别」下拉选择；列表「通知类别」列与详情弹窗都会显示当前归属。留空即「其他通知」（`DEFAULT`）。

**接口操作**：

```bash
# 新建时直接归入
curl -X POST "http://{host}/api/notify/templates" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{ "templateCode": "ORDER_PAID", "templateName": "订单已支付", "categoryCode": "BUSINESS" }'

# 已存在模板改类别：PUT 是全量覆盖，建议先 GET 详情再回填 fields / variants
curl -X PUT "http://{host}/api/notify/templates/{id}" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{
    "templateName": "订单已支付",
    "categoryCode": "SECURITY",
    "fields": [],
    "variants": [
      { "channelType": "SITE", "contentTemplate": "订单 ${orderNo} 已支付", "enabled": true }
    ]
  }'
```

- 类别取值须是**已启用**的类别 code，未知或已停用的值报 `CATEGORY_CODE_UNKNOWN`（22037）。
- **更新是全量覆盖**：`categoryCode` 不传 = 清空并归入 `DEFAULT`（不是「保持原值」）；`variants` 至少一条否则报 `TEMPLATE_VARIANT_REQUIRED`，`fields` 不传即清空。改类别前先 `GET /api/notify/templates/{id}` 取回再回填最稳。
- 改类别**只影响之后的发送**，历史记录上的 `category_code` 保持当时的值，可用于回溯。
- 某一次发送要临时按别的类别判定，**改模板是唯一途径**：`SendNotifyCommand.categoryCode` 已废弃并被忽略（见 §2.1）。

### 1.4 管理通知类别（新增 / 修改 / 停用 / 删除）

类别清单在「系统管理 → 通知管理 → 通知类别」维护（权限码 `NOTIFY_CATEGORY_*`）。内置 5 类不可删除、编码不可改，其余属性（名称、说明、强制、默认开启、允许渠道、排序、启用）都可改。

```bash
# 列表（模板表单下拉用；只回启用中的类别，按 sort 升序）
curl "http://{host}/api/notify/categories/list" -H "Authorization: Bearer {token}"

# 新增自定义类别
curl -X POST "http://{host}/api/notify/categories" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{
    "code": "ORDER_REMINDER",
    "name": "订单提醒",
    "description": "订单状态变更提醒",
    "mandatory": false,
    "defaultEnabled": true,
    "sort": 110,
    "allowedChannels": ["SITE", "PUSH"],
    "enabled": true
  }'

# 修改（不含 code；改完缓存立即失效，下一次判定即生效）
curl -X PUT "http://{host}/api/notify/categories/{id}" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{ "name": "订单提醒（含支付）", "allowedChannels": ["SITE", "EMAIL", "PUSH"], "sort": 105, "enabled": true }'

# 删除（内置类别 22042；被模板引用 22043）
curl -X DELETE "http://{host}/api/notify/categories/{id}" -H "Authorization: Bearer {token}"
```

- 编码规则：字母开头，只含字母/数字/下划线，最长 32，**创建后不可改**（模板、发送记录、用户偏好都以它为键）；重复报 `CATEGORY_CODE_EXISTS`（22041）。
- `allowedChannels` 只能取 `SITE` / `EMAIL` / `PUSH`（用户维度渠道），为空或全非法报 `CATEGORY_CHANNEL_UNSUPPORTED`（22044）。
- **被模板引用的类别删不掉**：先 `PUT /api/notify/templates/{id}` 把模板改到别的类别，或把该类别 `enabled=false` 退役。
- 停用类别不会让存量模板被放行：这些模板仍按停用类别（及其 `allowedChannels`）判定；消息设置页与模板下拉都不再显示它。

---

## 2. 发送通知

### 2.1 发到站内信 + 邮件

```bash
curl -X POST "http://{host}/api/notify/send" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "channelTypes": ["SITE", "EMAIL"],
    "templateCode": "ORDER_PAID",
    "templateParams": { "orderNo": "SO20261002001" },
    "receiverUserIds": ["u1", "u2"]
  }'
```

- `receiverUserIds` 对 `SITE` / `EMAIL` / `PUSH` 必填；EMAIl 要求接收用户有邮箱，否则 `USER_EMAIL_REQUIRED`（22022）。
- `templateParams` 的 key 只写变量名本身，**不要带 `${}`**。
- `categoryCode` **已废弃并被忽略**（传了只打 WARN）：生效类别只取模板上的 `category_code`，模板为空则按 `DEFAULT`。要改判定请改模板（见 §1.3）。

### 2.2 发到群机器人

群机器人没有 `receiverUserId`，按渠道传渠道目标 ID：

```bash
curl -X POST "http://{host}/api/notify/send" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "channelTypes": ["WECOM_GROUP_WEBHOOK"],
    "templateCode": "ALERT",
    "templateParams": { "message": "磁盘使用率 92%" },
    "channelTargetIds": { "WECOM_GROUP_WEBHOOK": "target-001" }
  }'
```

> **`PUSH` 不能配成渠道目标**，它走 `receiverUserIds` 逐用户扇出。

### 2.3 Java 调用

业务代码注入 `INotifyService`，构造 `SendNotifyCommand`：

```java
SendNotifyCommand command = new SendNotifyCommand();
command.setChannelTypes(List.of(NotifyChannelTypes.SITE, NotifyChannelTypes.PUSH));
command.setTemplateCode("ORDER_PAID");
command.setTemplateParams(Map.of("orderNo", orderNo));
command.setReceiverUserIds(List.of(userId));

notifyService.sendNotify(command);
```

> `setCategoryCode(...)` 仍可编译但**不再生效**（方法已 `@Deprecated`，调用时打 WARN）。类别请配在模板上。

推送的投递失败**不会向上抛异常回滚业务事务**——业务侧可以「派单 + 通知」同事务，推送失败不影响派单。

---

## 3. 查询发送记录

```bash
curl -X POST "http://{host}/api/notify/records/page" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{ "pageNum": 1, "pageSize": 20 }'
```

读记录时注意 `sendStatus`：

- `SUCCESS` / `FAILED`：正常投递结果。
- `SUPPRESSED`：**被订阅偏好抑制**，看 `failReason`（`USER_DISABLED` / `CHANNEL_NOT_ALLOWED` / `RESOLVE_FAILED`）。

排查「用户说没收到通知」时，先看是 `SUPPRESSED`（用户自己关了该类别或该渠道）还是 `FAILED`（真的发失败）。

---

## 4. 站内信与公告

### 4.1 站内信（当前用户）

```bash
# 未读数（轮询用）
curl "http://{host}/api/notify/site-messages/unread-count" -H "Authorization: Bearer {token}"

# 分页
curl -X POST "http://{host}/api/notify/site-messages/page" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{ "pageNum": 1, "pageSize": 20 }'

# 标记已读
curl -X PUT "http://{host}/api/notify/site-messages/{id}/read" -H "Authorization: Bearer {token}"
```

站内信**只能轮询**（无 WebSocket / SSE），它是推送未接入时的兜底触达。

### 4.2 公告（当前用户）

```bash
# 未读弹窗公告（冷启动弹一次）
curl "http://{host}/api/notify/announcements/current/popup" -H "Authorization: Bearer {token}"

# 分页
curl -X POST "http://{host}/api/notify/announcements/current/page" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{ "pageNum": 1, "pageSize": 20 }'
```

---

## 5. 通知订阅偏好（消息设置页）

### 5.1 读取

```bash
curl "http://{host}/api/notify/preferences/current" -H "Authorization: Bearer {token}"
```

返回**启用中**的类别清单（每项带 `editable`，客户端据此置灰）与各渠道开关。查询与更新返回**同一结构**。

### 5.2 更新

```bash
curl -X PUT "http://{host}/api/notify/preferences/current" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "categoryCode": "BUSINESS", "channel": "PUSH", "enabled": false },
      { "categoryCode": "TODO", "channel": "SITE", "enabled": true }
    ]
  }'
```

- `items` 要么全部生效、要么全部不生效（单事务）。
- 提交强制类别（`SECURITY`）或 `SITE` 渠道会被**静默忽略**，不报错。
- 未知类别报 `22032`、不支持的渠道报 `22033`、同一（类别 × 渠道）重复报 `22034`。

### 5.3 重置

```bash
curl -X POST "http://{host}/api/notify/preferences/current/reset" -H "Authorization: Bearer {token}"
```

> 偏好判定**没有总开关**，永远生效：用户关掉某类通知后，该类别在该渠道上的投递会被抑制（`SUPPRESSED` + `USER_DISABLED`）。

---

## 6. 移动推送设备注册（客户端）

### 6.1 注册 / 更新（Upsert）

```bash
curl -X POST "http://{host}/api/notify/push-devices" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{
    "deviceId": "stable-device-uuid",
    "platform": "IOS",
    "vendor": "APNS",
    "pushToken": "<apns-device-token>",
    "notificationEnabled": true,
    "appVersion": "1.4.0",
    "appBuild": 140
  }'
```

- 请求体里**没有 userId**，归属由登录态决定。换人登录同一台设备会**重归属**而不是新增行。
- 用户拒绝通知权限时**也要注册**并置 `notificationEnabled=false`（只跳过推送，站内信照常）。
- 推送未启用时注册被拒绝（`PUSH_DISABLED`, 22024）。

### 6.2 心跳（刷新最后活跃时间）

```bash
curl -X POST "http://{host}/api/notify/push-devices/heartbeat" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{ "deviceId": "stable-device-uuid", "notificationEnabled": true }'
```

用户卸载 App 不会有机会注销，靠心跳把设备老化出去是唯一不依赖主动探测的办法。心跳**只刷新 `ACTIVE` 状态的设备**：已注销/失效的设备收到心跳会被静默忽略（不报错、也不会把设备重新点亮），客户端无需对心跳结果做特殊处理。

### 6.3 注销

```bash
curl -X DELETE "http://{host}/api/notify/push-devices/{deviceId}" -H "Authorization: Bearer {token}"
```

注销会把 `push_token` **真清空**（个人数据不留），设备状态置 `UNREGISTERED`。

### 6.4 我的设备

```bash
curl "http://{host}/api/notify/push-devices/current" -H "Authorization: Bearer {token}"
```

---

## 7. 客户端初始化推送 SDK 的依据

客户端不必硬编码该初始化哪个推送 SDK，冷启动时从 `GET /api/frontend/init` 的 `push` 节点读取：

```bash
curl "http://{host}/api/frontend/init?platform=IOS&channel=APP_STORE"
```

```json
{
  "push": { "enabled": true, "vendors": ["APNS"] }
}
```

- `vendors` 里列出的都是**服务端确实能投递的**（有已注册发送器）；列表为空即「不要初始化任何推送 SDK」。
- `enabled` 由 `vendors` 是否为空推导，不另设开关。
- 用列表而非单值：Android 同一安装包在不同品牌手机上要用不同厂商通道，客户端按设备品牌再选一次。

当前只有 iOS（APNs）发送器，`vendors` 在未配置 APNs 凭据或推送总开关关闭时为 `[]`。

---

## 8. 管理端测试推送

用于验证厂商凭据与设备 token 是否可用：

```bash
curl -X POST "http://{host}/api/notify/push/test" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{ "userId": "u1", "title": "测试", "content": "这是一条测试推送" }'
```

> 测试推送正文同样会出现在锁屏通知栏上，**不得包含敏感业务数据**。该接口另记审计。
