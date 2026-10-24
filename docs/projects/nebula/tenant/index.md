# Nebula 多租户

本目录说明 Nebula 的多租户体系：租户如何解析、平台账号与租户账号如何分离、租户登录为什么必须完成平台账号绑定，以及数据、缓存、异步任务和文件存储如何按租户隔离。

多租户是跨模块能力，代码主要落在 `nebula-base-*` 与 `nebula-auth`，并联动 `nebula-dict`、`nebula-param`、`nebula-notify`、`nebula-storage`、`nebula-scheduler`、`nebula-audit`、`nebula-event`、`nebula-frontend`、`web`、`mobile` 与 `packages/client-sdk`。

## 文档清单

| 文档 | 说明 |
| --- | --- |
| [模块总览](./overview.md) | 多租户定位、身份模型、核心概念、隔离范围与能力边界 |
| [设计与实现](./design-and-implementation.md) | 租户解析链路、强制绑定、数据/缓存/异步隔离、租户开通与状态联动 |
| [业务功能](./business-capabilities.md) | 平台租户管理、平台账号自助、邀请成员、企业切换、租户 OAuth 等能力与场景 |
| [使用方式](./usage-guide.md) | 后端接入、Web / Mobile 接入、接口摘要、错误码与上线检查清单 |
| [配置说明](./configuration.md) | `nebula.tenant.*`、`nebula.person.*`、初始化数据与开启步骤 |
| [建表与数据模型](./ddl.md) | 新增表、改造表、G/T 分类、唯一键与初始化数据 |

## 推荐阅读顺序

1. 先看 [模块总览](./overview.md)，建立“平台账号 / 租户账号 / 租户子域名”的身份模型
2. 再看 [设计与实现](./design-and-implementation.md)，理解一次请求如何解析出租户、绑定如何判定、隔离如何实现
3. 需要对接时看 [使用方式](./usage-guide.md)
4. 准备开启多租户时看 [配置说明](./configuration.md) 与 [建表与数据模型](./ddl.md)

## 重要前提

- 多租户默认**关闭**：`nebula.tenant.enabled=false`，保持原单租户行为
- 开启后平台账号层自动启用，租户登录**必须**完成平台账号绑定，否则只返回绑定挑战，不签发租户令牌
- 平台账号不单独提供登录入口，平台资料通过当前租户会话读写；平台管理员在**默认租户**内操作平台管理能力
