---
slug: /nebula
title: Nebula 项目
---

# Nebula 项目

## 项目简介

Nebula 是一个基于 Spring 生态的 **Java 模块化中台工程**。它不是单纯的 `controller -> service -> dao` 三层单体，而是围绕"**模块边界稳定**、**支持单体接入**、**支持远程调用**、**支持独立服务化部署**"这几个目标构建的中台底座。

整体组织方式：

- **根聚合工程**统一管理所有能力模块（统一在根 `pom.xml` 中聚合与依赖版本）；
- 每个领域模块内部再按 `api / core / local / remote / service` 拆分为 5 个子模块；
- 基础设施能力由 `nebula-base`、`nebula-event`、`nebula-dependency` 等通用模块下沉，不承载具体业务。

业务应用可以按需选择接入形态：通过 `*-local` 以**单体方式**引入能力，通过 `*-remote` 以 **Feign 远程调用**消费独立部署的服务，或直接使用 `*-service` **独立服务化部署**。

## 架构速览

```text
┌──────────────────────────────────────────────┐
│ 应用与运行入口层                              │
│ nebula-app / *-service / nebula-gateway      │
├──────────────────────────────────────────────┤
│ 业务模块接入层                                │
│ *-local / *-remote                           │
├──────────────────────────────────────────────┤
│ 业务能力核心层                                │
│ *-core                                       │
├──────────────────────────────────────────────┤
│ 业务契约层                                    │
│ *-api                                        │
├──────────────────────────────────────────────┤
│ 基础设施层                                    │
│ nebula-base / nebula-event / dependency      │
└──────────────────────────────────────────────┘
```

更详细的分层动机与包组织方式，见 [设计说明](./design/index.md)。

## 模块清单

| 模块 | 定位 | 文档 |
| --- | --- | --- |
| `nebula-auth` | 认证与权限中心：用户、角色、权限、组织架构、菜单资源、OAuth2 客户端与微信登录 | [Auth 模块](./auth/index.md) |
| `nebula-dict` | 统一数据字典：字典类型 + 树形字典项，支持缓存与分页维护 | [Dict 模块](./dict/index.md) |
| `nebula-param` | 统一系统参数中心：运行期按 key 读取、后台可维护的业务开关与配置 | [Param 模块](./param/index.md) |
| `nebula-storage` | 统一文件存储：普通/分片上传、鉴权下载、短时签名分享下载 | [Storage 模块](./storage/index.md) |
| `nebula-frontend` | 前端支撑：启动配置、主题/语言/导航布局偏好、动态缓存治理 | [Frontend 模块](./frontend/index.md) |

各模块文档采用统一结构：`overview → design-and-implementation → business-capabilities → api-reference → usage-guide → configuration → ddl`。

## 📚 文档分类

- [Auth 模块](./auth/index.md) - nebula-auth 模块的总览、业务功能、设计实现、接口、接入方式、配置与建表说明
- [Dict 模块](./dict/index.md) - nebula-dict 模块的总览、业务功能、设计实现、接口、接入方式、配置与建表说明
- [Param 模块](./param/index.md) - nebula-param 模块的总览、业务功能、设计实现、接口、接入方式、配置与建表说明
- [Storage 模块](./storage/index.md) - nebula-storage 模块的总览、业务功能、设计实现、接口、接入方式、配置与建表说明
- [Frontend 模块](./frontend/index.md) - nebula-frontend 模块的总览、业务功能、设计实现、接口、接入方式、配置与建表说明
- [设计说明](./design/index.md) - 项目分层设计与包设计说明
- [规范说明](./spec/index.md) - 项目分层对象命名规约说明书

## 推荐阅读顺序

如果你是第一次阅读 Nebula 文档，建议按下面顺序进入：

1. 先看 [设计说明](./design/index.md)
   - 了解项目分层方式、包结构与整体架构约定
2. 再看目标模块的 `index / overview`
   - 快速建立该模块的能力边界和文档地图
3. 然后按统一顺序阅读模块页
   - `design-and-implementation` → `business-capabilities` → `api-reference` → `usage-guide` → `configuration` → `ddl`
4. 最后看 [规范说明](./spec/index.md)
   - 对照对象命名规约和分层约定，帮助把文档理解映射回代码结构
