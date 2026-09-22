---
title: OMP Studio
date: 2026-09-22 23:35
tags: [omp-studio, vscode, agent, ai]
---

# OMP Studio

把本机 [omp](https://omp.sh) 编码 agent 接到 VS Code 的侧栏控制面。定位是**宿主，不是第二套 agent**：会话、模型、MCP、子智能体输出都由 `omp --mode rpc` 子进程负责，插件只管进程、RPC 和侧栏 UI，读写的还是同一份 `~/.omp`（模型凭证、MCP 配置、agent 定义、session jsonl）。

面向的是已经装好 `omp` 的本机环境：终端里跑 omp 时的多会话、模型切换、工具审批，搬到编辑器侧栏里点。当前版本 `0.1.0`，仍在快速迭代。

## 仓库地址

- 代码仓库：[https://github.com/yunqilee69/omp-studio](https://github.com/yunqilee69/omp-studio)

本机工具，**没有线上服务**，也**未发布到 Marketplace / Open VSX**：装法是从源码打包 `.vsix` 后本地安装。

## 工作原理

```text
VS Code 侧栏（webview）
  Sessions 列表 ──1:1── omp --mode rpc 子进程 ── ~/.omp/agent/sessions/*.jsonl
```

- 传输走 `omp --mode rpc`，JSONL 帧，优先协商 protocol v2
- **会话 = 并发实例**：列表里一行对应一个子进程，切走会话不断进程，多个任务并行跑
- 子进程 `cwd` = 当前工作区根；只有显式 `--resume <path>` 才打开历史会话
- 扩展宿主是 Node，不嵌 OMP SDK（SDK 需要 Bun），也不走 ACP 做主路径

## 功能特性

| 能力 | 说明 |
| --- | --- |
| 会话列表 | 一行一个运行中实例，行首状态点显示 `运行中` / `空闲` / `已停止`；同一张列表里还混着以前落盘的历史会话（文件行），选一行 = 新实例 + `--resume` |
| 会话详情 | 点行进详情，顶部 `←` 回列表（进程继续跑）；列表底部输入框发送 = 新建实例 + 发这条 prompt，一步进详情 |
| 会话管理 | 悬停出 `置顶` / `完成` 图标（`完成` 即归档，行上方 `已归档 N 个 · 显示` 可召回）；重命名、复制名称/路径、关闭会话在行的右键菜单里 |
| 模型与 thinking | 输入框上方就近切换当前会话的模型（只列有凭证的）与 thinking 档位，只影响当前会话，不动持久配置 |
| 模式显示 | `none / plan / goal / vibe` 从会话 jsonl 的 `mode_change` 条目还原；插件只显示，切模式仍在 omp 终端里做 |
| MCP 面板 | 列出用户级 / 项目级 MCP server 与启用状态（规则同 omp 加载器：项目条目覆盖同名用户条目），开关让 omp 自己执行 `/mcp enable|disable` |
| 只读子智能体 | 点卡片进子智能体输出，当前会话整页替换对话、顶部返回；无输入框，不 steer / revive / kill |
| 计划正文 | `local://` 计划文件正文在同一视图栈里打开，同样整页替换对话 |
| 工具审批 | 接 `extension_ui_request`（confirm / select / input / editor），弹出卡片里选择或确认，点忽略等于 `cancelled` |
| 中止 | 发送后输入框旁「中止」，Esc 同样中止当前一轮，结束后可再发 |
| 设置页 | 编辑器区的 `WebviewPanel`（布局照 VS Code 设置页）：并发实例上限、模型角色（`config.yml` 的 `modelRoles`）、自定义模型（`models.yml`）的结构化表单 |
| 诊断 | 命令面板 `OMP Studio: Diagnose`：输出 omp 路径、版本、会话目录与协商到的协议能力 |

## 安装

要求：本机已装 `omp`（能跑 `omp --mode rpc`）、VS Code 1.100+。

```bash
cd extension
npm install
npm run build          # 产出 dist/extension.js、dist/webview.js、dist/webview.css
npm run package        # 产出 omp-studio.vsix
code --install-extension omp-studio.vsix
```

仓库根目录的 `package.sh` 是一键版本：打包后自动找 `code` / `codium` / `code-server` CLI 装上，重载窗口生效。开发调试则用 VS Code 打开仓库按 F5，启动 Extension Development Host。

设置项（`settings.json`）：

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `ompStudio.ompPath` | `omp` | omp 可执行文件：PATH 上的名字或绝对路径 |
| `ompStudio.maxInstances` | `4` | 同时运行实例的软上限，超出只警告 CPU 与成本，不阻止 |
| `ompStudio.approvalMode` | `inherit` | `inherit` 不加参数，沿用 omp 自己的 `tools.approvalMode`；其余值映射成 `omp --approval-mode <value>` |

## 写入边界

插件对 OMP 配置文件有明确分工，避免两个写入者互相覆盖：

- `config.yml` 一律走 `omp config set`，插件**永不**直接写
- `mcp.json` 只列表、切换、跳到文件，插件**永不**写（开关交给 omp）
- `models.yml` 是唯一例外：omp 没有写它的命令，由设置页表单写，且保注释、写前用真 omp 在临时 agent 目录里校验、原子写 + 备份

## 有意不做

- 会话树、`/branch`、同文件多叶
- 接管子智能体（steer / revive / kill）
- attach 终端里正在跑的 `omp`：各写各的 jsonl
- 两个实例打开同一份 session jsonl
- 嵌入 OMP SDK
- 完整的 `models.yml` / MCP OAuth 编辑器

## 上游缺口

`omp 18.1.2` 的 RPC 面没有 `list_sessions`、`set_mode`、`get_mcp_servers`，当前的降级做法：

| 缺口 | 降级方案 |
| --- | --- |
| `list_sessions` | 只扫当前工作区对应的 `<agentDir>/sessions/<encoded-cwd>/*.jsonl`，不扫全盘 |
| `set_mode` | 模式只读展示（来源是会话 jsonl 的 `mode_change`），不提供切换入口，也不做乐观本地状态 |
| MCP 读写 | 读 `mcp.json`，写走 `/mcp enable|disable` 文本命令，进程启动时已加载的 server 重开实例后才生效 |

取证的原始帧与命令清单记录在仓库的 `docs/upstream-issues.md` 与 `docs/rpc-samples/`。

## 文档状态

本页是项目介绍。使用文档（会话列表操作、审批流程、设置页、MCP 面板、子智能体与计划视图）后续补充。

相关文档：[Nebula](../nebula/) · [OmniGate](../omnigate/) · [OmniTOTP](../omnitotp/) · [Port Cleaner](../port-cleaner/)
