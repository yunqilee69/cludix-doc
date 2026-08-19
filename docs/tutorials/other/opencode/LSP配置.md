---
title: OpenCode LSP 配置
date: 2026-08-19 21:20
tags: [opencode, configuration]
---

# OpenCode LSP 配置

OpenCode 通过 LSP（Language Server Protocol）获取代码诊断信息（错误、警告、提示），并把这些信息喂给模型，让模型在生成代码时感知类型错误和引用问题。

## 配置文件位置

| 级别 | 路径 |
| --- | --- |
| 全局 | `~/.config/opencode/lsp.json` |
| 项目 | `<项目根>/.opencode/lsp.json` |

## 配置结构

```json
{
  "lsp": {
    "<语言名>": {
      "command": ["<可执行文件>", "<参数...>"],
      "extensions": [".xx"],
      "priority": 100,
      "env": {},
      "initialization": {}
    }
  }
}
```

### 字段说明

| 字段 | 说明 |
| --- | --- |
| `command` | 启动 language server 的完整命令，**推荐绝对路径**（避免终端 PATH 差异导致启动失败） |
| `extensions` | 该 server 负责的文件后缀，匹配到才启动 |
| `priority` | 同一后缀命中多个 server 时的优先级，数值越大越优先 |
| `env` | 启动时注入的环境变量（如 `JAVA_HOME`） |
| `initialization` | 透传给 server 的 `initialize` 请求参数（如 tsserver 路径） |

## 实际配置示例

以下是一份在 macOS 上实际使用的配置，覆盖 TypeScript、Python、Java 三种语言：

```json
{
  "lsp": {
    "typescript": {
      "command": [
        "/Users/yunqi/.nvm/versions/node/v22.23.1/bin/node",
        "/Users/yunqi/.nvm/versions/node/v22.23.1/bin/typescript-language-server",
        "--stdio"
      ],
      "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
      "initialization": {
        "tsserver": {
          "path": "/Users/yunqi/.nvm/versions/node/v22.23.1/lib/node_modules/typescript/lib/tsserver.js"
        }
      },
      "priority": 100
    },
    "basedpyright": {
      "command": ["/Users/yunqi/.local/bin/basedpyright-langserver", "--stdio"],
      "extensions": [".py", ".pyi"],
      "priority": 100
    },
    "jdtls": {
      "command": ["/opt/homebrew/bin/jdtls"],
      "extensions": [".java"],
      "priority": 100,
      "env": {
        "JAVA_HOME": "/Users/yunqi/.sdkman/candidates/java/current"
      }
    }
  }
}
```

### 要点说明

- **TypeScript**：通过 nvm 安装的 node，`command` 里用的是 nvm 完整路径；`initialization.tsserver.path` 指定 tsserver 的实际位置，避免用到 IDE 自带的旧版本
- **Python**：使用 [basedpyright](https://github.com/DetachHead/basedpyright)（pyright 的社区分叉），langserver 通过 pipx 安装到 `~/.local/bin/`
- **Java**：jdtls（Eclipse JDT Language Server）由 Homebrew 安装，通过 `env.JAVA_HOME` 指定 JDK（示例中由 sdkman 管理）

## Language Server 安装

```bash
# TypeScript
npm install -g typescript-language-server typescript

# Python（basedpyright，推荐 pipx）
pipx install basedpyright

# Java（macOS）
brew install jdtls
```

## 验证

1. 启动 `opencode`，打开一个匹配 `extensions` 的文件
2. 人为制造一个类型错误，观察模型是否能直接引用诊断信息
3. Agent 会话中模型可调用 `lsp_diagnostics` 类工具获取诊断，说明 LSP 已生效

## 排查

- **server 未生效**：检查 `command` 中的可执行文件是否存在、有执行权限；手动运行该命令确认能启动
- **node 相关 server 启动失败**：nvm 切换 node 版本后路径会变，`lsp.json` 里的绝对路径需要同步更新
- **诊断不准确**：确认 `priority`，同一后缀可能被多个 server 抢占
