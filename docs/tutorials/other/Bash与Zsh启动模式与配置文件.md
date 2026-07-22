---
title: Bash 与 Zsh 启动模式和配置文件
date: 2026-07-22 15:30
tags: [linux, macos, configuration, tutorial]
---

# Bash 与 Zsh 启动模式和配置文件

配置 Shell 时，最容易混淆的问题是：为什么某些环境变量、别名或补全配置在终端中生效，在脚本、SSH 或 IDE 的终端中却不生效？关键在于 Shell 启动时是否处于**登录模式**和**交互模式**。

本文介绍 Bash 与 Zsh 的主要区别、四种启动模式，以及不同模式下配置文件的加载规则。

## Bash 与 Zsh 的区别

| 项目 | Bash | Zsh |
| --- | --- | --- |
| 常见用途 | 服务器脚本、CI/CD、跨平台自动化 | 日常终端、补全与提示符定制 |
| 可用性 | Linux 服务器中很常见 | macOS 默认登录 Shell，桌面环境中常用 |
| 交互体验 | 功能基础，通常需要额外配置 | 补全、通配和自定义能力更丰富 |
| 常见配置生态 | `~/.bashrc`、`~/.bash_profile` | `~/.zshrc`、Oh My Zsh、Powerlevel10k |
| 脚本兼容性 | Bash 语法被大量脚本使用 | 与 Bash 有许多相似处，但并不完全兼容 |

日常使用可以选择 Zsh 获得更好的交互体验；编写脚本时应明确解释器，避免依赖当前登录 Shell：

```bash
#!/usr/bin/env bash
```

如果脚本只使用 POSIX Shell 语法，并且需要更好的可移植性，则使用：

```sh
#!/bin/sh
```

不要因为本机默认使用 Zsh，就在 Bash 或 `sh` 脚本中直接使用 Zsh 专有语法。

## Shell 的四种启动模式

登录与交互是两个独立维度，因此共有四种组合：

| 模式 | 含义 | 常见场景 |
| --- | --- | --- |
| 登录 + 交互 | 登录会话中直接与用户交互 | SSH 登录后的终端、`zsh -l` |
| 非登录 + 交互 | 可输入命令，但不是登录会话 | 大多数终端新建标签页 |
| 登录 + 非交互 | 登录 Shell 执行指定命令 | `zsh -l -c 'command'` |
| 非登录 + 非交互 | 执行脚本或单条命令 | `bash script.sh`、`zsh -c 'command'` |

### 登录模式

登录 Shell 通常由系统登录流程、SSH 登录，或带 `-l` / `--login` 参数启动。它适合初始化一个登录会话需要的环境变量，例如 `PATH`、`LANG` 和 `EDITOR`。

```bash
bash -l
zsh -l
```

### 交互模式

交互 Shell 会显示提示符并等待用户输入命令。别名、命令补全、主题、历史记录和快捷键等配置都应放在交互配置文件中。

```bash
bash -i
zsh -i
```

### 非交互模式

非交互 Shell 不等待用户输入，常用于脚本、CI/CD、Git Hook 和 `-c` 参数执行命令。此时不应依赖提示符、别名或交互补全等配置。

```bash
bash -c 'echo hello'
zsh -c 'echo hello'
```

## Zsh 配置文件加载顺序

Zsh 的配置目录默认为家目录 `~`。如果设置了 `ZDOTDIR`，则用户配置文件位于 `$ZDOTDIR`。

| 文件 | 何时加载 | 适合放置的内容 |
| --- | --- | --- |
| `~/.zshenv` | 所有 Zsh 实例 | 少量必须全局生效的环境变量 |
| `~/.zprofile` | 仅登录 Shell | 登录会话的环境变量初始化 |
| `~/.zshrc` | 仅交互 Shell | 别名、补全、主题、历史记录、插件 |
| `~/.zlogin` | 仅登录 Shell，且较晚执行 | 少见的登录后处理 |
| `~/.zlogout` | 登录 Shell 退出时 | 清理操作 |

系统级配置文件会在对应的用户文件之前读取；不同系统的实际路径可能略有不同，常见顺序如下：

```text
/etc/zshenv    → ~/.zshenv
/etc/zprofile  → ~/.zprofile  # 仅登录 Shell
/etc/zshrc     → ~/.zshrc     # 仅交互 Shell
/etc/zlogin    → ~/.zlogin    # 仅登录 Shell
```

四种模式下的用户配置文件加载顺序：

| Zsh 模式 | 用户配置文件 |
| --- | --- |
| 登录 + 交互 | `.zshenv` → `.zprofile` → `.zshrc` → `.zlogin` |
| 非登录 + 交互 | `.zshenv` → `.zshrc` |
| 登录 + 非交互 | `.zshenv` → `.zprofile` → `.zlogin` |
| 非登录 + 非交互 | `.zshenv` |

因此，**`.zshrc` 不是仅在登录时读取的文件**。只要 Zsh 是交互模式，无论是否登录，都会读取 `.zshrc`。交互式登录 Zsh 会同时读取 `.zprofile` 和 `.zshrc`。

### Zsh 配置示例

将登录会话环境放入 `~/.zprofile`：

```zsh
export PATH="$HOME/.local/bin:$PATH"
export EDITOR="vim"
```

将交互体验相关配置放入 `~/.zshrc`：

```zsh
alias ll='ls -alh'
autoload -Uz compinit && compinit
```

`~/.zshenv` 会在脚本等非交互场景中执行，因此应保持非常精简。不要在其中初始化 Oh My Zsh、NVM、SDKMAN、补全或任何耗时命令。

## Bash 配置文件加载顺序

Bash 的规则与 Zsh 最大的差别是：**登录 Bash 不会自动读取 `~/.bashrc`。**

| 文件或变量 | 何时加载 | 说明 |
| --- | --- | --- |
| `/etc/profile` | 登录 Shell | 系统级登录配置 |
| `~/.bash_profile` | 登录 Shell | 优先读取的用户登录配置 |
| `~/.bash_login` | 登录 Shell | 仅在 `.bash_profile` 不存在时尝试读取 |
| `~/.profile` | 登录 Shell | 仅在前两者都不存在时尝试读取 |
| `~/.bashrc` | 非登录交互 Shell | 交互配置文件 |
| `$BASH_ENV` | 非交互 Bash | 指向需要加载的初始化文件 |
| `~/.bash_logout` | 登录 Shell 退出时 | 登录会话清理操作 |

登录 Bash 的用户配置文件读取规则是：在 `~/.bash_profile`、`~/.bash_login`、`~/.profile` 中，**只读取第一个存在且可读的文件**。

| Bash 模式 | 用户配置文件 |
| --- | --- |
| 登录 + 交互 | `.bash_profile`、`.bash_login`、`.profile` 中第一个可读文件 |
| 非登录 + 交互 | `.bashrc` |
| 登录 + 非交互 | `.bash_profile`、`.bash_login`、`.profile` 中第一个可读文件 |
| 非登录 + 非交互 | `$BASH_ENV` 指向的文件；未设置则不读取用户启动文件 |

为了让登录交互 Bash 也拥有 `.bashrc` 中的别名和交互配置，常见做法是在 `~/.bash_profile` 中显式加载它：

```bash
if [ -f ~/.bashrc ]; then
  . ~/.bashrc
fi
```

## 如何检查当前 Shell 模式

### Zsh

```zsh
[[ -o interactive ]] && echo interactive || echo non-interactive
[[ -o login ]] && echo login || echo non-login
```

### Bash

```bash
[[ $- == *i* ]] && echo interactive || echo non-interactive
shopt -q login_shell && echo login || echo non-login
```

## 配置放置建议

1. 将 `PATH`、`LANG`、`EDITOR` 等登录会话环境变量放到 Zsh 的 `.zprofile` 或 Bash 的 `.bash_profile`。
2. 将别名、补全、主题、历史记录、快捷键和 Oh My Zsh 配置放到 `.zshrc` 或 `.bashrc`。
3. 保持 `.zshenv` 简短且无副作用；不要把交互配置放到其中。
4. 脚本不要依赖 `.zshrc` 或 `.bashrc` 中的别名；需要的环境应由脚本自身声明，或由 CI/CD 显式注入。
5. 修改交互配置后，可以执行 `source ~/.zshrc` 或 `source ~/.bashrc` 立即加载；修改登录配置后，建议重新登录或启动新的登录 Shell 验证。

## 相关文档

- [Oh My Zsh 配置](../macos/oh-my-zsh)
