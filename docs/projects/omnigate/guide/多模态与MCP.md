---
title: 多模态与 MCP
date: 2026-10-31 20:00
tags: [omnigate, usage, ai, agent]
---

# 多模态与 MCP

除对话外，OmniGate 还代理 Embedding、Rerank、生图、语音、视频，并把多个 MCP Server 聚合成一个工具网关。所有端点都走同一套虚拟密钥鉴权、失败转移、熔断和统计。

## 类型化端点

| 端点 | 请求要点 | 响应 |
| --- | --- | --- |
| `/v1/embeddings` | `{model, input}` | OpenAI Embeddings 格式 |
| `/v1/rerank` | `{model, query, documents, top_n}` | `results[].relevance_score` |
| `/v1/images/generations` | `{model, prompt, size, ...}` | OpenAI Images 格式 |
| `/v1/audio/speech` | `{model, input, voice}` | 音频字节或 SSE |
| `/v1/audio/transcriptions` | multipart：`file` + `model` | JSON / 文本 |
| `/v1/videos` | `{model, prompt, size, seconds}` | `{id, status}` 任务对象 |
| `/v1/videos/{id}` | 无请求体 | 任务状态 JSON |
| `/v1/videos/{id}/content` | 无请求体 | 成片字节流 |

```bash
# Embedding
curl http://127.0.0.1:17777/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vk-xxxx" \
  -d '{"model": "embed", "input": ["你好", "hello"]}'

# 生图
curl http://127.0.0.1:17777/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vk-xxxx" \
  -d '{"model": "image", "prompt": "一只在窗台上打盹的猫", "size": "1024x1024"}'
```

类型化端点只把逻辑路由名改写成真实模型名，其余请求/响应字段原样直通，不做跨厂商字段转换。上游路径不规则时，用模型上的「自定义 API 路径」覆盖。

视频是异步任务：提交后拿 `id`，轮询 `/v1/videos/{id}`，完成后从 `/v1/videos/{id}/content` 下载。轮询和下载按提交时登记的提供商 × 密钥回查，不会带未知 id 去上游。

## MCP 工具网关

MCP 路由的入口是 `/v1/mcp/<路由别名>`。一个会话里的 `tools/list` 会汇总该路由挂上的全部后端；`tools/call` 按工具名转发到对应后端。

### 配置

1. 管理台 **MCP** 页新增后端：目标 URL、可选 API Key，探测工具列表
2. 到 **路由 → MCP** 新增路由，别名例如 `tools`
3. 把后端挂到路由上：
   - **暴露全部工具**：当前和以后新增的工具都出现在 `tools/list`
   - **按工具白名单**：只暴露勾选的工具

### 调用

```bash
# 列出工具
curl http://127.0.0.1:17777/v1/mcp/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vk-xxxx" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 调用工具
curl http://127.0.0.1:17777/v1/mcp/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vk-xxxx" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"<工具名>","arguments":{}}}'
```

### 在对话里自动调用

管理台 [对话测试页](./对话测试页) 选中 MCP 路由后，会把该路由暴露的工具注入模型，让模型自动发起工具调用。这条链路适合验证「模型 + 工具」组合是否可用。

### 门户里的 MCP

密钥持有者在 [密钥门户](./密钥门户) 的 **MCP** 页能看到自己可调用的 MCP 路由、工具清单和调用示例，也可以一键测试。没配工具白名单时，门户会用后端同步到的工具快照补齐清单。
