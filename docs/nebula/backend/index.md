---
slug: /nebula/backend
title: "[草稿] 后端接入总览"
description: 面向 Java 开发者，快速理解 Nebula 后端的启动方式、模块选型和接入路径。
---

# [草稿] 后端接入总览

Nebula 后端不是一个单独的业务系统，而是一组可以按需组合的中台模块。第一次接入时，不要先纠结每个模块内部细节，先判断你属于哪一种使用方式：快速单体验证、按模块接入现有项目，还是逐步拆成独立服务。

## 最常见的三种使用方式

### 单体验证

使用 `nebula-app/nebula-app-starter`，最快看到完整平台能力。

### 模块集成

按需引入 `*-local` 模块，把认证、字典、参数、通知、存储等能力接到现有 Spring Boot 工程。

### 微服务拆分

启动各业务模块的 `*-service`，再通过 `nebula-gateway-service` 统一暴露接口与文档入口。

## 推荐阅读

- [后端快速启动](/docs/nebula/backend/quick-start)
- [模块选型建议](/docs/nebula/backend/module-selection)
- [认证、菜单与权限后端说明](/docs/nebula/backend/auth-and-permission)
- [网关与接口文档聚合](/docs/nebula/backend/gateway-and-docs)

## 你需要先记住的几个事实

- 根仓库使用 Java 21 和 Maven 多模块结构
- `nebula-base` 是所有业务模块默认依赖的基础设施层
- `nebula-auth` 是前后端协作中最关键的模块，因为它决定登录、菜单、按钮和权限模型
- `nebula-gateway-service` 是最适合前端联调和统一查看 API 文档的入口
