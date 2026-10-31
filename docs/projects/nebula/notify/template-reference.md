---
title: Nebula Notify 模板语法与变量
date: 2026-10-31 10:00
tags: [nebula, notify, guide]
---

# Nebula Notify 模板语法与变量

本文是通知模板的完整参考：渲染引擎、模板语法、内置变量、自定义字段约束、各渠道差异与存量迁移。

## 1. 渲染引擎

通知模板与事务邮件共用同一套渲染器（`ThymeleafTextTemplateRenderer`），只依赖 Thymeleaf core，不引入 Spring MVC：

| 内容类型 | 引擎模式 | 后缀/来源 | 典型用途 |
| --- | --- | --- | --- |
| 纯文本 | `TemplateMode.TEXT` | 数据库字段 `subject_template` / `content_template` | SITE、群机器人、PUSH JSON、EMAIL 纯文本兜底 |
| HTML | `TemplateMode.HTML` | 数据库字段 `html_content_template`，或事务邮件的 `.html` 文件 | EMAIL 富文本正文 |

模板在**创建/更新时**校验语法，语法错误直接返回 `01040002`，不会把坏模板存进库；事务邮件的 resources 模板还会在应用启动时校验（`nebula.template.validate-on-startup=true`）。

## 2. 模板语法

### 2.1 纯文本（TEXT）

变量用**内联表达式** `[(${...})]`，这是 Thymeleaf 在 TEXT 模式下的标准写法：

```text
您好 [(${nickname})]，订单 [(${orderNo})] 已支付，时间 [(${notify.currentDateTime})]。
```

条件块：

```text
[# th:if="${hasOrder}"]订单号：[(${orderNo})][/]
```

> **旧语法不再兼容**：`${orderNo}` 会被当成普通文本原样发出去。存量模板必须按 §6 迁移为 `[(${orderNo})]`。

### 2.2 HTML（EMAIL 专用）

HTML 模板使用标准 Thymeleaf 属性语法：

```html
<p>您好 <strong th:text="${nickname}">用户</strong>，</p>
<p>订单 <span th:text="${orderNo}">A-1001</span> 已支付。</p>
<p th:if="${hasOrder}">查看详情：<a th:href="${orderUrl}" th:text="${orderUrl}">链接</a></p>
```

- 变量默认自动 HTML 转义；**不要**用 `th:utext` 渲染用户输入，除非调用方已做可信过滤。
- 发送时纯文本与 HTML 同时存在则以 `multipart/alternative` 发送，客户端不支持 HTML 时自动回退纯文本；只配纯文本时发普通文本邮件。
- HTML 内容模板**只允许 EMAIL 渠道**。SITE / PUSH / 群机器人配置 HTML 会被拒绝（`22046`），避免留下永远不会被读取的死配置。

### 2.3 PUSH JSON

`PUSH` 变体的 `contentTemplate` 是一段 JSON，渲染后再解析：

```json
{
  "title": "订单已支付",
  "body": "订单 [(${orderNo})] 已支付成功",
  "deeplink": "app://orders/[(${orderNo})]",
  "collapseKey": "ORDER_PAID",
  "extra": { "orderNo": "[(${orderNo})]" }
}
```

`body` 必填；渲染后不是合法 JSON 或缺 `body` 会失败并记 `PUSH_TEMPLATE_INVALID`（22038）。

## 3. 内置变量

发送时自动注入，模板里直接引用，无需在模板字段中声明：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `notify.currentDateTime` | 当前日期时间 | `2026-10-31 10:00:00` |
| `notify.currentDate` | 当前日期 | `2026-10-31` |
| `notify.currentTime` | 当前时间 | `10:00:00` |
| `notify.timestamp` | 当前毫秒时间戳 | `1793412000000` |
| `notify.year` / `month` / `day` | 年 / 月 / 日 | `2026` / `10` / `31` |
| `notify.hour` / `minute` / `second` | 时 / 分 / 秒 | `10` / `00` / `00` |
| `notify.dayOfWeek` | 星期几（英文枚举） | `SATURDAY` |
| `notify.templateCode` | 模板编码 | `ORDER_PAID` |
| `notify.channelType` | 当前渠道 | `SITE` / `EMAIL` / `PUSH` |
| `notify.receiverUserId` | 接收用户 ID | `user-1` |
| `notify.receiverEmail` | 接收用户邮箱 | `user@example.com` |

写法：纯文本 `[(${notify.currentDate})]`，HTML `th:text="${notify.currentDate}"`。

## 4. 自定义字段

- 字段在 `sys_notify_template_field` 声明，发送时通过 `templateParams` 传值，key 只写变量名本身，**不要带 `${}` 或 `[()]`**。
- `fieldCode` 必须匹配 `^[A-Za-z_][A-Za-z0-9_]*$`，否则无法作为 Thymeleaf 顶层变量解析，创建/更新直接拒绝（`01040003`）。
- 保留变量 `notify` 不能作为字段编码（大小写均拒绝），它由内置变量容器占用。
- 必填字段缺失时发送失败并记录原因；非必填字段未传时渲染为空字符串。

## 5. 各渠道差异

| 渠道 | 标题 | 正文 | HTML | 说明 |
| --- | --- | --- | --- | --- |
| `SITE` | `subjectTemplate` | `contentTemplate` | ❌ | 站内信，不支持 HTML |
| `EMAIL` | `subjectTemplate` | `contentTemplate` | ✅ 可选 | 配置 `html_content_template` 后发 multipart |
| `PUSH` | JSON 内 `title` | JSON 内 `body` | ❌ | 正文必须是合法 JSON |
| `WECOM` / `FEISHU` / `DINGTALK_GROUP_WEBHOOK` | 视渠道 | `contentTemplate` | ❌ | 群机器人报文 |

## 6. 从 `${key}` 迁移

升级脚本已经处理机器可识别的转换：

```text
${orderNo}          ->  [(${orderNo})]
${notify.channelType} -> [(${notify.channelType})]
```

脚本位置：`docs/sql/unreleased/{mysql,postgresql}/05-notify-template-thymeleaf-html.sql`。执行顺序：

1. 先跑脚本里的「字段编码校验」，结果必须为空；不合规的 `field_code` 先人工修正。
2. 再执行 `${key}` → `[(${key})]` 的更新段。
3. 最后跑「残留复核」，确认剩下的 `${...}` 都是有意保留的普通文本。

注意：脚本只转换 `[A-Za-z_][A-Za-z0-9_.]*` 形态的占位符；混合在普通文本里的其它 `${...}` 会保持原样，需要人工确认。
