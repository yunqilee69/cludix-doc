---
title: OmniGate
date: 2026-09-20 19:40
tags: [omnigate, ai, llm, proxy]
---

# OmniGate

OpenAI 兼容的本地 AI 网关。把多个模型提供方聚合成一个端点，提供加权负载均衡、模型内密钥权重、阶梯熔断、虚拟密钥和多维统计，内嵌管理控制台——全部打包在一个静态二进制里。

定位是「本地优先、单二进制、零外部依赖」：纯 Go SQLite（无 CGO），首次运行自动创建 `~/.omnigate/`，不需要单独部署数据库或前端。

![banner](/img/omnigate/banner.png)

## 仓库与安装包

- 代码仓库：[https://github.com/yunqilee69/OmniGate](https://github.com/yunqilee69/OmniGate)
- npm 包：[`@cloudomni/omnigate`](https://www.npmjs.com/package/@cloudomni/omnigate)
- 发布产物：[GitHub Releases](https://github.com/yunqilee69/OmniGate/releases)

本地优先的网关，默认监听 `127.0.0.1:17777`。需要局域网访问时把 `host` 改成 `0.0.0.0`。

## 功能特性

| 能力 | 说明 |
| --- | --- |
| OpenAI 兼容代理 | `/v1/chat/completions`（SSE 流式）、`/v1/embeddings`、`/v1/rerank`、`/v1/images/generations`、`/v1/audio/speech`、`/v1/audio/transcriptions`、`/v1/videos`、`/v1/models` |
| 混合协议端点 | `/v1/messages`（Anthropic 原生）、`/v1/responses`（OpenAI Responses 原生）；跨协议转换时 `thinking` 以 `reasoning_content` 透出 |
| MCP 工具网关 | `/v1/mcp/<路由>` 聚合多个 MCP Server；对话测试页可把 MCP 工具注入模型自动调用 |
| 虚拟密钥 | RPM 限流、美元预算与用量累计、按路由授权 |
| 两级路由 | 逻辑模型 → 加权选模型 → 模型内密钥按权重分配；也可用 `provider/model` 锁定物理模型 |
| 阶梯熔断 | 模型级 30s → 1m → 3m；key 级 401/403 立即禁用，429 短冷却 |
| 多维统计 | 次数 / token / 首字延迟 / 总耗时 / 费用，按路由、模型、提供方、key、虚拟密钥聚合 |
| 内嵌管理台 | React 18 + Ant Design 5，`go:embed` 嵌入二进制，无独立前端部署 |

| 仪表盘 | 统计 |
| --- | --- |
| ![dashboard](/img/omnigate/dashboard.png) | ![stats](/img/omnigate/stats.png) |

## 使用流程

1. 按 [安装与启动](./安装与启动) 装好二进制，打开管理台
2. 在 [配置中心](./配置中心) 添加提供商、密钥和模型（含代理、请求头模板、请求体覆盖）
3. 在 [路由与虚拟密钥](./路由与虚拟密钥) 建逻辑模型名并发一张 `vk-` 凭证
4. 按 [调用方式](./调用方式) 用 OpenAI SDK 或 curl 访问 `/v1`
5. 熔断、重试、日志捕获、会话亲和见 [运行设置](./运行设置)；监听地址和登录账号见 [配置](./配置)
6. 从源码开发见 [本地开发](./本地开发)

相关文档：[OmniTOTP](../omnitotp/) · [Port Cleaner](../port-cleaner/)
