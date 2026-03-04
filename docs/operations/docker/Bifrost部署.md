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

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`

## 2. Compose 配置示例

`/app/docker-compose.bifrost.yml`：

```yaml
services:
  bifrost:
    image: maximhq/bifrost:latest
    container_name: bifrost
    restart: unless-stopped
    group_add:
      - "<APPGROUP_GID>"
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
- 通过 `group_add` 复用宿主机组权限，减少重复 `chown` 操作
- 增加 `healthcheck`，便于在编排层判断 Bifrost 是否可用

## 3. Provider 配置

Bifrost 支持通过 Web UI、API 或环境变量配置 LLM 提供商。

### 方式一：Web UI 配置（推荐）

启动后访问 `http://<服务器IP>:8080`，在 Web 界面中可视化配置 Provider 和 API Key。

### 方式二：环境变量配置

在 `docker-compose.bifrost.yml` 中添加环境变量：

```yaml
environment:
  - TZ=Asia/Shanghai
  # OpenAI
  - OPENAI_API_KEY=sk-xxxxx
  # Anthropic
  - ANTHROPIC_API_KEY=sk-ant-xxxxx
  # Google AI
  - GEMINI_API_KEY=xxxxx
  # Mistral
  - MISTRAL_API_KEY=xxxxx
```

### 方式三：API 动态配置

启动后通过 API 添加 Provider：

```bash
# 添加 OpenAI Provider
curl --location 'http://localhost:8080/api/providers' \
--header 'Content-Type: application/json' \
--data '{
  "provider": "openai",
  "keys": [
    {
      "value": "sk-xxxxx"
    }
  ]
}'

# 添加 Anthropic Provider
curl --location 'http://localhost:8080/api/providers' \
--header 'Content-Type: application/json' \
--data '{
  "provider": "anthropic",
  "keys": [
    {
      "value": "sk-ant-xxxxx"
    }
  ]
}'
```

## 4. 常用命令（复制即用）

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

## 5. 验证部署

### 5.1 访问 Web UI

浏览器打开 `http://<服务器IP>:8080`，即可看到 Bifrost 管理界面。

### 5.2 测试 API 调用

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello, Bifrost!"}]
  }'
```

> **注意**：调用前需先配置对应 Provider 的 API Key。

## 6. SDK 集成示例

Bifrost 提供 OpenAI 兼容 API，只需修改 `base_url` 即可无缝接入现有应用：

### OpenAI SDK（Python）

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/openai/v1",
    api_key="dummy-key"  # Key 由 Bifrost 管理
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Anthropic SDK（Python）

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:8080/anthropic/v1",
    api_key="dummy-key"
)

response = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

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