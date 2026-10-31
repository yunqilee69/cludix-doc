
# 设计说明

本目录用于沉淀 Nebula 项目的架构设计、分层设计与包组织约定。

## 文档列表

- [Nebula 分层设计](./layered-design.md) - 说明项目在聚合模块、能力模块、接入模式与运行形态上的分层方式。
- [Nebula 包设计](./package-design.md) - 说明模块内包结构、命名方式、对象分布与新增模块时的组织建议。
- [敏感字段落库加密](./crypto.md) - `nebula-base-crypto` 的威胁模型、信封格式、AAD 绑定、密钥轮换与回填方案。
- [多租户实施计划（历史归档）](./multitenancy-plan.md) - 多租户改造的执行步骤与约束；当前行为以 `docs/spec/12-multitenancy.md` 为准。
