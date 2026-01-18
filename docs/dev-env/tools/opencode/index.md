# OpenCode 安装与使用指南

OpenCode 是一款智能代码辅助编程工具，支持自定义模型提供商，内置两种核心 Agent：

- **Build Agent**：专注于开发阶段，协助代码编写、调试和优化
- **Plan Agent**：专注于需求阶段，协助需求分析、架构设计和任务规划

## 安装

### 环境要求

在安装 OpenCode 之前，请确保您的系统已安装以下软件：

- **Node.js**: >= 20.19.0
- **Git**: 最新稳定版本
- **npm**: 随 Node.js 自动安装

### 安装步骤

推荐使用 npm 进行全局安装：

```shell
npm install -g opencode-ai
```

:::tip 重要提示
请务必使用官方 npm 源进行安装，避免使用淘宝等第三方镜像源。使用镜像源可能导致安装不完整，影响工具正常启动。
:::

验证安装是否成功：

```shell
opencode --version
```

## 配置

### MCP 服务配置

OpenCode 使用 MCP (Model Context Protocol) 协议来扩展功能。配置文件位于用户目录下：

**配置文件路径**：`~/.config/opencode/opencode.json`

#### 配置说明

以下配置包含了智谱 AI 提供的四个 MCP 服务以及 Chrome 浏览器调试 MCP 服务：

- **chrome-devtools**：Chrome 浏览器调试工具
- **zai-mcp-server**：智谱 AI 本地 MCP 服务（图片、视频分析等）
- **web-search-prime**：网络搜索服务
- **web-reader**：网页内容提取服务
- **zread**：GitHub 仓库代码读取服务

#### 完整配置示例

```json opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "chrome-devtools-mcp@latest"
      ],
      "enabled": true
    },
    "zai-mcp-server": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@z_ai/mcp-server"
      ],
      "environment": {
        "Z_AI_API_KEY": "YOUR_ZHIPU_API_KEY",
        "Z_AI_MODE": "ZHIPU"
      }
    },
    "web-search-prime": {
      "type": "remote",
      "url": "https://open.bigmodel.cn/api/mcp/web_search_prime/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ZHIPU_API_KEY"
      }
    },
    "web-reader": {
      "type": "remote",
      "url": "https://open.bigmodel.cn/api/mcp/web_reader/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ZHIPU_API_KEY"
      }
    },
    "zread": {
      "type": "remote",
      "url": "https://open.bigmodel.cn/api/mcp/zread/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ZHIPU_API_KEY"
      }
    }
  }
}
```

:::warning 注意
使用前请将配置文件中的 `YOUR_ZHIPU_API_KEY` 替换为您的实际智谱 API 密钥。
:::

### 模型配置

OpenCode 支持多种模型提供商。启动工具后，可以使用以下命令进行连接配置：

```shell
/connect
```

#### 推荐配置

- **智谱 AI (GLM)**：推荐使用 `code-plan` 模型，专为代码理解和任务规划优化
- **其他模型**：可根据需要配置 OpenAI、Claude 等其他模型提供商

配置时只需提供相应的 API Key 即可开始使用。

## 快速开始

1. 安装 OpenCode
2. 配置 MCP 服务（可选）
3. 启动工具：`opencode`
4. 使用 `/connect` 命令配置模型
5. 开始与 Build Agent 或 Plan Agent 交互

## 错误解决

### 终端重启后无法启动

#### 问题原因

OpenCode 会自动进行升级更新。如果 npm 配置了淘宝等第三方镜像源，可能会导致安装不完整，新开终端后无法正常启动工具。

#### 解决方案

按照以下步骤进行修复：

1. **卸载 OpenCode**

   ```shell
   npm uninstall -g opencode-ai
   ```

2. **清理 npm 缓存**

   ```shell
   npm cache clean --force
   ```

3. **切换回官方源并重新安装**

   ```shell
   npm config set registry https://registry.npmjs.org/
   npm install -g opencode-ai
   ```

4. **禁用自动更新**

   编辑 `~/.config/opencode/opencode.json` 配置文件，添加自动更新禁用配置：

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "autoupdate": false
   }
   ```

:::tip 提示
禁用自动更新后，如需更新 OpenCode，可手动运行 `npm update -g opencode-ai` 命令进行更新。
:::