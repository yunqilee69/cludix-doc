---
slug: /nebula/iam
title: "[草稿] Nebula IAM 架构概览"
description: Nebula 中台中的 IAM 实际由 nebula-auth 模块承载，这里说明它的结构和协作方式。
---

# [草稿] Nebula IAM 架构概览

在 Nebula 里，IAM 并不是一个单独叫做 `iam` 的模块，而是由 `nebula-auth` 承载。也就是说，当我们在 Nebula 文档里说 IAM，实际指的是认证、身份、菜单、按钮、角色、组织和权限这一整套能力，而这些能力当前都集中在 `nebula-auth` 中。

## IAM 在 Nebula 中对应什么

当前仓库中，IAM 主要对应 `nebula-auth` 提供的这些能力：

- 登录、注册、刷新令牌、退出登录
- 当前用户信息获取
- 用户管理
- 角色管理
- 权限管理
- 组织管理与组织树
- 菜单管理与菜单树
- 按钮管理
- OAuth2 客户端与账号绑定管理

因此，如果你在项目里讨论“权限中心”“认证中心”或“IAM 模块”，在实际代码层面通常就是在讨论 `nebula-auth`。

## 模块结构

`nebula-auth` 当前采用和 Nebula 其他业务模块一致的标准分层：

```text
nebula-auth/
├── nebula-auth-api      # 契约层：接口、DTO、命令、查询、模块守卫
├── nebula-auth-core     # 核心实现：service、mapper、安全配置
├── nebula-auth-local    # 本地接入层：controller + core
├── nebula-auth-remote   # 远程接入层：Feign client + 远程代理实现
└── nebula-auth-service  # 独立服务启动模块
```

## 每层各自做什么

### `nebula-auth-api`

- 定义认证与权限领域的稳定契约
- 作为其他模块依赖 `auth` 能力时的基础入口

### `nebula-auth-core`

- 承载认证、安全、角色、组织、菜单、按钮、权限等核心实现
- 是 IAM 规则真正落地的地方

### `nebula-auth-local`

- 提供本地 HTTP 接口
- 适合单体项目直接集成

### `nebula-auth-remote`

- 提供远程调用代理
- 适合其他微服务以消费者身份调用认证中心

### `nebula-auth-service`

- 作为独立认证服务启动
- 默认端口是 `17778`

## IAM 的三种使用方式

### 单体集成

业务工程直接依赖 `nebula-auth-local`，适合单体后台或快速集成场景。

### 认证中心独立部署

启动 `nebula-auth-service`，适合把 IAM 能力拆成独立服务。

### 远程调用

其他服务依赖 `nebula-auth-remote`，通过远程方式复用 IAM 能力。

## 为什么前端会强依赖这个模块

`nebula-portal` 的登录态、菜单装载、按钮权限和动态路由，本质上都依赖 `nebula-auth` 提供的数据模型。因此，IAM 在 Nebula 中不只是后端安全模块，也是前端平台结构的重要上游。

## 推荐阅读

- [认证、菜单与权限后端说明](/docs/nebula/backend/auth-and-permission)
- [认证、菜单与权限](/docs/nebula/frontend/auth-menu-permission)
- [Nebula 权限模型说明](/docs/nebula/permission-read)
