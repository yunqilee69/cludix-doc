---
title: 移动端基座使用方式
date: 2026-10-02 10:55
tags: [nebula, guide]
---

# 移动端基座使用方式

本文说明三件事：如何在基座之上写业务工程、如何构建三端、模板仓如何拿到 `mobile/`。

## 1. 获取基座

`mobile/` 与 `packages/` 已登记进 `.github/workflows/sync-template.yml` 的 `TEMPLATE_DIRS`，CI 在打 `v*` tag 或手动触发时把二者同步到完整模板仓 `yunqilee69/nebula-template`。业务团队的路径是：

1. Fork / Clone `yunqilee69/nebula-template`（模板仓，已含 `web/` + `backend/` + `mobile/` + `packages/` + `docs/` + `.agents/` + `scripts/`）。
2. 在 `mobile/` 之上开发业务 App；`packages/client-sdk` 随仓库一并携带。

> 主仓新增模板目录**必须**登记到 `TEMPLATE_DIRS`，否则模板仓会静默缺目录且不报错。三端依赖与构建产物（`node_modules`、`ios/Pods`、`.gradle`、`ohos/build` 等）已在同步工作流中排除。

## 2. 在本机跑通框架层（当前可验证的部分）

基座当前交付的是**框架层源码 + 工程配置 + Node 可执行测试**，没有原生工程。可先在本地跑类型检查与单测：

```bash
# 共享契约包
cd packages/client-sdk
npm install
npm run typecheck
npm run test

# 移动端基座
cd ../../mobile
npm install
npm run typecheck
npm run test
```

`mobile/package.json` 提供的脚本：

| 脚本 | 作用 |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | `node --test "test/**/*.test.ts"` |
| `npm run start` | 启动 Metro |
| `npm run android` / `ios` / `ohos` | 三端运行（需原生工程与工具链） |

## 3. 落地三端原生工程

基座**尚未生成** `ios/`、`android/`、`ohos/` 原生工程——这需要 Xcode / Gradle / RNOH 工具链与 `react-native` 初始化，在具备工具的机器上完成。落地后：

1. 用 React Native CLI 在 `mobile/` 下生成对应平台工程（新架构开启）。
2. 鸿蒙端接入 RNOH（React Native for OpenHarmony）。
3. 接入平台安全存储适配（`src/session/secure-storage-rn.ts` 对接 Keychain / Keystore / 鸿蒙对应能力）。
4. 接入相机 / 相册 / 压缩 / 扫码的原生模块（`src/storage`、`src/components/scan` 的纯逻辑已就位，需补原生运行时）。
5. 配置应用签名、包名、图标、启动图。

> **不要在原生工程落地时把 `node_modules`、`ios/Pods`、`.gradle`、`ohos/build` 提交进主仓**——同步工作流已排除它们。

## 4. 在其上写业务工程

业务工程在基座之上组装页面，**不改基座框架层**。典型流程：

### 4.1 启动

```ts
// App 壳：先跑引导，再渲染主界面
const bootstrap = await runBootstrap({
  fetchInit: () => request.get(FRONTEND_ENDPOINTS.init, { params: { platform: 'ANDROID', channel: 'INTERNAL' } }),
  fetchCurrentUser: () => request.get(AUTH_ENDPOINTS.currentUser),
  onInitFallback: (e) => logger.warn('init 兜底', e),
});
// bootstrap.init / bootstrap.permissionCodes / bootstrap.menuTree
```

- 两步（init + current-user）都完成才渲染主界面。
- `init` 失败**不白屏**：`initFromFallback=true`，UI 应允许重试。
- `current-user` 失败**直接抛**（token 未过期时视为网络问题，由调用方重试，而不是登出）。

### 4.2 请求与 401

用 `createRequestClient` 创建客户端，注入 `getAccessToken`、`refreshAccessToken`、`onUnauthorized`、`transport`。并发 401 只触发一次刷新；刷新请求自身带 `skipAuthRefresh` 不递归；每个请求自动注入 `X-Client-Type: APP`。

### 4.3 权限显隐

```tsx
<Access permission="WMS_ORDER_CREATE">
  <Button title="新建订单" />
</Access>
```

无权限时**不渲染**（不是禁用）。服务端返回 `BUTTON_PERMISSION_DENIED`（`18002`）时提示「无权限」而不是「系统错误」。

### 4.4 导航

菜单树来自 `current-user.menuList`。目录 → 底部 Tab 或工作台分组；页面 → 二级列表/详情路由；`hidden = 1` 不进导航但**仍要注册路由**；未知 `component` 走显式占位页而不是白屏。组件注册表把后端 `component` 字符串映射到页面组件（移动端映射表与 web 不同，不可复用）。

### 4.5 上传与图片

```ts
// 上传（按策略自动选简单/分片）→ bind → 得到正式 fileId
const task = await uploadService.upload(file);
const { fileId } = await uploadService.bind(task.taskId, { sourceEntity: 'WMS_ORDER', sourceId, sourceType: 'ATTACHMENT' });
```

- 必须 `bind` 之后才有正式 `fileId`；只存 taskId 会在临时文件被清理后失效。
- 图片回显走 `<AuthenticatedImage fileId={fileId} />`（带 token 取 blob），**不要用裸图片 URL**。

### 4.6 升级与推送

- 升级：`evaluateUpgrade({ currentVersionCode, check })` 或 `evaluateUpgradeFromInit({ currentVersionCode, frontendConfig })`，返回 `NONE` / `OPTIONAL` / `FORCE`；`FORCE` 时必须阻断进入业务界面。判定依据是**整数 versionCode**。
- 推送：`GET /api/frontend/init` 的 `push` 节点决定初始化哪个 SDK（`enabled` + `vendors`）；注册设备后按 `src/push` 的心跳与深链路由接入。

### 4.7 站内信与公告

推送未接入时的兜底触达是 `P0`：轮询未读数（`siteMessagesUnreadCount`）、收件箱、冷启动弹窗公告（`announcementsCurrentPopup`）。只有轮询，没有 WebSocket / SSE。

## 5. 边界与注意事项

- **服务端契约只有一个消费者**：登录契约、`current-user` 权限码格式、上传两阶段模型都由基座封装，业务方不直接碰协议细节。
- **token 只能写安全存储**，不得使用明文 AsyncStorage。
- **推送凭据、地图 Key 等敏感配置只走环境变量或构建时注入**，禁止入库入仓。
- **业务不新增服务端错误码**：基座只消费既有错误码，未知错误码展示服务端 `message` 并上报诊断日志。
