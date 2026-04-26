---
slug: /nebula
title: Nebula 项目
---

# Nebula 项目

本目录记录 Nebula 项目相关的开发规范、命名约定、架构设计与各核心模块文档。

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
