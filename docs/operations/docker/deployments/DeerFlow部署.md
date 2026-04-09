---
slug: /operations/deerflow-compose
title: DeerFlow Docker 部署指南
---

# DeerFlow

DeerFlow 是字节跳动开源的 super agent harness，集成了前端、Gateway API、LangGraph、Sandbox、Skills 与 Sub-Agent 能力。它的 Docker 方案不是“单容器 + 单个 compose 文件”模式，而是官方维护的一套多服务编排，因此本文优先遵循官方仓库的 Docker 工作流，而不是强行改造成本目录里常见的单应用 `app-net` 模板。

:::warning
DeerFlow **不直接适用** 本仓库常见的单应用 Docker 规范：默认不使用 `app-net`、`group_add`、`/app/docker-compose.<app>.yml` 这套约定，除非你后续自行二次改造。部署时请优先按官方仓库提供的 `make docker-start` / `make up` 工作流执行。
:::

## 1. 部署方式说明

DeerFlow 官方提供两套 Docker 启动方式：

- **开发模式**：适合本机调试，支持前端 / 后端热更新，入口命令是 `make docker-init`、`make docker-start`
- **生产模式**：适合长期运行，使用生产镜像与运行期配置挂载，入口命令是 `make up`、`make down`

两种模式默认统一通过 Nginx 暴露 `2026` 端口：

- Web 页面：`http://<服务器IP>:2026`
- Gateway API：`http://<服务器IP>:2026/api/*`
- LangGraph：`http://<服务器IP>:2026/api/langgraph/*`

## 2. 前置条件

官方文档给出的基础要求如下：

- Git
- Docker Desktop 或 Docker Engine
- Docker Compose（通常已随 Docker 提供）
- `make`
- Node.js 22+、pnpm、uv（仅在本地开发模式下是硬依赖；Docker 开发模式中 pnpm 可用于缓存优化）

如果是在 Linux 服务器上运行，请先确认当前用户能直接访问 Docker：

```bash
docker ps
```

如果报 `permission denied while trying to connect to the Docker daemon socket`，可按官方建议把当前用户加入 `docker` 组：

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

## 3. 目录与文件约定

建议将仓库放在固定目录，例如：

```text
/app
└─ deer-flow/
   ├─ .env
   ├─ config.yaml
   ├─ config.example.yaml
   ├─ extensions_config.json
   ├─ extensions_config.example.json
   ├─ frontend/
   │  ├─ .env
   │  └─ .env.example
   ├─ backend/
   │  └─ .deer-flow/
   ├─ docker/
   │  ├─ docker-compose-dev.yaml
   │  └─ docker-compose.yaml
   └─ skills/
```

说明：

- `.env`：根目录环境变量，主要放模型 API Key、搜索服务 Key、IM 渠道密钥等
- `config.yaml`：DeerFlow 主配置，至少要定义一个可用模型
- `extensions_config.json`：MCP Server 与 Skills 扩展配置；未使用扩展时可先保留空配置
- `frontend/.env`：前端环境变量；默认可直接使用示例文件
- `backend/.deer-flow/`：运行期数据目录，生产模式下默认也会放置自动生成的 `BETTER_AUTH_SECRET`

## 4. 初始化配置

### 4.1 拉取仓库并生成本地配置

```bash
git clone https://github.com/bytedance/deer-flow.git /app/deer-flow
cd /app/deer-flow
make config
```

`make config` 会基于模板生成本地配置文件。随后至少需要检查以下文件：

- `/app/deer-flow/config.yaml`
- `/app/deer-flow/.env`
- `/app/deer-flow/frontend/.env`

如果 `extensions_config.json` 不存在，官方脚本会自动从模板复制，或者生成最小空配置。

### 4.2 配置模型

`config.yaml` 中至少要声明一个模型；官方示例如下：

```yaml
models:
  - name: gpt-4o-mini
    display_name: GPT-4o Mini
    use: langchain_openai:ChatOpenAI
    model: gpt-4o-mini
    api_key: $OPENAI_API_KEY
    max_tokens: 4096
    temperature: 0.7
```

如果你使用 OpenAI 兼容网关，也可以继续沿用 `langchain_openai:ChatOpenAI`，并增加 `base_url`。

### 4.3 配置根目录 `.env`

根目录 `.env` 至少需要填入你在 `config.yaml` 中引用到的密钥。官方 `.env.example` 包含以下常见项：

```bash
TAVILY_API_KEY=your-tavily-api-key
JINA_API_KEY=your-jina-api-key
INFOQUEST_API_KEY=your-infoquest-api-key

# 按实际模型补充
OPENAI_API_KEY=your-openai-api-key
# GEMINI_API_KEY=your-gemini-api-key
# DEEPSEEK_API_KEY=your-deepseek-api-key
# MINIMAX_API_KEY=your-minimax-api-key
```

说明：

- `OPENAI_API_KEY` 是否必填，取决于你在 `config.yaml` 里是否引用它
- `TAVILY_API_KEY`、`JINA_API_KEY`、`INFOQUEST_API_KEY` 用于官方示例中的 Web 检索 / 抓取能力；如果未启用对应工具，可按需留空或关闭相关工具配置

### 4.4 配置 `frontend/.env`

`frontend/.env.example` 默认只有可选项，通常直接复制即可：

```bash
cp frontend/.env.example frontend/.env
```

示例内容：

```bash
# NEXT_PUBLIC_BACKEND_BASE_URL="http://localhost:8001"
# NEXT_PUBLIC_LANGGRAPH_BASE_URL="http://localhost:2024"
```

默认情况下，官方推荐走 Nginx 统一代理，因此这两个变量通常无需取消注释。

## 5. Docker 开发模式（推荐上手）

开发模式支持源码挂载和热更新，适合首次验证配置是否正确。

### 5.1 初始化 Sandbox 镜像

```bash
cd /app/deer-flow
make docker-init
```

行为说明：

- 如果 `config.yaml` 当前是本地 sandbox 模式，`make docker-init` 会提示无需额外镜像
- 如果启用了 AIO sandbox，会尝试拉取官方默认镜像 `enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:latest`
- 拉取失败时不会阻断本地 sandbox 启动，但 AIO sandbox 无法正常工作

### 5.2 启动开发环境

```bash
cd /app/deer-flow
make docker-start
```

配置原因：

- 官方脚本会自动读取 `config.yaml` 中的 sandbox 配置，判断是否需要连带启动 `provisioner`
- 开发模式使用 `docker/docker-compose-dev.yaml`，会挂载源码目录、日志目录、Docker Socket 以及本机 CLI 认证目录（如 `~/.claude`、`~/.codex`）
- `frontend`、`gateway`、`langgraph` 都启用了热更新，便于排查模型配置、工具配置和前端交互问题

启动成功后访问：

```text
http://localhost:2026
```

### 5.3 停止与查看日志

```bash
# 停止开发环境
make docker-stop

# 查看全部日志
make docker-logs

# 仅查看前端日志
make docker-logs-frontend

# 仅查看 Gateway 日志
make docker-logs-gateway
```

## 6. Docker 生产模式

如果你只是想把 DeerFlow 跑起来并长期使用，建议直接采用生产模式。

### 6.1 启动生产环境

```bash
cd /app/deer-flow
make up
```

`make up` 本质上调用官方 `scripts/deploy.sh`，核心行为如下：

- 使用 `docker/docker-compose.yaml` 构建并启动生产容器
- 默认把运行期数据目录设置为 `/app/deer-flow/backend/.deer-flow`
- 若不存在 `config.yaml`，会从 `config.example.yaml` 自动生成一份
- 若不存在 `extensions_config.json`，会自动生成空配置或从模板复制
- 若未显式设置 `BETTER_AUTH_SECRET`，会自动生成随机值并保存到 `backend/.deer-flow/.better-auth-secret`

### 6.2 停止生产环境

```bash
cd /app/deer-flow
make down
```

### 6.3 生产模式 compose 特点

官方生产 compose 与本目录常见的“单服务 + `app-net`”不同，主要差异如下：

- 使用内部网络 `deer-flow`，由 compose 自行管理
- 由 `nginx` 统一对外暴露 `${PORT:-2026}`
- `frontend`、`gateway`、`langgraph` 分拆为独立服务
- `gateway` 和 `langgraph` 会读取根目录 `.env`
- `frontend` 会读取 `frontend/.env`，并要求 `BETTER_AUTH_SECRET`
- 当 `config.yaml` 配置为 AIO sandbox 时，还会挂载 Docker Socket 供容器内发起 Docker-in-Docker on Docker（DooD）风格的 sandbox 调用

## 7. Sandbox 模式选择

官方 `config.example.yaml` 提供了三种思路：

### 7.1 Local Sandbox（默认）

```yaml
sandbox:
  use: deerflow.sandbox.local:LocalSandboxProvider
```

适用场景：

- 先快速验证 DeerFlow 是否能正常启动
- 不希望额外依赖 sandbox 容器

### 7.2 AIO Sandbox（Docker 容器隔离）

```yaml
sandbox:
  use: deerflow.community.aio_sandbox:AioSandboxProvider
```

适用场景：

- 希望工具执行在独立容器内完成
- 对代码执行隔离要求更高

启用后要额外确认：

- 宿主机存在可访问的 Docker Socket（默认 `/var/run/docker.sock`）
- 能拉取 sandbox 镜像

### 7.3 Provisioner 模式（Kubernetes）

```yaml
sandbox:
  use: deerflow.community.aio_sandbox:AioSandboxProvider
  provisioner_url: http://provisioner:8002
```

适用场景：

- 使用 Kubernetes 为每个 sandbox 分配独立 Pod
- 需要更强隔离和更高扩展性

此模式下，开发模式和生产模式都会额外启动 `provisioner` 服务，并依赖 `~/.kube/config`。

## 8. 常用命令（复制即用）

```bash
# 克隆仓库
git clone https://github.com/bytedance/deer-flow.git /app/deer-flow

# 进入项目目录
cd /app/deer-flow

# 生成配置
make config

# 启动开发模式
make docker-init
make docker-start

# 停止开发模式
make docker-stop

# 启动生产模式
make up

# 停止生产模式
make down
```

## 9. 常见问题

### 9.1 页面能打开，但无法实际执行任务

优先检查以下几项：

- `config.yaml` 中是否真的配置了至少一个模型
- `.env` 中是否提供了对应的 API Key
- `config.yaml` 中引用的环境变量名是否与 `.env` 保持一致，例如 `api_key: $OPENAI_API_KEY`

### 9.2 `make docker-start` 报 Docker 权限错误

常见报错：

```text
permission denied while trying to connect to the Docker daemon socket
```

处理方式见本文前面的“前置条件”，将当前用户加入 `docker` 组后重新登录或执行 `newgrp docker`。

### 9.3 AIO sandbox 模式下工具执行失败

重点检查：

- Docker 服务是否正常
- `/var/run/docker.sock` 是否存在
- sandbox 镜像是否已成功拉取

如果你当前只是验证 DeerFlow 主流程，可以先切回默认的 Local Sandbox。

### 9.4 生产模式缺少认证密钥

DeerFlow 前端在生产模式下需要 `BETTER_AUTH_SECRET`。官方 `make up` / `scripts/deploy.sh` 会自动生成并持久化该值，因此正常情况下不需要手动填写；如果你自行绕过官方脚本直接运行 compose，则需要自行注入这个变量。

## 10. 参考资料

- [DeerFlow 官方仓库](https://github.com/bytedance/deer-flow)
- [DeerFlow 中文 README](https://github.com/bytedance/deer-flow/blob/main/README_zh.md)
- [DeerFlow CONTRIBUTING](https://github.com/bytedance/deer-flow/blob/main/CONTRIBUTING.md)
- [DeerFlow docker-compose-dev.yaml](https://github.com/bytedance/deer-flow/blob/main/docker/docker-compose-dev.yaml)
- [DeerFlow docker-compose.yaml](https://github.com/bytedance/deer-flow/blob/main/docker/docker-compose.yaml)
- [DeerFlow config.example.yaml](https://github.com/bytedance/deer-flow/blob/main/config.example.yaml)
- [DeerFlow .env.example](https://github.com/bytedance/deer-flow/blob/main/.env.example)
