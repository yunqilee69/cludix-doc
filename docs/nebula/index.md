---
slug: /nebula
title: "[草稿] 星云中台快速上手"
description: 面向第一次接触 Nebula 的开发者，快速理解后端平台、前端基座和协作方式。
---

# [草稿] 星云中台快速上手

Nebula 由两部分组成：

- 后端平台仓库：`nebula`
- 前端工作台仓库：`nebula-portal`

如果你是第一次接触这个项目，建议先把它理解成一套“可单体运行、可渐进拆分、前后端约定比较清晰”的企业中台底座：后端负责认证、菜单、权限、字典、参数、通知、存储、通信等平台能力，前端负责 Shell、动态菜单、权限渲染、共享 UI 和业务模块装载。

## 先看什么

推荐按下面顺序阅读：

1. [后端总览](/docs/nebula/backend)：先看怎么启动、模块怎么选。
2. [前端总览](/docs/nebula/frontend)：再看前端 Shell 如何接后端能力。
3. [设计总览](/docs/nebula/design)：最后理解为什么这样分层、这样拆模块。
4. [示例](/docs/nebula/examples)：对照典型场景把链路串起来。

## 你会在这里看到什么

### 后端

- `nebula-app-starter` 单体启动方式
- `auth / dict / param / notify / storage / comms / gateway` 的职责划分
- 单体集成、专项能力接入、微服务拆分三种使用路径

### 前端

- `apps/shell` 如何做登录态、动态菜单、权限和模块装载
- `@platform/core` 暴露了哪些平台能力
- `@platform/ui` 与 `NeFileUploader` 如何复用 Nebula 的存储模型

### 设计

- `api / core / local / remote / service` 的统一分层
- 网关聚合 OpenAPI 的原因
- Nebula Storage 两阶段上传模型

### 示例

- 单体后台与前端 Shell 的协作方式
- 业务模块如何挂载到前端基座
- 文件上传从前端到后端绑定转正的完整流程

## 30 分钟上手清单

如果你希望第一次就把前后端都跑起来，建议按下面顺序执行：

1. 准备 Java 21、Maven、Node.js、pnpm，以及后端依赖的 MySQL、Redis
2. 启动后端单体入口：`mvn spring-boot:run -pl nebula-app/nebula-app-starter`
3. 启动前端 Shell：在 `nebula-portal` 中执行 `pnpm dev`
4. 打开前端本地地址，确认能看到登录页或工作台入口
5. 确认后端接口和聚合文档可访问，再进入页面联调

建议把这五步当成首次接入的成功标准：后端能启动、前端能启动、登录链路能通、菜单能展示、接口文档能打开。

## 当前最短上手路径

如果你的目标是“尽快跑通并开始开发”，可以直接走这条路径：

1. 阅读 [后端快速启动](/docs/nebula/backend/quick-start)
2. 阅读 [前端接入总览](/docs/nebula/frontend)
3. 阅读 [前端认证、菜单与权限](/docs/nebula/frontend/auth-menu-permission)
4. 阅读 [单体后台协作示例](/docs/nebula/examples/monolith-collaboration)

## 现有专题文档

除了本次补充的快速上手文档，当前站点里还有两类更偏专题的 Nebula 文档。它们更适合在你完成初次接入后再深入阅读：

- [项目分层对象命名规约说明书](/docs/nebula/spec)
- [IAM 相关设计文档](/docs/nebula/iam)

如果你只是第一次接手项目，建议先完成本页推荐的快速上手路径，再进入这些深水区文档。
