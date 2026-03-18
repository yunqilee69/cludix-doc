---
slug: /nebula/frontend/business-module-development
title: "[草稿] 业务模块开发方式"
description: 面向前端业务开发者，说明如何在 nebula-portal 中新增和接入业务模块。
---

# [草稿] 业务模块开发方式

Nebula 前端鼓励把业务能力做成可挂载模块，而不是直接把业务页面塞进 Shell 主体。这样平台和业务的边界更清晰，也更适合后续扩展成 embedded 或 federation 两种加载模式。

## 新模块通常从哪里开始

最直接的起点有两个：

- `apps/demo-business`：现成的示例模块
- `templates/business-starter`：新模块脚手架模板

如果你是第一次开发业务模块，建议先看示例，再用模板起新模块，而不是手写全部注册结构。

## 一个业务模块至少要声明什么

按当前 `PlatformModule` 约定，一个模块至少会提供：

- 模块基础信息：`id`、`name`、`version`
- `components`：组件 key 到页面组件的映射
- `menus`：模块自己的菜单定义
- `routes`：路由路径与组件 key 的关系
- 可选 `bootstrap`：模块初始化逻辑

## 业务模块真正应该关注什么

业务模块最应该投入精力的部分，是自己的页面、菜单、领域请求和业务状态。平台层的登录、权限、布局、存储地址解析、共享 UI 和工作台交互，优先复用现成能力。

## 推荐阅读顺序

1. `business-module-development-manual.md`
2. `apps/demo-business/src/register.ts`
3. `templates/business-starter`
4. `packages/core/README.md`

这四部分连起来看，基本就能理解一个新模块该如何进场。
