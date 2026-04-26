---
slug: /nebula/auth
---

# Nebula Auth 模块

本目录用于说明 `nebula-auth` 模块的定位、分层结构、业务能力、设计实现、接口信息、接入方式、配置与建表说明。

## 文档列表

- [模块总览](./overview.md) - auth 模块定位、子模块结构与已提供业务能力
- [设计与实现](./design-and-implementation.md) - 鉴权链路、JWT 处理、权限模型、本地/远程模式设计
- [业务功能](./business-capabilities.md) - 面向业务方的能力边界、典型流程与适用场景
- [接口信息](./api-reference.md) - 对外 REST API，使用 `ApiEndpoint` 组件渲染
- [使用方式](./usage-guide.md) - 单体接入、独立服务部署、远程消费与调用建议
- [配置说明](./configuration.md) - `nebula.auth.*`、动态登录参数、独立服务示例配置
- [建表与迁移说明](./ddl.md) - auth 相关表结构与组织类型迁移 SQL

## 推荐阅读顺序

建议按以下顺序阅读：

1. [模块总览](./overview.md)
2. [设计与实现](./design-and-implementation.md)
3. [业务功能](./business-capabilities.md)
4. [接口信息](./api-reference.md)
5. [使用方式](./usage-guide.md)
6. [配置说明](./configuration.md)
7. [建表与迁移说明](./ddl.md)
