---
title: 移动端基座总览
date: 2026-10-02 10:45
tags: [nebula, guide]
---

# 移动端基座总览

## 1. 定位

`mobile/` 是一个 **React Native 新架构 + TypeScript** 的移动端基座工程，把「每个业务 App 都要重写一遍的横切能力」做成框架层，一套代码输出 **iOS / Android / 鸿蒙（RNOH）**。

它服务两类人：

- **业务开发团队**：使用 nebula 做移动 App 的项目组，在基座之上写业务页面。
- **最终用户**：App 使用者（如仓储 / 配送 / 销售）。

**基座只提供能力与约定，不提供业务页面。** 它明确做与不做：

| 基座做 | 基座不做 |
| --- | --- |
| 请求封装、token 注入、401 单飞刷新 | 业务页面与业务逻辑 |
| 权限显隐（`<Access>` / `usePermission`）、菜单 → 导航映射 | 后端模块实现 |
| 字典 / 系统参数读取与缓存 | 原生 iOS / Android / 鸿蒙工程内容（需 `react-native init` 式落地） |
| 上传策略路由、分片、绑定、鉴权下载与图片预览 | 真实推送凭据、地图 Key 等敏感配置 |
| 分页列表、空态/错误态/加载态、扫码、选择器 | — |
| 弱网重试队列、端标识与诊断、版本检查、推送接入、站内信 | — |

与 `web/` 的关系：基座**不是 `web/` 的移植**。`web/` 是 antd 桌面中台、全仓无响应式布局，页面与布局层零复用；可借鉴的只有「横切机制」。基座沿用 `web/` 已有的组件前缀 `Ne*`，保持跨端一致。

## 2. 目录结构

```text
mobile/
├── App.tsx / index.js          # 应用入口（业务工程在此之上组装页面）
├── package.json / tsconfig.json / babel.config.js / metro.config.js / app.json
├── src/
│   ├── request/                # 请求客户端、envelope 解包、错误、传输抽象
│   ├── session/                # 会话管理、安全存储适配（Keychain / Keystore）
│   ├── bootstrap/              # 启动引导：/api/frontend/init 拉取与默认值兜底
│   ├── auth/                   # <Access>、usePermission、权限码匹配
│   ├── navigation/             # 菜单树 → 导航结构、组件注册表
│   ├── dict/  param/           # 字典、系统参数读取与缓存
│   ├── storage/                # 上传策略路由、分片、绑定、鉴权图片、压缩
│   ├── notify/                 # 站内信、公告、未读数轮询、偏好设置、通知渠道对齐
│   ├── push/                   # 设备注册、心跳、深链路由
│   ├── upgrade/                # 版本检查与升级判定
│   ├── offline/                # 弱网重试队列
│   ├── components/             # 分页列表、扫码输入、状态机
│   ├── i18n/  theme/           # 国际化、主题
│   └── diagnostics/            # 端标识、结构化日志、错误上报
└── test/                       # Node 可执行单测（node --test）
```

各目录职责：

| 目录 | 内容 |
| --- | --- |
| `request/` | `createRequestClient`（单飞刷新、`X-Client-Type` 注入）、`unwrapEnvelope`（`{code,message,data}` 解包）、`errors`、`transport` 抽象 |
| `session/` | `createSessionManager`、`SecureTokenStorage` 抽象与 RN 适配；规则来自 `client-sdk/token-session` |
| `bootstrap/` | `runBootstrap`：先 init 再 current-user；init 失败不白屏，用兜底默认值 |
| `auth/` | `usePermission`、`<Access>`、权限码匹配（三段式/通配、超管短路） |
| `navigation/` | 菜单树映射底部 Tab + 二级列表；组件注册表；未知组件走占位页 |
| `storage/` | 上传策略路由（简单/分片 + 重试）、bind、`AuthenticatedImage` 鉴权图片、客户端压缩 |
| `notify/` | 站内信 / 公告服务与轮询、偏好模型与置灰、稳定通知渠道 ID（内置类别 ↔ 系统渠道；服务端下发的自定义类别回退 `DEFAULT` 渠道） |
| `push/` | 设备注册 / 心跳 / 注销、点击深链路由 |
| `upgrade/` | `evaluateUpgrade` / `evaluateUpgradeFromInit`：整数 versionCode 比较，判定 NONE / OPTIONAL / FORCE |
| `offline/` | 弱网重试队列（内存规则，持久化由 App 壳注入） |
| `components/` | `NePageList` 分页状态机、`NeScanInput` 扫码与输入通道 |
| `diagnostics/` | `X-Client-Type: APP`、UA、结构化日志、token 脱敏 |

## 3. 与后端契约的关系

基座消费的服务端契约固定来自 `packages/client-sdk`（端点常量 + 类型），业务方不直接碰协议细节。几个关键契约：

- **统一响应信封**：服务端返回 `{code, message, data}`，`code == "0"` 为成功，其余为业务错误码；`message` 已是本地化文案，**直接展示，不自建 code→文案映射**。
- **端类型**：所有请求显式注入 `X-Client-Type: APP`。服务端判定优先 UA 强特征容器 > 该头 > UA 推断；RN 的 UA 未必稳定带特征，**必须显式注入**。
- **启动引导是两步**：`GET /api/frontend/init`（匿名，含登录开关、上传策略、默认主题、推送配置、版本策略）**不含菜单与权限**；菜单与权限码来自 `GET /api/auth/current-user`。
- **上传两阶段**：先上传得到临时 task，`bind` 之后才产生正式 `fileId`；未 bind 的临时文件会被清理。
- **鉴权下载**：`GET /api/storage/download` 需登录，返回二进制流。图片预览先用 `GET /api/storage/download-location` 解析位置：`mode=PROXY` 时走带 token 的 blob 获取（`AuthenticatedImage`），`mode=DIRECT`（对象存储开启直连）时直接用返回的预签名直链；`release()` 只回收自己创建的 blob URL，不会去 revoke 直链。

## 4. 与后端新增能力的对接

基座对接了本批的三个服务端能力：

| 能力 | 对接位置 | 服务端文档 |
| --- | --- | --- |
| 通知订阅偏好（消息设置页） | `src/notify/preferences` | [Notify · 业务功能](../notify/business-capabilities) |
| 移动推送设备注册 | `src/push` | [Notify · 设计与实现](../notify/design-and-implementation) |
| 应用版本与升级检查 | `src/upgrade` | [Frontend · 应用版本与升级检查](../frontend/app-release) |

## 5. 当前交付边界（重要）

基座在**无 iOS / Android / 鸿蒙构建工具链、无真机/模拟器**的环境下交付，可验证的只有 TypeScript 源码 + 工程配置 + Node 可执行测试。

| 已落地并验证 | 验证方式 |
| --- | --- |
| `packages/client-sdk`：类型契约、端点常量、token 规则、端类型常量 | `tsc --noEmit` + `node --test` |
| `mobile/src`：请求/会话/引导/权限/导航/文件/字典参数/站内信/推送路由/升级/离线/诊断/主题国际化 | `tsc --noEmit` + `node --test` |
| 工程配置：`package.json` / `tsconfig.json` / `babel` / `metro` / `app.json` / 入口 | 配置与入口源码就位 |

| 未验证 / 环境阻塞 | 原因 |
| --- | --- |
| 三端原生工程（`ios/`、`android/`、`ohos/`）与构建脚本 | 需 Xcode / Gradle / RNOH 工具链与 `react-native` 初始化 |
| 真机启动、导航渲染、相机/相册/压缩、Keychain/Keystore 实机读写 | 需原生运行时与设备 |
| 真实推送下发、通知渠道注册、应用签名 | 需厂商凭据、设备与签名物料 |
| `Access.tsx` 等 React/RN 组件的编译 | 无 `react` / `react-native` 类型环境，未纳入 `tsc` 编译图；其背后的纯逻辑均已单测覆盖 |

> 结论：**框架层可开工**——业务工程可按这些类型与能力并行开发；但在具备三端工具链的机器上仍需完成原生工程落地与组件编译，方可算「基座可用」。

## 6. 编码约定

- **命名**：权限组件 `Access`、权限 Hook `use{Purpose}`、请求服务 `{Domain}Service`、组件 `Ne{Purpose}`。
- **401**：交由单飞刷新；刷新失败清会话 + 跳登录（唯一会打断用户的模态场景）。
- **业务错误码**：直接展示服务端 `message`（轻提示），不弹模态；权限不足提示「无权限」而不是「系统错误」。
- **存储实现必须各自不同**：`web/` 用 localStorage，RN 用 Keychain/Keystore，小程序用 `wx.setStorageSync`；三者共享的只有**规则**。
- **`hidden = 1` 的菜单不进导航，但仍要注册路由**（业务可能从通知或扫码跳转进去）。

详见 [使用方式](./usage-guide)。
