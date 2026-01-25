---
title: Nebula-IAM 架构概览
description: Nebula-IAM 微服务认证授权系统的模块结构和依赖关系
---

# Nebula-IAM 架构概览

Nebula-IAM 是一套完整的微服务认证授权解决方案，采用模块化设计，支持单体应用和分布式部署。本文档介绍其包结构和模块间的依赖关系。

## 模块结构

| 子模块 | 职责 | 依赖关系 |
|--------|------|----------|
| **nebula-ima-api** | 提供接口定义、DTO、常量等核心抽象 | 无 |
| **nebula-ima-core** | 核心业务逻辑实现 | nebula-ima-api |
| **nebula-ima-local** | 本地实现：Mapper、Service、JWT、缓存等 | nebula-ima-core |
| **nebula-ima-remote** | 远程实现：Feign 客户端（向 service 发送请求） | nebula-ima-api |
| **nebula-ima-service** | 可执行的 Boot 项目（IAM 微服务） | nebula-ima-local |

## 依赖关系图

### 文本流程图
```
nebula-ima-api (基础层)
    ↓
nebula-ima-core (核心层)
    ↓
nebula-ima-local (本地实现)
    ↓
nebula-ima-service (微服务)

nebula-ima-remote (远程客户端)
    ↓
nebula-ima-service (通过 Feign 调用)
```

### 依赖层级
1. **基础层**: nebula-ima-api (无依赖)
2. **核心层**: nebula-ima-core (依赖: nebula-ima-api)
3. **实现层**:
   - nebula-ima-local (依赖: nebula-ima-core)
   - nebula-ima-remote (依赖: nebula-ima-api)
4. **服务层**: nebula-ima-service (依赖: nebula-ima-local)

### 部署模式

1. **单体应用模式**: 使用 `nebula-ima-local` 集成到单体应用中
2. **微服务模式**: 部署 `nebula-ima-service` 作为独立认证服务
3. **远程调用模式**: 其他服务引入 `nebula-ima-remote`，通过 Feign 调用 `nebula-ima-service`

### 模块职责详解

#### nebula-ima-api
- 定义统一的接口规范
- 提供公共 DTO 对象
- 定义常量和枚举
- 作为其他模块的基础依赖

#### nebula-ima-core
- 实现核心业务逻辑
- 提供领域模型和服务接口
- 实现权限校验算法
- 处理授权优先级逻辑

#### nebula-ima-local
- 本地 Mapper 实现（MyBatis）
- 本地 Service 实现
- JWT 令牌生成和解析
- 缓存实现（Redis/Caffeine）
- 适用于单体应用或需要本地缓存的场景

#### nebula-ima-remote
- Feign 客户端实现（配置 FeignClient）
- 仅依赖 nebula-ima-api（不依赖 core）
- 通过 Feign 远程调用向 nebula-ima-service 发送请求
- 适用于微服务架构下其他服务调用 IAM 服务的场景

#### nebula-ima-service
- 可执行的 Spring Boot 应用
- 暴露 REST API 端点
- 集成 nebula-ima-local 的实现
- 作为独立的 IAM 微服务运行

### 核心特性

- 🔐 统一认证授权
- 🔄 JWT 令牌管理
- 🌐 微服务架构支持
- 🛠️ 灵活的集成方式
- 📦 模块化设计
- 🚀 本地实现 + 远程调用双模式
