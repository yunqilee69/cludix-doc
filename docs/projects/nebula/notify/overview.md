---
title: Nebula Notify 模块总览
date: 2026-10-02 10:05
tags: [nebula, notify, guide]
---

# Nebula Notify 模块总览

## 1. 模块定位

`nebula-notify` 是 Nebula 中台的**统一消息中心**，把「系统要告诉用户什么、通过哪些渠道送、送了没有」收口到一个模块。它同时承载三种不同性质的载体、六个投递通道、一套模板 + 渠道变体的内容模型，以及一套用户侧的订阅偏好与移动推送能力。

从代码可确认，它主要提供以下能力：

- 通知模板管理（模板 + 自定义字段 + 逐渠道内容变体）
- 渠道目标管理（群机器人 webhook 端点）
- 通知发送（按模板渲染并向多通道、多用户扇出）
- 发送记录查询（每次投递一条，可区分成功 / 失败 / 被偏好抑制）
- 公告管理（定向、置顶、弹窗、已读）
- 站内信（当前用户收件箱、未读数、已读/未读）
- 用户通知订阅偏好（按类别 × 渠道的开关）
- 移动推送设备注册与逐设备投递明细（当前实现 iOS APNs）
- 通知类别管理（内置 5 类 + 自定义类别，管理端可增删改）

---

## 2. 模块结构

`nebula-notify` 按 Nebula 标准拆成 5 个子模块，统一根包 `cn.cloudomni.nebula.notify`：

```text
nebula-notify/
├── nebula-notify-api      # 契约层：Service 接口、Command/DTO/Query、常量、错误码、i18n
├── nebula-notify-core     # 核心实现：service.impl、dao、entity、converter、push、configuration
├── nebula-notify-local    # 本地接入层：Controller + 请求/响应模型 + 本地装配
├── nebula-notify-remote   # 远程接入层：Feign Client + 远程代理实现
└── nebula-notify-service  # 独立服务启动模块（默认端口 9903）
```

### 2.1 `nebula-notify-api`

提供稳定契约：`INotifyService`、`INotifyPreferenceService`、`IPushDeviceService`、`IPushClientConfigService`、`PushDispatcher`、`PushChannelSender`，以及 `constant`（通道、类别、状态、错误码、按钮权限码）、`model.command`、`model.dto`、`model.query`、`model.resp` 等。

### 2.2 `nebula-notify-core`

真正的实现层：`NotifyServiceImpl`、`NotifyPreferenceServiceImpl`、`PushDispatcherImpl`、`PushDeviceServiceImpl`、`PushClientConfigServiceImpl`、邮件发送、13 个实体与对应 DAO，以及推送实现包 `push/`（`ApnsJwtSigner`、`ApnsPushChannelSender`、`PushHttpTransport` / `JdkPushHttpTransport`、`PushJson`）。

### 2.3 `nebula-notify-local`

对外暴露 REST 接口，控制器包括 `NotifyController`、`NotifyPreferenceController`、`PushDeviceController`。本地装配由 `NotifyLocalGateAutoConfiguration` 完成（`@ComponentScan` + `@MapperScan`）。

### 2.4 `nebula-notify-remote`

为微服务消费者提供 Feign 远程代理：`NotifyFeignClient`（`path = /api/notify`）、`NotifyRemoteServiceImpl`，配置前缀 `nebula.notify.remote.*`。

### 2.5 `nebula-notify-service`

独立消息服务启动模块，`server.port: 9903`，`nebula.notify.mode: local`。数据源在示例配置中为 PostgreSQL。

---

## 3. 三种载体

模块对外提供三种性质不同的「消息载体」，接入时不要混淆：

| 载体 | 性质 | 落库 | 用户可关 | 典型用途 |
| --- | --- | --- | --- | --- |
| **公告**（`sys_announcement`） | 运营触达，独立于模板/记录体系 | 独立表 | 否 | 系统公告、活动通知、需弹窗的强提示 |
| **模板通知**（`sys_notify_template` → `sys_notify_record`） | 业务触发的一次投递，可多通道扇出 | 每次投递一条记录 | 是（按类别×渠道） | 审批结果、业务提醒、安全提醒 |
| **站内信**（`sys_site_message`） | `SITE` 渠道投递的站内信箱 | 记录 + 站内信两条 | 否（`SITE` 永不参与偏好判定） | 兜底触达，所有通知都能在站内看到 |

要点：**站内信是「模板通知走 `SITE` 渠道」的产物**，不是一套独立发送 API；而**公告是独立体系**，不走模板与渠道分发。三者关系见[设计与实现](./design-and-implementation)。

---

## 4. 通道模型

通道由 `NotifyChannelTypes` 定义，当前共 6 个：

| 常量 | 值 | 说明 | 是否用户维度 |
| --- | --- | --- | --- |
| `SITE` | `SITE` | 站内信 | ✅ |
| `EMAIL` | `EMAIL` | 邮件（SMTP，配置走系统参数） | ✅ |
| `PUSH` | `PUSH` | 移动推送 | ✅ |
| `WECOM_GROUP_WEBHOOK` | `WECOM_GROUP_WEBHOOK` | 企业微信群机器人 | ❌ |
| `FEISHU_GROUP_WEBHOOK` | `FEISHU_GROUP_WEBHOOK` | 飞书群机器人 | ❌ |
| `DINGTALK_GROUP_WEBHOOK` | `DINGTALK_GROUP_WEBHOOK` | 钉钉群机器人 | ❌ |

- `USER_CHANNELS = [SITE, EMAIL, PUSH]`：按 `receiverUserIds` **逐个用户**投递，因此参与订阅偏好判定。
- 群机器人通道面向 `sys_notify_channel_target` 配置的 webhook 端点，不绑定 `receiverUserId`，**不参与偏好判定**。

> `PUSH` 通道的投递实现在本批补齐（此前只有枚举与接口骨架），当前**仅实现 iOS（APNs）**，Android / 鸿蒙客户端注册的设备会因「无对应发送器」投递失败。详见 §6 与[设计与实现](./design-and-implementation)。

---

## 5. 模板 + 渠道变体机制

一条通知的正文不是一个字符串，而是**模板 + 逐渠道变体**：

- `sys_notify_template`：模板主体（编码、名称、`category_code`）。
- `sys_notify_template_field`：自定义参数校验（`field_code` / 是否必填 / 默认值 / 示例）。
- `sys_notify_template_variant`：**每个通道一条变体**（`channel_type` + `subject_template` + `content_template` + `is_enabled`）。

创建模板时，模块会为 `NotifyChannelTypes.ALL` 中每个通道自动生成一条空变体（内容为空、`is_enabled=false`），再由接入方逐通道填写。发送时按目标通道取对应变体渲染。

**渲染上下文**自动注入一组内置变量（`notify.currentDateTime`、`notify.currentDate`、`notify.currentTime`、`notify.timestamp`、`notify.year/month/day/hour/minute/second`、`notify.dayOfWeek`、`notify.templateCode`、`notify.channelType`、`notify.receiverUserId`、`notify.receiverEmail`），业务自定义字段通过模板字段声明。

**`PUSH` 变体的内容不是纯文本，而是推送 JSON**：`{title, body, deeplink, collapseKey, extra}`。发送时解析为推送消息；变体不是合法 JSON 或缺 `body` 会失败并记 `PUSH_TEMPLATE_INVALID`（22038），不会把整段 JSON 推给用户。发送记录里存的是渲染后的可读标题与正文，不是 JSON。

---

## 6. 通知类别与订阅偏好

通知类别是**可管理数据**（表 `sys_notify_category`），不再是硬编码枚举：管理员可在「系统管理 → 通知管理 → 通知类别」自助新增、修改、停用与删除。初始化脚本预置 5 个**内置类别**（`is_builtin=true`，不可删除、`code` 不可修改）：

| code | 名称 | `mandatory` | `defaultEnabled` | `allowedChannels` |
| --- | --- | --- | --- | --- |
| `SECURITY` | 安全与账号 | ✅ | ✅ | SITE, EMAIL, PUSH |
| `TODO` | 待办与审批 | ❌ | ✅ | SITE, PUSH |
| `BUSINESS` | 业务提醒 | ❌ | ✅ | SITE, PUSH |
| `ANNOUNCEMENT` | 公告通知 | ❌ | ✅ | SITE |
| `DEFAULT` | 其他通知 | ❌ | ✅ | SITE, EMAIL, PUSH |

自定义类别可配置 `name` / `description` / `mandatory` / `defaultEnabled` / `sort` / `allowedChannels` / `enabled`（`code` 创建后不可改，`builtin` 恒为 `false`）。删除规则：**被模板引用则禁删**（`CATEGORY_IN_USE`，22043），只能先改模板或改为「停用」；停用后不出现在消息设置页、不能被新模板选中，但存量模板仍按原类别判定。

- 模板与发送记录新增可空列 `category_code`；存量数据为空时一律归入 `DEFAULT`，行为与改造前一致。
- 模板归属哪一类**在管理端可配置**：模板新增/编辑表单带「通知类别」下拉（数据源为 `GET /api/notify/categories/list`，只回启用中的类别），可随时改（如 `BUSINESS` → `SECURITY`），留空即归入「其他通知」。见[使用方式 · 设置模板类别](./usage-guide)。
- 用户在消息设置页可维护「类别 × 渠道」开关（`sys_notify_user_preference`）。**偏好判定永远生效**，没有总开关可关闭。
- **强制类别（`mandatory`）与 `SITE` 渠道不受用户提交影响**，在返回的 DTO 中标记 `editable=false`。

判定优先级的固定顺序——`SITE` 最先放行 → 渠道校验（`CHANNEL_NOT_ALLOWED`）→ 强制类别 → 用户偏好 → 类别默认值（本模块最容易实现错的点）——见[设计与实现](./design-and-implementation)。

---

## 7. 移动推送与设备注册

本批补齐了此前只有骨架的 `PUSH` 通道：

- **设备表** `sys_notify_push_device`：一台设备一行，`device_id` 全局唯一；归属只来自登录态，换人登录同一台设备**重归属**。
- **生命周期接口**：注册（Upsert）、注销、心跳、我的设备；管理端分页与测试推送单独带权限码。
- **扇出** `PushDispatcher`：取该用户活跃设备 → 逐台投递 → 汇总 → 落逐设备明细 `sys_notify_push_record_detail`；单台失败不中断其余设备，推送异常不冒泡到业务调用方。
- **iOS 发送器**：`ApnsJwtSigner`（ES256 provider token）+ `ApnsPushChannelSender`（HTTP/2 + `apns-topic` / `apns-priority` 等）。**凭据齐备才注册 Bean**，缺任一即不注册，命中时记 `PROVIDER_NOT_CONFIGURED`。
- 推送总开关 `nebula.notify.push.enabled` **默认 `false`**；关闭期间设备注册被直接拒绝（`PUSH_DISABLED`），不产生无用 token。

---

## 8. 本地模式与远程模式

- **单体模式**：引入 `nebula-notify-local`，控制器直接在当前应用暴露，`INotifyService` 等由本地实现提供。
- **微服务模式**：独立部署 `nebula-notify-service`（默认 9903），业务服务只依赖 `nebula-notify-remote`，通过 Feign 转调。配置：

```yaml
nebula:
  notify:
    mode: remote
    remote:
      service-name: nebula-notify-service
      service-url: http://localhost:9903
```

不要在同一个应用里同时引入 `nebula-notify-local` 与 `nebula-notify-remote`，否则同一契约出现双实现冲突。

---

## 9. 当前明确不提供的能力

- **没有 WebSocket / SSE**：站内信、公告只能**轮询**（`/site-messages/unread-count`、`/announcements/current/popup`）。
- **推送只有 iOS（APNs）发送器**：Android / 鸿蒙目前没有可用发送器，`GET /api/frontend/init` 的 `push.vendors` 会如实反映（没有可用通道时为**空数组**，客户端据此不初始化任何推送 SDK）。
- **自定义类别不新建操作系统通知渠道**：Android 8.0+ / HarmonyOS 的渠道 ID 与内置类别一一对应且不可改；服务端下发的自定义 code 推送时统一回退 `DEFAULT` 系统渠道。要为自定义类别开独立系统渠道需要客户端发版。
- **`PUSH` 不能配置成渠道目标**：`sys_notify_channel_target` 不接受 `PUSH`，否则是一条永远不生效的死配置（`CHANNEL_TARGET_CHANNEL_UNSUPPORTED`，22039）。

---

## 10. 推荐阅读入口

- [业务功能](./business-capabilities)：能力边界与权限码
- [使用方式](./usage-guide)：建模板、发通知、查记录的可复用步骤
- [配置说明](./configuration)：`nebula.notify.*` 与凭据注入
- [设计与实现](./design-and-implementation)：偏好判定优先级、推送扇出
- [建表语句](./ddl)：13 张表结构
