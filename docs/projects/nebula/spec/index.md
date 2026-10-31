---
title: 项目规范
---

# 项目规范

`docs/spec/` 是 Nebula 开发规范与硬性约束的唯一来源。规范内容与代码一起评审、一起演进，为避免站点副本与仓库正文漂移，这里不复制全文，直接给出仓库入口。

> 规范中的「禁止」条目为硬性约束，代码变更必须遵守。规范冲突时，具体规范优先于通用规范，业务模块规范优先于基础模块规范。

## 规范清单

| 序号 | 规范 | 内容 |
| ---: | --- | --- |
| 01 | [架构设计规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/01-architecture.md) | 模块划分、聚合结构、接入形态与运行模式 |
| 02 | [分层规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/02-layering.md) | api / core / local / remote / service 的职责边界 |
| 03 | [命名规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/03-naming.md) | Controller / Service / DAO 的参数对象与后缀约定 |
| 04 | [数据库规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/04-database.md) | 建表、字段、索引、脚本组织与升级约定 |
| 05 | [接口设计规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/06-api-design.md) | 分页、响应结构与接口边界 |
| 06 | [异常处理规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/07-exception.md) | 错误码分段、i18n 与异常转换 |
| 07 | [日志规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/08-logging.md) | 日志级别、脱敏与链路信息 |
| 08 | [安全规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/09-security.md) | 权限码、接口面准入、凭据与落库加密 |
| 09 | [配置规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/10-config.md) | 配置命名空间、层级与默认值 |
| 10 | [开发规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/11-development.md) | 依赖、测试、构建与交付要求 |
| 11 | [多租户规范](https://github.com/yunqilee69/nebula/blob/master/docs/spec/12-multitenancy.md) | 控制平面、数据平面、租户隔离与平台账号模型 |

## 相关入口

- 数据库脚本组织与升级方式：[`docs/sql/README.md`](https://github.com/yunqilee69/nebula/blob/master/docs/sql/README.md)
- 文档目录与编写约定：[`docs/README.md`](https://github.com/yunqilee69/nebula/blob/master/docs/README.md)
