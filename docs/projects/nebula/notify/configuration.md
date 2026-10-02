---
title: Nebula Notify 配置说明
date: 2026-10-02 10:20
tags: [nebula, notify, configuration]
---

# Nebula Notify 配置说明

`nebula-notify` 的配置分三类：

1. **静态配置** `nebula.notify.*`（`NotifyProperties`）：运行模式、缓存、推送。
2. **系统参数** `notify.email.*`：邮件发送配置，运行期从参数中心读取。
3. **远程配置** `nebula.notify.remote.*`：微服务消费者使用。

> **凭据只走环境变量**：APNs 私钥、邮件密码等一律从环境变量注入，**禁止写入配置库、仓库或日志**。

---

## 1. `nebula.notify.*` 总览

```yaml
nebula:
  notify:
    mode: local                      # local / remote
    cache-ttl-seconds: 300           # 模板与类别缓存 TTL（秒）
    push:
      enabled: false                 # 移动推送总开关，默认 false
      max-devices-per-user: 10
      apns:
        key-id: ${NEBULA_NOTIFY_PUSH_APNS_KEY_ID:}
        team-id: ${NEBULA_NOTIFY_PUSH_APNS_TEAM_ID:}
        private-key: ${NEBULA_NOTIFY_PUSH_APNS_PRIVATE_KEY:}
        topic: ${NEBULA_NOTIFY_PUSH_APNS_TOPIC:}
        production: ${NEBULA_NOTIFY_PUSH_APNS_PRODUCTION:false}
        endpoint: ${NEBULA_NOTIFY_PUSH_APNS_ENDPOINT:}
```

> 原先的 `nebula.notify.preference.*`（`enabled` / `default-quiet-timezone`）已删除：订阅偏好判定永远生效，类别行为由 `sys_notify_category` 数据决定。

### 1.1 `nebula.notify.mode`

- `local`：使用本地实现与控制器。
- `remote`：作为消费者，通过 Feign 转调独立 notify 服务。

### 1.2 缓存

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `nebula.notify.cache-ttl-seconds` | `300` | 通知模板与通知类别缓存 TTL（秒）。类别增删改会**主动清缓存**，无需等 TTL |

### 1.3 订阅偏好

偏好判定**没有配置开关**（原先的 `nebula.notify.preference.enabled` 与 `nebula.notify.preference.default-quiet-timezone` 已随免打扰功能一并删除）：判定永远生效，类别与渠道规则全部来自 `sys_notify_category` 数据，改类别属性即可调整行为。

### 1.4 移动推送

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `nebula.notify.push.enabled` | `false` | 推送总开关，同时是**回退杠杆**。关闭时不注册任何厂商发送器，PUSH 投递记 `PUSH_DISABLED`（22024），设备注册被拒；站内信与邮件完全不受影响 |
| `nebula.notify.push.max-devices-per-user` | `10` | 单用户单次扇出上限，超出按最后活跃时间保留前 N 台并打 WARN |

### 1.5 APNs 凭据（`nebula.notify.push.apns.*`）

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `key-id` | 无 | APNs 私钥 ID（`.p8` 文件名去掉后缀） |
| `team-id` | 无 | Apple Team ID |
| `private-key` | 无 | `.p8` 私钥内容（PKCS#8 PEM），**只走环境变量** |
| `topic` | 无 | APNs topic，通常是 App bundle id |
| `production` | `false` | `false` 走 `api.sandbox.push.apple.com`，`true` 走 `api.push.apple.com` |
| `endpoint` | 无 | 覆盖 APNs 服务地址（联调/测试用） |

**装配条件**：推送开启 **且** `key-id` / `team-id` / `private-key` / `topic` 四项全部非空，才注册 `ApnsPushChannelSender`；缺任一即不注册，命中时记 `PROVIDER_NOT_CONFIGURED`，而不是等线上第一条派单才发现漏配。

推荐的环境变量注入：

```yaml
nebula:
  notify:
    push:
      enabled: ${NEBULA_NOTIFY_PUSH_ENABLED:false}
      apns:
        key-id: ${NEBULA_NOTIFY_PUSH_APNS_KEY_ID:}
        team-id: ${NEBULA_NOTIFY_PUSH_APNS_TEAM_ID:}
        private-key: ${NEBULA_NOTIFY_PUSH_APNS_PRIVATE_KEY:}
        topic: ${NEBULA_NOTIFY_PUSH_APNS_TOPIC:}
        production: ${NEBULA_NOTIFY_PUSH_APNS_PRODUCTION:false}
```

| 环境变量 | 说明 |
| --- | --- |
| `NEBULA_NOTIFY_PUSH_ENABLED` | 推送总开关 |
| `NEBULA_NOTIFY_PUSH_APNS_KEY_ID` | APNs 私钥 ID |
| `NEBULA_NOTIFY_PUSH_APNS_TEAM_ID` | Apple Team ID |
| `NEBULA_NOTIFY_PUSH_APNS_PRIVATE_KEY` | APNs 私钥内容（`.p8` PEM；支持字面 `\n`） |
| `NEBULA_NOTIFY_PUSH_APNS_TOPIC` | APNs topic |
| `NEBULA_NOTIFY_PUSH_APNS_PRODUCTION` | 是否生产环境端点 |

---

## 2. 邮件配置（系统参数 `notify.email.*`）

邮件发送不通过 `NotifyProperties`，而是运行期从系统参数中心读取（`NotifyEmailParamKeys`）：

| 参数键 | 默认值 | 说明 |
| --- | --- | --- |
| `notify.email.smtp-host` | 无（必填） | SMTP 主机；缺失抛异常 |
| `notify.email.smtp-port` | `587` | SMTP 端口 |
| `notify.email.security` | `STARTTLS` | 连接安全方式，支持 `NONE` / `STARTTLS` / `SSL` |
| `notify.email.username` | 无（必填） | SMTP 用户名，同时作为发件人 `from` |
| `notify.email.password` | 无（必填） | SMTP 密码；**只走环境变量，禁止入库入仓** |

这些参数在管理端「参数中心」维护，修改后无需重启。测试邮件配置可用 `POST /api/notify/email/test`（权限码 `NOTIFY_SEND`，另记审计）。

---

## 3. 远程配置（`nebula.notify.remote.*`）

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `nebula.notify.remote.service-name` | `nebula-notify-service` | Feign 服务名 |
| `nebula.notify.remote.service-url` | 无（空串） | Feign 直连地址，本地开发用 |

```yaml
nebula:
  notify:
    mode: remote
    remote:
      service-name: nebula-notify-service
      service-url: http://localhost:9903
```

---

## 4. 独立服务示例

`nebula-notify-service/src/main/resources/application.yml` 的关键项：

- `server.port: 9903`
- `nebula.architecture.mode: remote`
- `nebula.notify.mode: local`
- `nebula.cache.type: caffeine`、`nebula.cache.default-ttl: 300`

---

## 5. 生产环境注意事项

- 推送默认关闭：启用需同时打开总开关并配齐四项 APNs 凭据（只走环境变量）。
- 邮件密码、APNs 私钥禁止入库入仓入日志。
- 偏好开关默认关闭：分阶段灰度时可用它先落 `category_code` 观察数据，确认后再打开判定。注意关闭是**整体放行**——渠道校验（`CHANNEL_NOT_ALLOWED`）在开关关闭时同样不生效。
- 关闭总开关是**回退杠杆**：线上推送出问题时关闭 `nebula.notify.push.enabled` 即停止一切推送投递与设备注册，站内信与邮件不受影响。
