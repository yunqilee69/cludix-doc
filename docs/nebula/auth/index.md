---
slug: /nebula/auth
---

# Nebula Auth 模块

本目录用于说明 `nebula-auth` 模块的定位、分层结构、设计实现、接口信息、SQL 建表与迁移脚本，以及模块配置项。

## 文档列表

- [模块总览](./overview.md) - auth 模块定位、子模块结构与已提供业务能力
- [设计与实现](./design-and-implementation.md) - 鉴权链路、JWT 处理、权限模型、本地/远程模式设计
- [接口信息](./api-reference.md) - 对外 REST API，使用 `ApiEndpoint` 组件渲染
- [配置说明](./configuration.md) - `nebula.auth.*`、动态登录参数、独立服务示例配置
- [建表与迁移说明](./ddl.md) - auth 相关表结构与组织类型迁移 SQL
