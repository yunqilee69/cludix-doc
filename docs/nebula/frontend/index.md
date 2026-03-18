---
slug: /nebula/frontend
title: "[草稿] 前端接入总览"
description: 面向 nebula-portal 和业务前端开发者，理解如何接入 Nebula 后端平台。
---

# [草稿] 前端接入总览

Nebula 的前端接入不是“从零搭一个后台”，而是站在 `nebula-portal` 这套基座之上接后端平台能力。你真正需要理解的只有三件事：Shell 如何管理登录态和路由，`@platform/core` 提供了哪些共享能力，以及业务模块应该接什么、不该重复做什么。

## 先看哪些目录

- `apps/shell`：前端平台主应用，负责登录、布局、菜单、权限和模块装载
- `packages/core`：共享上下文、权限、事件总线、模块注册和平台路由
- `packages/ui`：共享 UI 组件
- `apps/demo-business`：示例业务模块
- `templates/business-starter`：新业务模块脚手架模板

## 适合怎么理解这套前端

### 你是平台维护者

重点看：

- `apps/shell/src/app.tsx`
- `apps/shell/src/modules/runtime/*`
- `packages/core/*`

### 你是业务模块开发者

重点看：

- `business-module-development-manual.md`
- `apps/demo-business/src/register.ts`
- `templates/business-starter/*`

### 你是联调开发者

重点看：

- [认证、菜单与权限](/docs/nebula/frontend/auth-menu-permission)
- [文件上传接入](/docs/nebula/frontend/storage-integration)

## 推荐继续阅读

- [Shell 与 AppContext](/docs/nebula/frontend/shell-and-app-context)
- [业务模块开发方式](/docs/nebula/frontend/business-module-development)
- [认证、菜单与权限](/docs/nebula/frontend/auth-menu-permission)
- [文件上传接入](/docs/nebula/frontend/storage-integration)

## 前端最重要的接入结论

- 登录、会话刷新、权限判断、动态菜单，不建议业务模块自行实现
- 字典、参数、通知、请求、文件地址解析等平台能力，优先从 `AppContext` 获取
- 页面容器、查询区、表格区、抽屉、文件上传器优先复用 `@platform/ui`
- 业务模块主要维护自己的页面、菜单元数据、组件映射和初始化逻辑
