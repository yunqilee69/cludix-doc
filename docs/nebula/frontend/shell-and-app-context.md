---
slug: /nebula/frontend/shell-and-app-context
title: "[草稿] Shell 与 AppContext"
description: 说明 nebula-portal 如何把平台能力沉淀为 Shell 和共享上下文。
---

# [草稿] Shell 与 AppContext

Nebula 前端最核心的设计，不是某个页面长什么样，而是把平台能力收口到 Shell 和 `AppContext`。这样业务模块不需要重复实现登录态、权限、请求、字典、通知和存储地址解析。

## Shell 负责什么

`apps/shell` 负责整个平台运行期最重的那一层：

- 会话恢复和刷新
- 登录页与受保护页面切换
- 布局、工作台、异常页
- 动态菜单和动态路由
- 远端模块加载与启动

可以把它理解成“所有业务模块共同运行的宿主”。

## AppContext 提供什么

`@platform/core` 当前已经把平台能力整理为统一上下文，至少包括：

- `auth`
- `dict`
- `config`
- `notifications`
- `request`
- `storage`
- `i18n`
- `bus`

这些能力本质上是给业务模块复用的，而不是让业务模块重新发明一遍。

## 业务模块应该怎么用

推荐方式是：

- 需要登录态和权限时走 `auth`
- 需要接口请求时走 `request`
- 需要字典、配置、通知时走上下文能力
- 需要文件预览和下载地址时走 `storage`
- 需要和 Shell 或其他模块通信时走事件总线 `bus`

## 不建议做什么

如果你是业务模块开发者，通常不建议再自己做这些事情：

- 维护另一套 token 管理逻辑
- 重新实现权限判断组件
- 为每个业务模块复制一套文件地址拼接逻辑
- 绕过平台上下文直接构造一套平行基座

这样做会让业务模块越来越像独立后台，而不是运行在 Nebula 平台上的业务能力。
