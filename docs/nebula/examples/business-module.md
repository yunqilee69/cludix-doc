---
slug: /nebula/examples/business-module
title: "[草稿] 业务模块挂载示例"
description: 说明业务前端模块如何通过 PlatformModule 挂到 Nebula Shell 中。
---

# [草稿] 业务模块挂载示例

Nebula 前端的一个关键特点，是业务模块不是直接改 Shell 主体，而是通过 `PlatformModule` 注册进来。这让平台能力和业务能力保持了清晰边界，也方便后续做远端模块扩展。

## 一个最小模块需要提供什么

参考 `apps/demo-business/src/register.ts`，一个业务模块至少会声明：

- `id`、`name`、`version`
- `components`：组件 key 到实际页面组件的映射
- `menus`：模块自己的菜单定义
- `routes`：路径与组件 key 的对应关系
- 可选 `bootstrap`：模块初始化逻辑

## 它为什么能自动出现在 Shell 中

原因并不复杂：

1. 模块先完成注册
2. Shell 在启动时装载已注册模块
3. `packages/core` 把模块路由和平台路由拼起来
4. 菜单、权限和组件 key 对齐后，页面就能被导航和渲染

## 对接 Nebula 后端时怎么理解

业务模块不应该重新接管登录、权限和平台菜单，而是应该站在现有 Shell 和 `AppContext` 之上工作：

- 需要请求能力时走 `request`
- 需要权限判断时走 `usePermission` 或 `NePermission`
- 需要字典、参数、通知、存储能力时走平台上下文

这样做的好处是，新增业务模块只关注业务本身，而平台协作方式始终保持一致。
