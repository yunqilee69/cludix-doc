---
title: 移动端共享契约 client-sdk
date: 2026-10-02 10:50
tags: [nebula, guide]
---

# 移动端共享契约 client-sdk

`packages/client-sdk/` 是**端无关的纯 TypeScript 契约包**，供 `mobile/`（以及后续小程序）与 `web/` 共用，避免 token 与 401 语义各写一份而漂移。

## 1. 边界

| 进这个包 | 不进这个包 |
| --- | --- |
| 纯类型定义（请求/响应/分页/枚举） | 任何 React / React Native 组件 |
| 接口路径常量 | 传输实现（axios / fetch / wx.request） |
| token 语义与过期规则（**规则，不是存储实现**） | UI、路由、构建配置 |
| 端类型常量 | 状态管理实现 |

**存储实现必须各自不同**：`web/` 用 localStorage，RN 用 Keychain/Keystore，小程序用 `wx.setStorageSync`。三者共享的只有规则。

> **当前 `web/` 完全不引用该包**（`web/package.json`、`vite.config.ts`、`tsconfig` 均无）。让 `web/` 真正消费它属于对在用模板工程的重构，是独立风险项，需单独立项；基座先在 `mobile/` 侧落地。

## 2. 包入口

```ts
// packages/client-sdk/index.ts
export * from './client-type.ts';
export * from './endpoints.ts';
export * from './token-session.ts';
export * from './types/index.ts';
```

## 3. 端类型（`client-type.ts`）

```ts
export type ClientType = 'WEB' | 'H5' | 'MP_WEIXIN' | 'MP_ALIPAY' | 'APP' | 'API' | 'UNKNOWN';

export const CLIENT_TYPE_APP: ClientType = 'APP';
export const CLIENT_TYPE_HEADER = 'X-Client-Type';
export const CLIENT_TYPES: readonly ClientType[] = [/* 全部合法取值 */];
```

取值与后端 `ClientType` 枚举名一一对应。**移动基座所有请求都必须显式带 `X-Client-Type: APP`**——服务端判定优先级是 UA 强特征容器 > 该头 > UA 推断，RN 的 UA 未必稳定带 `okhttp`/`CFNetwork`/`Dart` 特征。

## 4. 端点常量（`endpoints.ts`）

所有端只从这里取路径，不散落魔法字符串。带路径参数的端点用函数表达：

| 常量 | 内容 |
| --- | --- |
| `AUTH_ENDPOINTS` | 登录/刷新/登出、`current-user`、验证码登录、忘记密码三步、`profile`、OAuth2 绑定、登录记录 |
| `FRONTEND_ENDPOINTS` | `init`、`appReleaseCheck` |
| `STORAGE_ENDPOINTS` | 上传策略、简单上传、分片（`uploadTaskPart(taskId, partNo)` 等函数）、`bind`、文件详情/分页、下载、`downloadLocation`（下载位置解析，按 `fileId` 或业务归属批量，恒返回数组）、签名下载 |
| `DICT_ENDPOINTS` | `itemsByCode(dictCode)` |
| `PARAM_ENDPOINTS` | `value` / `boolean` / `integer` / `detail` |
| `NOTIFY_ENDPOINTS` | 站内信、公告、通知偏好、推送设备（含 `pushDevice(deviceId)` 等函数） |
| `ANONYMOUS_ENDPOINTS` | 匿名白名单端点列表 |
| `isAnonymousEndpoint(url)` | 判断路径是否属于匿名白名单（精确匹配，忽略查询串） |

匿名白名单包含登录、刷新、注册、忘记密码、`get-auth-config`、`init` 与版本检查——这些端点**不带 `Authorization`**。

## 5. Token 会话规则（`token-session.ts`）

本文件只提供**规则**，不提供存储实现。三条不能被破坏的语义：

1. **`accessTokenExpiresIn` / `refreshTokenExpiresIn` 是绝对毫秒时间戳，不是剩余秒数。** 按「秒数」计算会造成 token 提前失效或误判。
2. **`refreshToken` 单次有效**：刷新必须单飞（single-flight），刷新成功后旧 refreshToken 立即作废。
3. **清理规则**：任一步失败都要能原子地清空整份会话，不留下半份 token。

导出：

| 导出 | 说明 |
| --- | --- |
| `AuthTokenSession` | 一份完整会话（两个过期字段均为绝对毫秒时间戳） |
| `DEFAULT_ACCESS_TOKEN_SKEW_MS` | 默认时钟偏移 30000ms（到期前 30s 即视为「需刷新」） |
| `toAuthTokenSession(resp)` | 归一化登录响应；token 缺失返回 null（判定登录失败） |
| `isAccessTokenExpired(session, now?, skewMs?)` | 访问令牌是否已过期（含偏移） |
| `isRefreshTokenExpired(session, now?, skewMs?)` | 刷新令牌是否已过期（默认不施加偏移） |
| `canRefreshSession(session, now?)` | 是否仍可用于刷新 |
| `shouldRefreshAccessToken(session, now?, skewMs?)` | 是否需要刷新访问令牌 |
| `isSessionUsable(session, now?)` | 会话整体是否仍可用 |
| `serializeAuthTokenSession(session)` | 序列化为可持久化字符串（只允许写入安全存储） |
| `parseAuthTokenSession(raw)` | 从持久化字符串恢复；无法解析返回 null（fail-closed） |

RN 侧的 `session/session-manager.ts` 在这些规则之上叠加 `SecureTokenStorage`，负责与 Keychain/Keystore 交互，规则本身不在 RN 侧重写。

## 6. 类型契约（`types/`）

按域拆分的纯类型定义：`api.ts`（信封、分页）、`auth.ts`（登录、`CurrentUserResp`、`MenuTreeResp` 等）、`dict.ts`、`enums.ts`、`frontend.ts`（`FrontendInitResp`、`FrontendConfigResp`）、`notify.ts`、`push.ts`、`storage.ts`。

这些类型由 `web/src/types` 裁剪而来（去掉引用 React 的部分）。服务端契约变更时只需改一处。
