---
title: OpenCode Skills 配置
date: 2026-08-19 21:40
tags: [opencode, configuration]
---

# OpenCode Skills 配置

Skill 是打包好的专业指令集（提示词工作流），以 `SKILL.md` 文件的形式存在。OpenCode 会根据任务描述自动匹配触发对应 skill，也可以用 `/skill名` 手动调用。

## Skill 的存放位置

不同来源的 skill 存放在不同目录，优先级为**用户级 > 插件级 > 内置**（高优先级覆盖低优先级同名 skill）：

| 位置 | 路径 | 说明 |
| --- | --- | --- |
| 用户级 | `~/.agents/skills/<name>/SKILL.md` | 手动安装的个人技能库，跨会话全局可用 |
| 插件级 | `~/.cache/opencode/skills/<name>/SKILL.md` | 由插件（如 oh-my-openagent）自动下载安装 |
| 内置 | 随 opencode / 插件打包 | `playwright`、`git-master`、`frontend` 等官方 skill |
| 项目级 | `<项目根>/.opencode/skill/<name>/SKILL.md` | 随仓库分发，团队共享 |
| 全局配置级 | `~/.config/opencode/skill/<name>/SKILL.md` | 手动放置的全局 skill |

```bash
# 查看当前已安装的用户级 skills
ls ~/.agents/skills/

# 查看插件安装的 skills
ls ~/.cache/opencode/skills/
```

## SKILL.md 格式

每个 skill 是一个目录，内含 `SKILL.md`，front matter 必须包含 `name` 和 `description`：

```md
---
name: my-skill
description: 使用 XXX 方案解决 YYY 问题。当用户提到 ZZZ 时使用本 skill。
---

# My Skill

具体的执行步骤、规范、命令模板...
```

**要点**：

- `description` 是自动触发匹配的依据，写清楚「做什么 + 什么场景触发」，越具体越容易被正确命中
- 正文就是给模型的指令，可以引用同目录下的其他文件（`references/`、脚本等）

## 调用方式

1. **自动触发**：模型根据任务描述与 skill 的 `description` 匹配，自动加载
2. **手动调用**：会话中输入 `/skill名`（如 `/tdd`、`/git-master`）
3. **发现与安装**：使用 `find-skills` skill（`/find-skills`）可以发现并安装新的 skill 到 `~/.agents/skills/`

## 相关文档

- [OhMyOpenagent 配置](./OhMyOpenagent配置)：插件本身也会安装/提供一批 skills
- [MCP 配置](./MCP配置)：工具扩展用 MCP，指令扩展用 skill
