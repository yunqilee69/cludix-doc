---
title: Nebula Notify 业务功能
date: 2026-10-02 10:10
tags: [nebula, notify, usage]
---

# Nebula Notify 业务功能

本文按能力逐条说明「能做什么、不能做什么、对应接口组、所需权限码」。接口契约以运行时 OpenAPI 文档（`doc.html`）为准，这里给出接入所需的形状与边界。

> 权限码需要在管理端「按钮管理」建行并通过 `auth_permission` 授予角色后，非超管用户才能获得；开启 `nebula.auth.permission.enforce-enabled=true` 前请先建好本模块权限码。
> **面向当前用户**的接口（`/announcements/current/**`、`/site-messages/**`、`/preferences/current`、`/push-devices/**` 的注册/注销/心跳/current）**刻意不加权限码**，靠登录态与 `userId` 过滤——加了反而会让普通用户看不到自己的消息。

## 权限码总览（`NotifyButtonCodes`）

| 权限码 | 用途 |
| --- | --- |
| `NOTIFY_ANNOUNCEMENT_MANAGE` | 公告管理 |
| `NOTIFY_TEMPLATE_MANAGE` | 通知模板管理 |
| `NOTIFY_CHANNEL_TARGET_CREATE` / `EDIT` / `DELETE` / `QUERY` | 渠道目标增/改/删/查 |
| `NOTIFY_CATEGORY_CREATE` / `EDIT` / `DELETE` / `QUERY` | 通知类别增/改/删/查 |
| `NOTIFY_SEND` | 发送通知、测试邮件 |
| `NOTIFY_RECORD_VIEW` | 发送记录查询 |
| `NOTIFY_PUSH_DEVICE_QUERY` | 管理端设备分页 |
| `NOTIFY_PUSH_TEST` | 管理端测试推送 |

---

## 1. 通知模板管理

**能做什么**

- 创建、更新、删除、查询通知模板（`template_code` 全局唯一）。
- 为模板声明自定义字段（`field_code` / 是否必填 / 默认值 / 示例值），发送时校验参数是否齐备。
- 为 `ALL` 通道自动生成渠道变体，逐通道填写标题/内容模板并启用。
- 为模板设置**通知类别**（`categoryCode`，即消息设置页里的开关分组），新增与编辑都可改；留空即归入「其他通知」（`DEFAULT`）。

**不能做什么**

- 删除被引用的模板需自行评估（模块不阻止删除，但历史记录里的 `template_code` 仍可读）。
- 模板本身不绑定发送对象——发送时由调用方传 `receiverUserIds` / 渠道目标。
- **类别不能在这里新增/删除**：类别是数据（见 §3 通知类别管理），模板表单只能从**启用中的类别**里选；未知或已停用的类别提交会被拒（`CATEGORY_CODE_UNKNOWN`，22037）。
- 更新接口对 `categoryCode` 是**全量覆盖**：不传即清空并归入 `DEFAULT`，不是「保持原值」。

**接口**：`POST /api/notify/templates`、`PUT /api/notify/templates/{id}`、`DELETE /api/notify/templates/{id}`、`GET /api/notify/templates/{id}`、`POST /api/notify/templates/page`

**权限码**：`NOTIFY_TEMPLATE_MANAGE`（增删改查均需）

---

## 2. 通知类别管理

**能做什么**

- 新增、修改、删除、查询、分页通知类别；提供 `GET /api/notify/categories/list` 供模板表单下拉使用（只回**启用中**的类别，按 `sort` 升序）。
- 每个类别可配置：`code`（唯一，创建后不可改）、`name`、`description`、`mandatory`（强制：忽略用户偏好始终放行）、`defaultEnabled`（用户无记录时的默认开关）、`sort`、`allowedChannels`（`SITE` / `EMAIL` / `PUSH` 的子集）、`enabled`、`remark`。
- 初始化脚本预置 5 个**内置类别**：`SECURITY`（强制）/ `TODO` / `BUSINESS` / `ANNOUNCEMENT` / `DEFAULT`。

**不能做什么**

- **内置类别不可删除**（`CATEGORY_BUILTIN_PROTECTED`，22042），`code` 也不可修改；除 `code` 外其余属性都可改。
- **被模板引用的类别禁删**（`CATEGORY_IN_USE`，22043）——删掉会让存量模板的类别失联；请先改模板或改为「停用」。
- 类别编码只允许字母、数字、下划线且以字母开头（`^[A-Za-z][A-Za-z0-9_]*$`，最长 32），重复报 `CATEGORY_CODE_EXISTS`（22041）。
- 允许渠道只能是用户维度渠道；`allowedChannels` 传空或不含任何合法渠道报 `CATEGORY_CHANNEL_UNSUPPORTED`（22044）。
- **停用不等于删除**：`enabled=false` 的类别不出现在消息设置页、不能被新模板选中，但存量模板仍按它判定（因此不会被静默放行）。
- 自定义类别在移动端**不新建操作系统通知渠道**，推送时回退 `DEFAULT` 系统渠道。

**接口**：`POST /api/notify/categories`、`PUT /api/notify/categories/{id}`、`DELETE /api/notify/categories/{id}`、`GET /api/notify/categories/{id}`、`POST /api/notify/categories/page`、`GET /api/notify/categories/list`

**权限码**：`NOTIFY_CATEGORY_CREATE` / `_EDIT` / `_DELETE` / `_QUERY`（写操作另记审计）

---

## 3. 渠道目标管理

**能做什么**

- 维护群机器人投递端点（`target_name` / `channel_type` / `endpoint_url` / `config_json`），供三种群机器人通道使用。
- 创建、更新、删除、查询、分页。

**不能做什么**

- **`PUSH` 不能建为渠道目标**——推送是用户维度通道，不走渠道目标；提交会得到 `CHANNEL_TARGET_CHANNEL_UNSUPPORTED`（22039）。

**接口**：`POST /api/notify/channel-targets`、`PUT /{id}`、`DELETE /{id}`、`GET /{id}`、`POST /page`

**权限码**：`NOTIFY_CHANNEL_TARGET_CREATE` / `_EDIT` / `_DELETE` / `_QUERY`

---

## 4. 通知发送

**能做什么**

- 按模板编码 + 参数发起一次发送，向多个通道、多个接收用户扇出。
- 面向用户的通道（`SITE` / `EMAIL` / `PUSH`）按用户逐个投递；群机器人通道按渠道目标投递。
- 发送时按**模板的 `category_code`** 参与订阅偏好判定。

**不能做什么**

- 同步返回的是本次投递的汇总结果，**推送异常不会向上抛出回滚业务事务**（推送是提醒而非业务载体）。
- 被偏好抑制的通道不投递；但会**照常落一条记录**并标注原因。
- `SendNotifyCommand.categoryCode` **已废弃并被忽略**（传了只打 WARN）：类别只认模板上的值，临时改判定请改模板。

**接口**：`POST /api/notify/send`（`INotifyService.sendNotify`）

**权限码**：`NOTIFY_SEND`

---

## 5. 发送记录查询

**能做什么**

- 按记录 ID 查详情、分页查询，看到每个通道/接收人的 `send_status`、`fail_reason`、`subject_text` / `content_text`。
- 记录状态 `NotifyRecordStatus`：`SUCCESS` / `FAILED` / `SUPPRESSED`。

**怎么读这些状态**

- `SUCCESS`：实际投递成功。
- `FAILED`：投递失败（发送异常、厂商拒绝等）。
- `SUPPRESSED`：**被订阅偏好抑制**，`fail_reason` 取值见 `NotifyPreferenceReasons`（`USER_DISABLED` / `CHANNEL_NOT_ALLOWED` / `RESOLVE_FAILED`）。

三者区分开，「通知没到」才能判断到底是被用户关掉了、还是发送真的失败。

**接口**：`GET /api/notify/records/{id}`、`POST /api/notify/records/page`

**权限码**：`NOTIFY_RECORD_VIEW`

---

## 6. 站内信

**能做什么**

- 当前用户分页查询站内信、查未读数、标记已读/未读（单个与批量）、删除。
- 站内信由 `SITE` 渠道投递产生，是推送未接入时的**兜底触达**。
- 站内信**强制归属当前登录用户**：查询/已读/删除都按登录态的 `userId` 过滤，接口面不接收 `userId` 参数，任何登录用户都看不到、也操作不了他人的站内信。

**不能做什么**

- `SITE` 渠道**永不参与订阅偏好判定**，始终投递并落库——用户不能关闭站内信。
- 没有 WebSocket / SSE，客户端只能轮询未读数。

**接口**：`POST /api/notify/site-messages/page`、`GET /unread-count`、`PUT /{id}/read`、`PUT /{id}/unread`、`PUT /read`、`PUT /unread`、`DELETE /{id}`

**权限码**：无（面向当前用户）

---

## 7. 公告

**能做什么**

- 管理端：创建、更新、删除、详情、分页；支持定向（全员 / 用户 / 角色 / 组织）、置顶、排序、弹窗、发布/过期时间。
- 当前用户：分页查询可见公告、取未读弹窗公告、标记已读。

**不能做什么**

- 公告不走模板与渠道分发，是独立体系（见[总览 §3](./overview)）。

**接口**（管理端）：`POST /api/notify/announcements`、`PUT /{id}`、`DELETE /{id}`、`GET /{id}`、`POST /page`
**接口**（当前用户）：`POST /api/notify/announcements/current/page`、`GET /current/popup`、`PUT /{id}/read`

**权限码**：管理端 `NOTIFY_ANNOUNCEMENT_MANAGE`；当前用户接口无

---

## 8. 用户通知订阅偏好

**能做什么**

- 当前用户查询 / 更新 / 重置自己的通知偏好：按「类别 × 渠道」的订阅开关。
- 返回的类别清单只含**启用中**的类别，带服务端计算出的 `editable`，客户端据此置灰；查询与更新返回同一结构。

**不能做什么**

- **强制类别（`SECURITY`）与 `SITE` 渠道不能被提交覆盖**，服务端静默忽略（不报错）。它们的 DTO 中 `editable=false` 且 `enabled=true`。
- **偏好判定没有总开关**：不存在「关掉即整体放行」的配置，判定永远生效。
- 偏好是「抑制」不是「延迟投递」，不补发。

**接口**：`GET /api/notify/preferences/current`、`PUT /api/notify/preferences/current`、`POST /api/notify/preferences/current/reset`

**权限码**：无（面向当前用户）

**非法输入错误码**：未知类别 `22032`、不支持的渠道 `22033`、偏好项重复 `22034`。

---

## 9. 移动推送设备注册

**能做什么**

- 客户端注册 / 更新推送设备（`device_id`、平台、厂商、`push_token`、权限状态、客户端版本），支持 token 轮换。
- 注销设备、上报心跳、查询我的设备。
- 管理端分页查询设备、发起测试推送（另记审计）。

**不能做什么**

- **归属只来自登录态**：注册/注销/心跳的请求体里没有 `userId` 字段，任何登录用户都无法触碰他人设备。
- `device_id` 全局唯一：并发注册同一设备时后到方自动回退为覆盖更新（重归属），不会产生重复行。
- 推送未启用时（`nebula.notify.push.enabled=false`）**注册被直接拒绝**（`PUSH_DISABLED`, 22024），不留无用 token。
- 设备状态 `ACTIVE` / `INVALID` / `UNREGISTERED`，只有 `ACTIVE` 参与扇出；**心跳也只刷新 `ACTIVE` 行**——已注销/失效设备不会被迟到的心跳重新点亮（静默忽略，不报错）。
- 用户在系统设置里关掉通知权限的设备只跳过推送（原因 `NOTIFICATION_DISABLED`），站内信照常。

**接口**：`POST /api/notify/push-devices`、`DELETE /api/notify/push-devices/{deviceId}`、`POST /api/notify/push-devices/heartbeat`、`GET /api/notify/push-devices/current`、`POST /api/notify/push-devices/page`、`POST /api/notify/push/test`

**权限码**：注册/注销/心跳/current **无**；管理端分页 `NOTIFY_PUSH_DEVICE_QUERY`；测试推送 `NOTIFY_PUSH_TEST`

---

## 10. 移动推送下发（`PUSH` 通道）

**当前状态：iOS（APNs）已实现；Android / 鸿蒙无发送器。**

- 模板需有合法的 PUSH 变体 JSON（`{title, body, deeplink, collapseKey, extra}`），否则 `PUSH_TEMPLATE_INVALID`（22038）。
- 扇出取该用户活跃设备，超过 `nebula.notify.push.max-devices-per-user` 按最后活跃时间保留前 N 台。
- 单台失败不中断其余设备；投递结果逐设备落在 `sys_notify_push_record_detail`。
- 厂商明确反馈 token 无效（`BadDeviceToken` / `Unregistered`）时才回收设备为 `INVALID`；不把服务端配置事故（自身 JWT 过期、topic 配错）当作 token 失效。
- 客户端通过 `GET /api/frontend/init` 的 `push` 节点获取该初始化哪些推送 SDK（`enabled` + `vendors`，没有可用通道时 `vendors` 为空数组）。

**接口**：并入 `POST /api/notify/send` 的 `PUSH` 通道；测试推送 `POST /api/notify/push/test`
