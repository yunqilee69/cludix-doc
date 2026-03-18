---
slug: /nebula/backend/module-selection
title: "[草稿] 模块选型建议"
description: 按目标场景选择单体接入、专项能力复用或微服务拆分方式。
---

# [草稿] 模块选型建议

Nebula 的价值之一，是你不用一次性接受全部模块。更推荐的方式，是根据当前目标选择最小可用组合，再逐步扩展。

## 想最快体验完整后端能力

优先选择：

- `nebula-app-starter`

原因很简单：它已经把基础设施和常用平台模块组合好，最适合第一次运行和验证。

## 想把能力接入已有单体工程

优先选择：

- `nebula-base-web`
- `nebula-base-mybatis`
- `nebula-base-cache`
- 按需增加 `nebula-auth-local`、`nebula-dict-local`、`nebula-param-local`、`nebula-notify-local`、`nebula-storage-local`、`nebula-comms-local`

这种方式最适合已经有自己的业务工程，但希望复用中台能力的团队。

## 想拆成独立服务

优先选择：

- 各业务模块的 `*-service`
- `nebula-gateway-service`

这种方式适合已经进入多服务协作阶段，希望统一出入口、统一文档、统一远程调用策略的场景。

## 面向前端联调时最重要的模块

如果你只从“前端能不能快速接起来”来判断优先级，通常是：

1. `nebula-auth`
2. `nebula-gateway`
3. `nebula-dict`
4. `nebula-param`
5. `nebula-notify`
6. `nebula-storage`

因为登录、菜单、权限、字典、参数和文件上传，是最直接影响前端工作台接入体验的部分。
