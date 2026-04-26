---
slug: /nebula/dict
---

# Nebula Dict 模块

本目录用于说明 `nebula-dict` 模块的定位、分层结构、业务能力、接口信息、接入方式、配置项与建表结构。

## 文档列表

- [模块总览](./overview.md) - dict 模块定位、子模块结构、核心能力与阅读入口
- [设计与实现](./design-and-implementation.md) - `code / name / dictCode / itemValue` 模型、树形字典设计、缓存机制与 local/remote 模式
- [业务功能](./business-capabilities.md) - 面向业务方的能力边界、典型流程与适用场景
- [接口信息](./api-reference.md) - 字典类型、字典项与树形返回的对外 REST API
- [使用方式](./usage-guide.md) - 单体接入、独立服务部署、远程消费与调用建议
- [配置说明](./configuration.md) - `nebula.dict.*` 配置项与 remote 模式说明
- [建表语句](./ddl.md) - 字典模块涉及的数据表结构与字段说明

## 推荐阅读顺序

建议按以下顺序阅读：

1. [模块总览](./overview.md)
2. [设计与实现](./design-and-implementation.md)
3. [业务功能](./business-capabilities.md)
4. [接口信息](./api-reference.md)
5. [使用方式](./usage-guide.md)
6. [配置说明](./configuration.md)
7. [建表语句](./ddl.md)
