---
slug: /nebula/examples/monolith-collaboration
title: "[草稿] 单体后台协作示例"
description: 用 nebula-app-starter 加 nebula-portal shell 跑通最常见的本地协作链路。
---

# [草稿] 单体后台协作示例

这是 Nebula 最推荐的新手上手方式：后端先跑 `nebula-app-starter`，前端再跑 `apps/shell`。这种组合可以最快把登录、菜单、权限、字典、参数和部分平台页串起来。

## 场景目标

你希望团队里的后端、前端、联调同学在最短时间内看到一个可用的 Nebula 工作台，而不是一开始就陷入多服务和多端口管理。

## 后端侧

后端启动：

```bash
cd nebula
mvn spring-boot:run -pl nebula-app/nebula-app-starter
```

这会提供一套单体形式的平台能力，适合作为前端初次接入目标。

## 前端侧

前端启动：

```bash
cd nebula-portal
pnpm dev
```

`pnpm dev` 默认只启动 `apps/shell`，并使用 embedded 模式加载示例业务模块，适合本地预览和快速调试。

## 前后端如何对齐

这条链路里，前端最关心三件事：

- 登录与刷新接口是否可用
- 菜单和权限数据是否能驱动动态路由
- 代理或基础地址是否能把请求正确转到后端

只要这三部分是通的，Shell 中的大多数平台能力就能开始工作。

## 什么时候该切换到微服务联调

当你需要单独验证网关、服务独立部署、远程模块联调或者专项能力服务时，再切换到微服务模式更合适。也就是说，单体模式更像是“快速起跑线”，不是长期架构上限。
