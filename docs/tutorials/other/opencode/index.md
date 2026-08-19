---
title: OpenCode 配置指南
date: 2026-08-19 22:00
tags: [opencode, tutorial]
---

# OpenCode 配置指南

本目录收录 OpenCode（AI 编程终端工具）相关的安装、配置与扩展文档，覆盖模型接入、LSP、MCP、Skills 与多 Agent 编排插件。

## 文档清单

| 文档 | 说明 |
| --- | --- |
| [安装与使用](./安装与使用) | 安装步骤、快速开始、镜像源导致的启动故障处理 |
| [模型配置](./模型配置) | 自定义 Provider、模型/variants 定义、`provider/model` 引用格式、多端点共存 |
| [LSP 配置](./LSP配置) | `lsp.json` 结构、TypeScript/Python/Java language server 接入、诊断喂给模型 |
| [MCP 配置](./MCP配置) | local/remote 两类 MCP server 配置、环境变量与鉴权头 |
| [Skills 配置](./Skills配置) | Skill 存放位置（用户级/插件级/项目级）、SKILL.md 格式、触发方式 |
| [OhMyOpenagent 配置](./OhMyOpenagent配置) | 多 Agent 编排插件安装、agents/categories 两张模型路由表 |

## 使用建议

1. 先阅读 [安装与使用](./安装与使用) 完成安装
2. 按需配置 [模型](./模型配置)（必做）与 [MCP](./MCP配置)（常用）
3. 想让模型感知代码错误，配置 [LSP](./LSP配置)
4. 需要多 Agent 协作时，安装 [OhMyOpenagent](./OhMyOpenagent配置) 并按角色路由模型

## 配置文件速查

| 文件 | 作用 |
| --- | --- |
| `~/.config/opencode/opencode.json` | 主配置：模型、MCP、插件、默认模型 |
| `~/.config/opencode/lsp.json` | LSP language server 配置 |
| `~/.config/opencode/oh-my-openagent.json` | OhMyOpenagent 插件的模型路由配置 |
| `~/.config/opencode/tui.json` | TUI 专用配置 |
| `~/.agents/skills/` | 用户级 skills 存放目录 |
| `<项目根>/.opencode/` | 项目级配置与 skills |
