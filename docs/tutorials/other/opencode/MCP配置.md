---
title: OpenCode MCP 配置
date: 2026-08-19 21:30
tags: [opencode, configuration]
---

# OpenCode MCP 配置

OpenCode 通过 MCP（Model Context Protocol）扩展工具能力：浏览器控制、数据库查询、联网搜索等都以 MCP server 的形式接入。MCP 配置写在 `opencode.json` 的 `mcp` 字段中。

## 配置文件位置

| 级别 | 路径 |
| --- | --- |
| 全局 | `~/.config/opencode/opencode.json` |
| 项目 | `<项目根>/.opencode/opencode.json` |

## 两种接入方式

| 类型 | `type` 值 | 关键字段 | 适用场景 |
| --- | --- | --- | --- |
| 本地进程 | `local` | `command`（argv 数组）、`environment` | npx 启动的工具、本机二进制 |
| 远程服务 | `remote` | `url`、`headers` | 云端 MCP 服务、自建 HTTP 服务 |

## 本地（local）示例

### chrome-devtools：浏览器调试

```json
{
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": ["npx", "-y", "chrome-devtools-mcp@latest"],
      "enabled": true
    }
  }
}
```

`npx -y 包名@latest` 会自动下载并运行最新版，无需手动安装。

### dbx：数据库查询（带环境变量）

```json
{
  "mcp": {
    "dbx": {
      "type": "local",
      "command": ["dbx-mcp-server"],
      "enabled": true,
      "environment": {
        "DBX_MCP_ALLOW_DANGEROUS_SQL": "1"
      }
    }
  }
}
```

`environment` 中定义的变量只注入给该 server 进程，用于开关危险操作、传递密钥等。

## 远程（remote）示例

### 自建 MCP 服务

```json
{
  "mcp": {
    "model-proxy-mcp": {
      "type": "remote",
      "enabled": true,
      "url": "http://YOUR_SERVER:33391/mcp"
    }
  }
}
```

### 智谱 AI 云端 MCP 系列（带鉴权）

```json
{
  "mcp": {
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

远程服务的鉴权通过 `headers` 传递，常用 `Authorization: Bearer <key>`。

## 字段速查

| 字段 | 说明 |
| --- | --- |
| `type` | `local`（本地进程）或 `remote`（HTTP 服务） |
| `command` | local 专用，启动命令的 argv 数组 |
| `environment` | local 专用，注入给子进程的环境变量 |
| `url` | remote 专用，MCP 服务端点 |
| `headers` | remote 专用，随请求发送的 HTTP 头（鉴权） |
| `enabled` | 开关，置为 `false` 可临时禁用而不删除配置 |

## 使用建议

- **密钥安全**：`opencode.json` 是明文 JSON，注意文件权限；文档和分享配置时务必替换真实 key
- **按需启用**：每个启用的 MCP server 都会占用上下文（工具描述），不常用的置 `enabled: false`
- **项目隔离**：团队共享的 MCP（如项目专用数据库工具）放项目级 `.opencode/opencode.json`，随仓库分发

## 相关文档

- [安装与使用](./安装与使用)
- [模型配置](./模型配置)
- [Skills 配置](./Skills配置)
