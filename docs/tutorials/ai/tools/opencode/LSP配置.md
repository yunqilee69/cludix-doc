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

> 实测补充：把 `lsp` 块直接写进 `~/.config/opencode/opencode.jsonc`（顶层 `lsp` 字段）**同样有效**——这是 opencode 官方 schema（`https://opencode.ai/config.json`）明确支持的字段。两种方式二选一即可，不要两边都写以免重复覆盖。下文示例统一采用写在 `opencode.jsonc` 里的方式。

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

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `command` | 覆盖 builtin 时必填 | 启动 language server 的完整命令，**推荐绝对路径**（避免终端 PATH 差异导致启动失败） |
| `extensions` | 覆盖 builtin 时可省（继承 builtin） | 该 server 负责的文件后缀，匹配到才启动 |
| `priority` | 可选 | 同一后缀命中多个 server 时的优先级，数值越大越优先 |
| `env` | 可选 | 启动时注入的环境变量（如 `JAVA_HOME`） |
| `initialization` | 可选 | 透传给 server 的 `initialize` 请求参数（如 tsserver 路径） |

> ⚠️ schema 关键点：覆盖 builtin server 时 `command` 是**必填**的——不能"只加 `initialization` 不给 command"，必须给完整 command 数组。

## TypeScript LSP

### 安装

```bash
# 1. language server 全局安装（不受 TypeScript 版本影响）
npm install -g typescript-language-server

# 2. TypeScript 必须装 5.x，不能装最新版！详见下方"错误原因"
#    推荐装到独立稳定路径，不影响全局、不耦合具体项目
mkdir -p ~/.local/share/opencode-lsp
npm install --prefix ~/.local/share/opencode-lsp typescript@5
# 装好后为 5.9.x，tsserver.js 位于
# ~/.local/share/opencode-lsp/node_modules/typescript/lib/tsserver.js
```

:::caution 不要直接 `npm install -g typescript`
截至 2026-08，`npm install -g typescript` 装到的是 `typescript@7.x`（TypeScript Native，Go 重写预览版），它**没有 `tsserver.js`**，会导致 typescript-language-server 启动失败。必须显式指定 `typescript@5`。原因详见[错误原因与解决方案](#错误原因与解决方案)。
:::

### 配置

```jsonc
// ~/.config/opencode/opencode.jsonc
"lsp": {
  "typescript": {
    "command": [
      "/home/yunqi/.nvm/versions/node/v20.19.6/bin/node",
      "/home/yunqi/.nvm/versions/node/v20.19.6/bin/typescript-language-server",
      "--stdio"
    ],
    "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
    "initialization": {
      "tsserver": {
        "path": "/home/yunqi/.local/share/opencode-lsp/node_modules/typescript/lib/tsserver.js"
      }
    },
    "priority": 100
  }
}
```

macOS 路径换成 `/Users/<你>/.nvm/versions/node/<ver>/...`。

### 要点

- `command` 用 nvm 完整绝对路径（`node` + `typescript-language-server`），避免终端 PATH 差异导致启动失败。
- `initialization.tsserver.path` 指定 tsserver 的实际位置，避免用到其他版本（含全局 TS7 Native）。这是 typescript-language-server 的官方选项，源码中通过 `findTypescriptVersion(tsserver?.path, ...)` 解析。
- `--stdio` 参数必填——typescript-language-server 默认不是 stdio 传输。
- 简化写法 `["typescript-language-server", "--stdio"]`（依赖 PATH）也能工作，但绝对路径更稳，**推荐绝对路径**。

## jdtls（Java LSP）

### 安装

```bash
# macOS
brew install jdtls

# Linux：手动下载 Eclipse JDT Language Server 压缩包解压，例如到 /opt/jdtls
# 结构：
#   /opt/jdtls/bin/jdtls      (Python launcher，#!/usr/bin/env python3)
#   /opt/jdtls/bin/jdtls.py
#   /opt/jdtls/plugins/  features/  config_linux/  ...
```

前提：系统有 `python3`（jdtls launcher 是 Python 脚本）和 JDK 17+（jdtls 运行需要）。

### 配置

```jsonc
"lsp": {
  "jdtls": {
    "command": ["/opt/jdtls/bin/jdtls"],
    "extensions": [".java"],
    "priority": 100,
    "env": {
      "JAVA_HOME": "/path/to/jdk17"
    }
  }
}
```

macOS 的 `command` 用 `/opt/homebrew/bin/jdtls`。

### 要点

- `command` 用绝对路径（如 `/opt/jdtls/bin/jdtls`），绕过 PATH 没配置导致 builtin 找不到的问题。
- **不加 `--stdio`**——jdtls launcher 默认就是 stdio 传输（和 typescript-language-server 不同）。
- **不传 `-data`**——`jdtls.py` 里 `-Data` 参数有默认值，不强制传。
- `env.JAVA_HOME` 可选：若 jdtls 启动报"找不到 java"或用错 JDK 版本时再设；能正常启动则不用设。

## Python（basedpyright）

### 安装

```bash
# 方式一（推荐）：npm 全局安装，复用 nvm 环境，无需 pipx/pip
npm install -g basedpyright

# 方式二：pipx 安装（需先有 pipx，装到 ~/.local/bin）
pipx install basedpyright
```

npm 装的 `basedpyright@1.39.10` 同时提供 `basedpyright`（CLI）和 `basedpyright-langserver`（LSP server），位于 nvm 的 bin 目录。

:::tip 选哪种安装方式
本机若没有 pipx 且 python 3.12+（PEP 668 限制 pip 直接装），用 **npm 安装最简单**——复用已有的 nvm node 环境，一个命令搞定。pipx 路线需要先装 pipx（`apt install pipx` 或 `python3 -m pip install --user pipx`）。
:::

### 配置

```jsonc
"lsp": {
  "basedpyright": {
    "command": [
      "/home/yunqi/.nvm/versions/node/v20.19.6/bin/node",
      "/home/yunqi/.nvm/versions/node/v20.19.6/bin/basedpyright-langserver",
      "--stdio"
    ],
    "extensions": [".py", ".pyi"],
    "priority": 100
  }
}
```

pipx 安装的话 `command` 用 `["/home/yunqi/.local/bin/basedpyright-langserver", "--stdio"]`。

### 要点

- 使用 [basedpyright](https://github.com/DetachHead/basedpyright)（pyright 的社区分叉，类型检查更严格、默认行为更合理）。
- `--stdio` 参数必填——basedpyright-langserver 默认不是 stdio 传输。
- `command` 用 node 绝对路径 + langserver 绝对路径（和 TypeScript 配置一致），避免 PATH 差异。

## 验证

1. 改完配置**必须重启 opencode**（配置不热加载，详见排查）。
2. 重启后打开一个匹配 `extensions` 的文件，人为制造类型错误：
   - TS：`const x: number = "string";`
   - Java：`int x = "string";`
3. 让 agent 调用 `lsp_diagnostics`，能返回类型错误诊断 → LSP 生效。

:::tip 快速验证 TS LSP（无需重启）
opencode 中 **write/edit 文件后触发的 LSP 检查走的是新配置（即时生效）**，而 `lsp_diagnostics` 工具走会话启动时的配置缓存。所以改完配置不重启，也能用 write 一个含类型错误的 `.ts` 文件快速验证 TS LSP——write 会立即返回类型错误诊断。但 jdtls 因首次启动慢，write 触发也等不到，只能重启后用 `lsp_diagnostics` 验证。
:::

## 错误原因与解决方案

以下是本机（Linux + nvm node v20.19.6）实测踩到的坑及解决方案。

### 1. TypeScript：找不到 tsserver

**现象**：

```
Request initialize failed with message: Could not find a valid TypeScript installation.
Please ensure that the "typescript" dependency is installed in the workspace or
that a valid `tsserver.path` is specified. Exiting.
```

所有 `.ts` 文件的 LSP 检测都失败。

**根因**：全局装的 `typescript@7.0.2` 是 **TypeScript Native（Go 重写预览版，跳过了 6）**。它和传统 TS 5.x 的本质区别：

| | TS 5.x（传统） | TS 7.x（Native） |
| --- | --- | --- |
| 实现 | Node.js（JS） | Go 重写 |
| `bin/` | `tsc` + `tsserver` | **只有 `tsc`，没有 tsserver** |
| `lib/tsserver.js` | 有（LSP 工具链依赖它） | 没有 |
| LSP 可用性 | typescript-language-server 直接用 | 工具链用不了 |

`typescript-language-server@5.3.0` 启动时按 `tsserver.path → workspace node_modules → 自带 bundle → 全局` 顺序找 `tsserver.js`，TS7 全没有 → 直接退出。

**解决方案**：

1. 全局 TS7 可不动（供 `tsc` CLI 用）。
2. 独立装 TS 5.x 到稳定路径（`~/.local/share/opencode-lsp`），不耦合具体项目、不影响全局 TS7。
3. `initialization.tsserver.path` 指向那个独立 TS5 的 `tsserver.js`。

### 2. jdtls：NOT INSTALLED / Command not found

**现象**：

```
LSP server 'jdtls' for .java is NOT INSTALLED.
Command not found: jdtls
```

**根因**有两层：

1. opencode builtin jdtls 默认 command 是 `jdtls`（在 PATH 里找），但 `/opt/jdtls/bin` 不在 PATH → 找不到。
2. `~/.config/opencode/lsp-install-decisions.json` 里 jdtls 之前被标成 `declined`（在 opencode 里拒过自动安装），导致 builtin 检测被静默。

**解决方案**：

1. `opencode.jsonc` 里覆盖 `lsp.jdtls.command` 用**绝对路径** `/opt/jdtls/bin/jdtls`（绕过 PATH 问题）。
2. 把 `lsp-install-decisions.json` 里 jdtls 的 `decision` 从 `declined` 改成 `allowed`：

```json
{
  "jdtls": {
    "decision": "allowed",
    "decidedAt": "2026-08-26T01:36:00.000Z"
  }
}
```

### 3. jdtls 首次启动"没反应"

**现象**：对 `.java` 文件调 `lsp_diagnostics`，诊断迟迟不返回。

**根因**：jdtls 是 Java 程序，首次启动要初始化 Java workspace（导入索引、解析依赖），**十几秒到一分钟都正常**，不是配置问题。且首次调用若配置未生效还会叠加问题 2。

**解决方案**：重启 opencode 后对 `.java` 文件跑 `lsp_diagnostics`，首次慢是正常的，耐心等。

### 4. opencode 配置不热加载

**现象**：改完 `opencode.jsonc` 的 `lsp` 块，`lsp_diagnostics` 工具仍报旧错误。

**根因**：opencode 官方明确——"Config is loaded once when opencode starts and is not hot-reloaded. The running session will keep using the already-loaded config until then."

**解决方案**：改完配置**退出重启 opencode**。重启后 `lsp_diagnostics` 才用新配置（write/edit 触发的 LSP 检查例外，走新配置，可用于快速验证 TS）。

### 5. edit 工具 oldString 不唯一导致配置插错位置

**现象**：用 `edit` 给 `opencode.jsonc` 加 `lsp` 块后，JSON 仍合法但顶层没有 `lsp` 字段（极隐蔽，不报错）。

**根因**：oldString `"enabled": true } } }` 在文件里多处匹配（OpenRouter 的 `reasoning.enabled` 和 mcp 的 `enabled` 都是此形状），edit 匹配了第一个，把 `lsp` 块错误插进了 variants 对象内部。

**解决方案**：用 `write` 整体重写文件，或 edit 时 oldString 带更长上下文确保唯一。

## 排查

- **server 未生效**：检查 `command` 中的可执行文件是否存在、有执行权限；手动运行该命令确认能启动。
- **node 相关 server 启动失败**：nvm 切换 node 版本后路径会变，配置里的绝对路径需要同步更新。
- **诊断不准确**：确认 `priority`，同一后缀可能被多个 server 抢占。
- **docusaurus 等带位置参数的 CLI 启动命令**：`pnpm start --host 0.0.0.0` 正确，**不要加 `--`**（`--` 会被 CLI 当成"后续都是位置参数"分隔符，把 `--host` 当成路径 lstat 报 ENOENT）。
- **配置改了不生效**：opencode 配置不热加载，必须重启。
