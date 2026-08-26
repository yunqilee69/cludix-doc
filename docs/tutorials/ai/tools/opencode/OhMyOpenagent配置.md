---
title: OhMyOpenagent 配置
date: 2026-08-19 21:50
tags: [opencode, configuration]
---

# OhMyOpenagent 配置

[oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) 是 OpenCode 的编排插件（注意包名是 `oh-my-openagent`，不是 oh-my-opencode），它把单一会话扩展成「主编排 + 子 Agent + 分类执行」的多 Agent 体系。

## 安装

在 `~/.config/opencode/opencode.json`（或 TUI 专用配置 `~/.config/opencode/tui.json`）中声明插件：

```json
{
  "plugin": ["oh-my-openagent@latest"]
}
```

首次启动后 `~/.config/opencode/package.json` 会自动添加 `@opencode-ai/plugin` 依赖。

## 配置文件

**路径**：`~/.config/opencode/oh-my-openagent.json`

核心就是两张「模型路由表」：`agents`（按 Agent 路由）和 `categories`（按任务类别路由）。模型引用格式为 `provider/model`，见[模型配置](./模型配置)。

```json
{
  "agents": {
    "sisyphus": { "model": "model-proxy-openai/glm-5" },
    "sisyphus-junior": { "model": "model-proxy/gpt-5.6" },
    "explore": { "model": "model-proxy-openai/glm-5" },
    "librarian": { "model": "model-proxy/gpt-5.6" },
    "oracle": { "model": "model-proxy-openai/glm-5" },
    "metis": { "model": "model-proxy/gpt-5.6" },
    "momus": { "model": "model-proxy/gpt-5.6" }
  },
  "categories": {
    "quick": { "model": "model-proxy/gpt-5.6" },
    "deep": { "model": "model-proxy/gpt-5.6" },
    "ultrabrain": { "model": "model-proxy/gpt-5.6" },
    "visual-engineering": { "model": "model-proxy/gpt-5.6" },
    "writing": { "model": "model-proxy-openai/glm-5" },
    "unspecified-low": { "model": "model-proxy-openai/glm-5" },
    "unspecified-high": { "model": "model-proxy/gpt-5.6" }
  }
}
```

> 调整配置后重启 opencode 生效。插件修改配置时会自动生成 `.bak` / `.backup-*` 备份文件，出问题可回滚。

## Agents 路由（子 Agent 模型）

`agents` 为每个内置子 Agent 指定模型。常用 Agent 及分工：

| Agent | 角色 | 建议模型倾向 |
| --- | --- | --- |
| `sisyphus` | 主编排 Agent：理解目标、拆解任务、委派、验证结果 | 综合能力强 |
| `sisyphus-junior` | 任务执行 Agent，按 `categories` 路由到对应模型 | 见分类表 |
| `explore` | 代码库检索（contextual grep），回答「X 在哪」 | 便宜、快 |
| `librarian` | 外部文档/远程仓库检索（官方文档、OSS 示例） | 便宜、快 |
| `oracle` | 只读高阶推理顾问（架构、疑难调试） | 最强推理 |
| `metis` | 需求预分析顾问，识别歧义和风险点 | 强推理 |
| `momus` | 方案/计划评审（清晰性、可验证性、完整性） | 强推理 |
| `prometheus` | 规划（大型任务的计划拆解） | 强推理 |
| `multimodal-looker` | 媒体文件分析（PDF、图片内容提取） | 支持多模态 |
| `atlas` / `hephaestus` | 其他内置 Agent，完整列表以插件文档为准 | — |

分工原则：**检索类（explore/librarian）用便宜模型，推理类（oracle/metis/momus）用强模型**，编排和执行按实际预算权衡。

## Categories 路由（任务分类模型）

`sisyphus-junior` 执行任务时按任务类别（category）选择模型：

| 分类 | 适用任务 | 建议模型倾向 |
| --- | --- | --- |
| `quick` | 琐碎改动：单文件修改、typo 修复 | 便宜、快 |
| `unspecified-low` | 低投入杂项 | 便宜、快 |
| `unspecified-high` | 高投入杂项 | 强 |
| `deep` | 自主深度研究 + 端到端实现 | 强 + 长上下文 |
| `ultrabrain` | 高难度逻辑/算法/架构 | 最强推理 |
| `artistry` | 非常规创造性解法 | 强 |
| `visual-engineering` | 前端 / UI / UX / 视觉 | 视觉能力强的模型 |
| `writing` | 文档、技术写作 | 便宜且文笔好 |

## 相关文档

- [模型配置](./模型配置)：provider 定义与 `provider/model` 引用格式
- [Skills 配置](./Skills配置)：插件同时会向 `~/.cache/opencode/skills/` 安装 skills
- [安装与使用](./安装与使用)
