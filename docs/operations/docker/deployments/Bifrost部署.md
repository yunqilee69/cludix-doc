---
slug: /operations/bifrost-compose
title: Bifrost Docker Compose 配置
---

# Bifrost AI Gateway

Bifrost 是一个高性能 AI 网关，统一访问 15+ LLM 提供商（OpenAI、Anthropic、AWS Bedrock、Google Vertex、Azure、Cohere、Mistral、Ollama、Groq 等），通过单一 OpenAI 兼容 API 提供服务。本文提供 Bifrost 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.bifrost.yml
└─ bifrost/
   └─ data/
```

说明：

- `data`：Bifrost 配置数据、请求日志、语义缓存持久化目录

## 2. 目录权限设置

Bifrost 官方镜像默认以 root 运行，无需特殊权限设置。创建目录即可：

```bash
# 创建目录
mkdir -p /app/bifrost/data
```

## 3. Compose 配置示例

`/app/docker-compose.bifrost.yml`：

```yaml
services:
  bifrost:
    image: maximhq/bifrost:latest
    container_name: bifrost
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - TZ=Asia/Shanghai
    volumes:
      - /app/bifrost/data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 复用 `app-net`，业务容器可通过容器名直接访问 Bifrost
- 数据目录挂载，确保配置和缓存持久化，容器重建后不丢失
- 增加 `healthcheck`，便于在编排层判断 Bifrost 是否可用

## 4. Provider 配置（基于 config.json 初始化）

推荐使用 `config.json + config_store` 进行首次引导初始化，再通过 Web UI 或 HTTP API 持久化修改配置。

### 4.1 初始化文件示例（OpenAI 兼容上游）

在宿主机创建 `/app/bifrost/data/config.json`（容器内对应 `/app/data/config.json`）：

```json
{
  "client": {
    "drop_excess_requests": false
  },
  "providers": {
    "openai-custom": {
      "keys": [
        {
          "name": "openai-custom-key-1",
          "value": "env.OPENAI_API_KEY",
          "models": [],
          "weight": 1.0
        }
      ],
      "network_config": {
        "base_url": "https://your-openai-compatible-endpoint.com"
      },
      "custom_provider_config": {
        "base_provider_type": "openai",
        "allowed_requests": {
          "chat_completion": true,
          "chat_completion_stream": true
        },
        "request_path_overrides": {
          "chat_completion": "/v1/chat/completions",
          "chat_completion_stream": "/v1/chat/completions"
        }
      }
    }
  },
  "config_store": {
    "enabled": true,
    "type": "sqlite",
    "config": {
      "path": "./config.db"
    }
  }
}
```

### 4.2 配置模式与常见坑点

Bifrost 有两种配置模式，不能混用：

- 不配置 `config_store`：UI 禁用，配置为只读内存模式；修改 `config.json` 后必须重启生效
- 配置 `config_store`：UI 可用，配置持久化到数据库；可通过 UI/API 实时修改

`config_store` 开启后还有一个关键行为：

- 首次启动且数据库为空：使用 `config.json` 引导初始化
- 数据库已存在且有数据：直接以数据库为准，忽略 `config.json`
- 因此 `config.json` 主要用于初始化；后续变更请走 UI 或 API

Docker 挂载注意事项：

- 本文挂载为 `/app/bifrost/data:/app/data`，`./config.db` 实际位于容器内 `/app/data/config.db`
- 若要重新按 `config.json` 引导，需清空/替换已有 `config.db`（会丢失当前数据库中的配置）

### 4.3 custom_provider_config 在 UI/API 的可用性说明

- UI 支持新增 Custom Provider（选择 provider 名称、base provider type、allowed requests）
- `request_path_overrides` 建议通过 API 或 `config.json` 维护，便于精确控制路径映射

示例：通过 API 更新已有 custom provider（实时生效并持久化到 SQLite）

```bash
curl -X PUT http://localhost:8080/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai-custom",
    "keys": [
      {
        "name": "openai-custom-key-1",
        "value": "env.OPENAI_API_KEY",
        "models": [],
        "weight": 1.0
      }
    ],
    "network_config": {
      "base_url": "https://your-openai-compatible-endpoint.com"
    },
    "custom_provider_config": {
      "base_provider_type": "openai",
      "allowed_requests": {
        "chat_completion": true,
        "chat_completion_stream": true
      },
      "request_path_overrides": {
        "chat_completion": "/api/v2/chat",
        "chat_completion_stream": "/api/v2/chat"
      }
    }
  }'
```

配置原因：

- 用 `config.json` 做首启基线，便于 IaC/GitOps 管理
- 启用 `config_store` 后保留 UI/API 动态运维能力
- 对 OpenAI 兼容上游使用 `custom_provider_config`，可复用 Bifrost 统一接口并做路径适配

## 5. 常用命令

```bash
# 启动 Bifrost
docker compose -f /app/docker-compose.bifrost.yml up -d

# 关闭 Bifrost
docker compose -f /app/docker-compose.bifrost.yml down

# 查看容器日志
docker logs -f bifrost

# 查看容器状态
docker compose -f /app/docker-compose.bifrost.yml ps
```

## 6. 验证部署

### 6.1 访问 Web UI

浏览器打开 `http://<服务器IP>:8080`，即可看到 Bifrost 管理界面。

### 6.2 测试 API 调用

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello, Bifrost!"}]
  }'
```

> **注意**：调用前需先配置对应 Provider 的 API Key。

## 7. 核心特性

| 特性 | 说明 |
|------|------|
| 统一接口 | 单一 OpenAI 兼容 API 访问所有 LLM 提供商 |
| 自动故障转移 | Provider 不可用时自动切换到备用 Provider |
| 负载均衡 | 智能分配请求到多个 API Key |
| 语义缓存 | 基于语义相似度的智能缓存，降低成本和延迟 |
| 预算管理 | 层级化成本控制，支持虚拟 Key 和团队预算 |
| 可观测性 | 原生 Prometheus 指标、分布式追踪、日志记录 |

## 8. 支持的 Provider

| Provider | 模型示例 |
|----------|----------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| Anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| AWS Bedrock | claude-3, llama-3, mistral-large |
| Google Vertex / AI Studio | gemini-1.5-pro, gemini-1.5-flash |
| Azure OpenAI | gpt-4, gpt-35-turbo |
| Mistral | mistral-large, mistral-medium, codestral |
| Cohere | command-r, command-r-plus |
| Groq | llama-3-70b, mixtral-8x7b |
| Cerebras | llama-3-70b |
| Ollama | 本地模型 |

## 9. 参考资料

- [Bifrost 官方文档](https://docs.getbifrost.ai)
- [Bifrost GitHub](https://github.com/maximhq/bifrost)
- [Docker Hub - maximhq/bifrost](https://hub.docker.com/r/maximhq/bifrost)