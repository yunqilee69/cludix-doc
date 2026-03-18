---
slug: /nebula/design/architecture
title: "[草稿] 整体架构"
description: 从后端平台、前端基座和协作边界理解 Nebula 的完整形态。
---

# [草稿] 整体架构

Nebula 的完整形态由两套仓库协同组成：`nebula` 负责后端中台能力，`nebula-portal` 负责前端 Shell 和业务模块装载。理解这个关系后，很多“为什么这样分层”和“前后端怎么配合”的问题都会变得简单。

## 一张图理解

```text
nebula-portal (前端工作台)
├── apps/shell                # 登录、布局、动态菜单、权限、模块装载
├── packages/core             # AppContext、权限、路由、事件总线、共享契约
├── packages/ui               # 共享 UI 组件
└── apps/demo-business        # 示例业务模块

                │ HTTP / JSON / 文件上传
                ▼

nebula (后端中台)
├── nebula-app                # 单体启动入口
├── nebula-gateway            # 微服务统一入口和 OpenAPI 聚合
├── nebula-auth               # 登录、用户、角色、菜单、按钮、权限
├── nebula-dict               # 数据字典
├── nebula-param              # 系统参数
├── nebula-notify             # 公告、通知、站内信
├── nebula-storage            # 文件上传、绑定转正、鉴权下载
├── nebula-comms              # 飞书/企微/钉钉统一通信
└── nebula-base               # Web、MyBatis、缓存、云调用等基础设施
```

## 后端平台的职责

后端不是只提供“业务接口”，而是在提供一组平台能力：

- `nebula-auth` 提供登录、用户、组织、角色、菜单、按钮和权限模型
- `nebula-dict` 和 `nebula-param` 提供前端常用的字典和动态配置来源
- `nebula-notify` 提供公告、通知模板、记录和站内信能力
- `nebula-storage` 提供文件上传与正式文件管理
- `nebula-comms` 提供企业 IM 统一接入
- `nebula-gateway` 负责统一访问入口和文档聚合

这意味着前端不需要和一堆独立系统重新约定规范，而是围绕一个统一的中台接口风格工作。

## 前端基座的职责

`nebula-portal` 的核心不是一个普通管理后台，而是一个 Shell 化的中台前端基座：

- `apps/shell` 负责登录态恢复、会话刷新、布局、动态路由、异常页和模块加载
- `packages/core` 对外暴露 `AppContext`、权限判断、路由构建、事件总线等平台能力
- `packages/ui` 沉淀共享页面容器、表格区域、表单抽屉、文件上传器等组件
- 业务模块通过 `PlatformModule` 注册菜单、组件和路由，再挂到 Shell 中运行

因此 Nebula 前端不是“每个业务模块独立造后台”，而是“业务模块挂到平台底座上”。

## 两种最常见的协作模式

### 模式一：单体快速启动

- 后端使用 `nebula-app/nebula-app-starter`
- 前端使用 `apps/shell`
- 适合本地开发、功能验证、团队快速上手

### 模式二：渐进式拆分

- 后端按需拆成 `auth / dict / param / notify / storage / comms` 等独立服务
- 网关统一暴露 `/api/...` 和 `/v3/api-docs/...`
- 前端继续使用同一个 Shell，对业务模块和远端服务的感知最小化

## 为什么这套结构适合中台

中台项目最容易出现的两个问题，是“能力散在不同系统里”以及“前后端每个项目都重复造轮子”。Nebula 的结构正好在解决这两个问题：后端把平台能力沉淀为标准模块，前端把通用交互沉淀为 Shell、Core 和 UI，新增业务时只需要在这套底座上扩展。
