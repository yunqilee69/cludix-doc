---
title: Codex 中 Node 与 Java 命令找不到的解决方法
date: 2026-07-22 16:00
tags: [nodejs, java, troubleshooting, configuration]
---

# Codex 中 Node 与 Java 命令找不到的解决方法

## 问题现象

在本机终端中，以下命令可以正常执行：

```bash
node --version
npm --version
java -version
mvn --version
```

但在 Codex 执行命令时，可能出现类似错误：

```text
zsh: command not found: node
zsh: command not found: java
```

或者构建工具提示找不到 `JAVA_HOME`、Node.js 版本不正确，或无法找到 `npm`、`pnpm`、`mvn`、`gradle`。

## 原因说明

这通常不是 Node.js、Java 或 Codex 本身没有安装，而是 **Codex 子进程继承的环境变量与日常终端不同**。

NVM 和 SDKMAN! 都依赖 Shell 初始化脚本：

- NVM 通常在 `~/.zshrc` 或 `~/.bashrc` 中加载 `nvm.sh`，再将当前 Node.js 版本目录加入 `PATH`。
- SDKMAN! 通常在 `~/.zshrc` 或 `~/.bashrc` 中加载 `sdkman-init.sh`，再设置 `JAVA_HOME`、`PATH` 等环境变量。

而 Codex 执行命令时使用的 Shell 可能是非登录、非交互模式。此类 Shell 不会读取 `~/.zshrc` 或 `~/.bashrc`，因此不会自动执行 NVM 和 SDKMAN! 的初始化逻辑。

此外，Codex 及其子进程只能继承**启动 Codex 的父进程**已有的环境变量。若 Codex 由 IDE、桌面应用、自动化任务或未加载上述配置的 Shell 启动，就可能拿不到 Node.js 和 Java 的路径。

有关登录模式、交互模式与配置文件读取顺序，请阅读补充文档：[Bash 与 Zsh 启动模式和配置文件](../../tutorials/other/Bash与Zsh启动模式与配置文件)。

## 先确认问题

### 1. 在日常终端确认版本管理器正常

在可以正常使用的终端中执行：

```bash
command -v node npm java mvn
node --version
java -version
echo "$JAVA_HOME"
```

如果这些命令本身失败，应先修复 NVM 或 SDKMAN! 安装与版本选择问题，而不是修改 Codex 配置。

### 2. 在 Codex 中检查实际环境

让 Codex 执行以下命令：

```bash
printf 'SHELL=%s\n' "$SHELL"
printf 'PATH=%s\n' "$PATH"
printf 'JAVA_HOME=%s\n' "$JAVA_HOME"
command -v node npm java mvn gradle || true
```

若 `PATH` 中没有 NVM 选中的 Node.js 目录，或 `JAVA_HOME` 为空、`java` 不存在，即可确认是环境变量未传入。

## 解决方案：配置非交互 Shell 的初始化文件

如果 Codex 使用的 Shell 固定为 Zsh 或 Bash，可以使用该 Shell 在非交互模式下读取的初始化文件。只放开发工具必需的环境变量和初始化命令，不要放主题、补全、别名或任何终端输出。

### Zsh：使用 `~/.zshenv`

Zsh 在所有启动模式下都会读取 `~/.zshenv`，包括非登录、非交互模式。因此可以将 NVM 和 SDKMAN! 的最小初始化配置放入该文件：

```zsh
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use --silent default
fi

export SDKMAN_DIR="${SDKMAN_DIR:-$HOME/.sdkman}"
if [ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]; then
  . "$SDKMAN_DIR/bin/sdkman-init.sh"
fi
```

这样 Zsh 启动 Codex 命令时，会拥有 NVM 选中的 Node.js 路径，以及 SDKMAN! 设置的 `JAVA_HOME` 和 Java 路径。

`.zshenv` 会在每一个 Zsh 进程中执行，因此必须保持精简、无输出、无交互。

### Bash：使用导出的 `BASH_ENV`

非交互 Bash 不读取 `~/.bashrc`，但会读取由环境变量 `BASH_ENV` 指定的文件。可以先在 `~/.bashrc` 中导出 `BASH_ENV`：

```bash
export BASH_ENV="$HOME/.bashenv"
```

再创建 `~/.bashenv`，仅放需要传给非交互 Bash 的环境初始化：

```bash
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use --silent default
fi

export SDKMAN_DIR="${SDKMAN_DIR:-$HOME/.sdkman}"
if [ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]; then
  . "$SDKMAN_DIR/bin/sdkman-init.sh"
fi
```

使用 `$HOME/.bashenv`，不要写成 `./.bashenv`：`BASH_ENV` 的相对路径会受到当前工作目录影响，导致 Codex 在不同项目中找不到文件或加载错误文件。

`BASH_ENV` 必须在启动非交互 Bash **之前**已被导出。将它放在 `.bashrc` 中的前提是：启动 Codex 的 Bash 已读取 `.bashrc`，从而将该变量传递给后续的非交互 Bash 子进程。

### 验证

完成对应配置后，退出并重新启动 Codex，在其中执行：

```bash
node --version
npm --version
java -version
mvn --version
```

如果 Codex 使用 Bash，还可以确认：

```bash
printf 'BASH_ENV=%s\n' "$BASH_ENV"
```

## 常见误区

### 在 `.zshenv`、`.bashenv` 中加载交互配置

`.zshenv` 和 `$BASH_ENV` 指向的 `.bashenv` 会用于非交互 Shell。不要在其中加载整份 `.zshrc` 或 `.bashrc`，也不要放置主题、补全、别名、`echo`、`read` 等交互逻辑；只保留 NVM、SDKMAN! 与必要的环境变量初始化。

### 将配置从 `.zshrc` 移到 `.zprofile`

这只能解决**登录 Shell** 的加载问题，不能保证非登录、非交互 Shell 读取该文件。对于 Codex 这类由宿主进程启动命令的场景，关键是让启动 Codex 的进程显式拥有正确的环境变量。

### 只修改当前终端后不重启 Codex

环境变量只会在进程启动时继承。已经运行的 Codex 不会自动获得后来添加的 `PATH` 或 `JAVA_HOME`；修改配置后需要退出并重新启动 Codex。

### 使用别名代替环境初始化

别名通常只在交互 Shell 中可用，且不会可靠地传递给 Codex 子进程。应在 `.zshenv` 或 `.bashenv` 中初始化实际环境变量。

## 排查清单

1. 在普通终端确认 `node`、`java` 命令本身可用。
2. 使用 `nvm alias default <Node版本>` 设置默认 Node.js 版本。
3. 使用 `sdk current java` 确认 SDKMAN! 当前 Java 版本。
4. Zsh 使用 `.zshenv`；Bash 在 `.bashrc` 中导出绝对路径的 `BASH_ENV`，并在 `.bashenv` 中定义环境。
5. 在 Codex 中执行 `command -v node java` 和版本命令进行验证。
6. 切换 Node.js 或 Java 版本后，重启 Codex。
