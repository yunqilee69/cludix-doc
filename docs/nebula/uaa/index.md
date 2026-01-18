---
title: Nebula-UAA 架构概览
description: Nebula-UAA 微服务认证授权系统的模块结构和依赖关系
---

# Nebula-UAA 架构概览

Nebula-UAA 是一套完整的微服务认证授权解决方案，采用模块化设计，支持单体应用和分布式部署。本文档介绍其包结构和模块间的依赖关系。

## 模块结构

| 子模块 | 职责 | 依赖关系 |
|--------|------|----------|
| **nebula-uaa-api** | 提供接口定义、DTO、常量等核心抽象 | 无 |
| **nebula-uaa-core** | 本地实现：Mapper、Service、JWT、缓存等核心功能 | nebula-uaa-api |
| **nebula-uaa-starter** | 单体应用自动配置 + REST 端点 | nebula-uaa-core |
| **nebula-uaa-cloud-starter** | Feign/Dubbo 客户端实现（不可执行） | nebula-uaa-api |
| **nebula-uaa-cloud-gateway** | 可执行的 Boot 项目（UAA 微服务） | nebula-uaa-core |
| **nebula-uaa-client-sdk** | JWT 解析、角色/Scope 校验工具 | nebula-uaa-api |

## 依赖关系图

### 文本流程图
```
nebula-uaa-api
    ↓
nebula-uaa-core
    ↓
nebula-uaa-starter
    ↑
nebula-uaa-cloud-gateway

nebula-uaa-api
    ↓
nebula-uaa-cloud-starter

nebula-uaa-client-sdk → nebula-uaa-api
```

### 依赖层级
1. **基础层**: nebula-uaa-api (无依赖)
2. **核心层**: nebula-uaa-core (依赖: nebula-uaa-api)
3. **实现层**:
   - nebula-uaa-starter (依赖: nebula-uaa-core)
   - nebula-uaa-cloud-starter (依赖: nebula-uaa-api)
   - nebula-uaa-cloud-gateway (依赖: nebula-uaa-core)
   - nebula-uaa-client-sdk (依赖: nebula-uaa-api)

### 部署模式

1. **单体应用模式**: 使用 `nebula-uaa-starter` 集成到单体应用中
2. **微服务模式**: 部署 `nebula-uaa-cloud-gateway` 作为独立认证服务
3. **客户端模式**: 使用 `nebula-uaa-client-sdk` 在客户端进行JWT验证

### 核心特性

- 🔐 统一认证授权
- 🔄 JWT 令牌管理
- 🌐 微服务架构支持
- 🛠️ 灵活的集成方式
- 📦 模块化设计