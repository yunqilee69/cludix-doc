---
title: macOS 配置鸿蒙开发环境
date: 2026-07-21 15:30
tags: [harmonyos, macos, configuration, tutorial]
---

# macOS 配置鸿蒙开发环境

本文说明如何在 macOS 上使用 VS Code 编写 HarmonyOS ArkTS 代码：先通过官方 Command Line Tools 安装项目所需的 HarmonyOS SDK，再使用 `hvigorw` 和 `hdc` 在真机上构建、安装、启动和查看日志。

本文的“真机调试”指：将调试包安装到已连接的设备、启动应用并通过日志定位问题。仅使用命令行无法提供 IDE 的断点、变量查看等图形化调试能力。

## 工作流

```text
VS Code 编写代码 → ohpm 安装依赖 → ./hvigorw 构建 HAP → hdc 安装到真机 → hdc shell hilog 查看日志
```

## 1. 前置条件

准备以下环境：

- macOS 终端，默认以 `zsh` 为例
- VS Code，用于编辑项目文件
- HarmonyOS 官方 Command Line Tools；其中的 SDK 管理工具用于安装目标 HarmonyOS SDK
- 与项目 API 版本匹配的 HarmonyOS SDK（必需，但无需在下载中心单独下载 SDK 压缩包）
- Node.js 和 Java JDK；具体版本以所下载 Command Line Tools 对应的发行说明为准
- 一台可通过 USB 连接的 HarmonyOS 真机和数据线

建议先确认基础运行时可用：

```bash
node --version
java --version
```

> 不要仅根据旧教程固定 JDK 11。不同版本的 Command Line Tools 和 SDK 对 Node.js、JDK 的要求可能不同，应优先遵循同一版本下载页面或发行说明中的要求。

## 2. 下载 Command Line Tools 并安装 SDK

从华为开发者联盟的 HarmonyOS [下载中心](https://developer.huawei.com/consumer/cn/download/)下载适用于 macOS 的 **Command Line Tools**。

截至 2026 年 7 月，下载中心不会提供单独的 HarmonyOS SDK 下载项。**SDK 仍然是编译和部署应用的必需组件**，只是应通过 Command Line Tools 所附的 SDK 管理能力，按目标项目所需版本安装，而不是单独下载 SDK 压缩包。仅解压 Command Line Tools、未安装 SDK 时，不能完成应用编译或真机部署。不要将不存在的 SDK 路径写入 `PATH`，否则找不到 `hdc` 等工具。

将 Command Line Tools 压缩包解压到固定目录。以下示例使用：

```bash
mkdir -p "$HOME/command-line-tools"
# 将下载的 Command Line Tools 解压到 $HOME/command-line-tools
```

然后在解压目录中查看随工具提供的 SDK 管理程序和说明，并使用它安装与项目匹配的 SDK。SDK 的实际安装目录会因工具版本和安装时的选择而不同；安装完成后，确认 **SDK 根目录** 中包含 `toolchains/hdc`，再将其 `toolchains` 目录加入 `PATH`。

```bash
find "$HOME/command-line-tools" -type f \( -iname '*sdk*manager*' -o -iname 'sdkmgr*' \)
find "$HOME/command-line-tools" -type f -name hdc
```

目录不必和示例完全一致，但后续环境变量必须指向实际的 SDK 安装目录。

## 3. 配置环境变量

先确认当前 Shell：

```bash
echo "$SHELL"
```

macOS 默认通常是 `zsh`。编辑 `~/.zshrc`：

```bash
code ~/.zshrc
```

在文件末尾加入以下内容，并按实际解压目录调整。不需要定义额外的 SDK 环境变量；将 SDK 的实际 `toolchains` 目录直接加入 `PATH` 即可。

```bash
export HARMONY_CLI_HOME="$HOME/command-line-tools"

# Command Line Tools 中的命令，例如 codelinter、ohpm、hstack。
export PATH="$HARMONY_CLI_HOME/bin:$PATH"

# 若 SDK 按 Command Line Tools 的默认目录结构安装，hdc 位于此目录。
# 如 SDK 管理工具选择了其他位置，替换为实际的 toolchains 路径。
export PATH="$HARMONY_CLI_HOME/sdk/default/openharmony/toolchains:$PATH"
```

使配置立即生效：

```bash
source ~/.zshrc
```

如果使用 Bash，请将上述配置写入 `~/.bash_profile`，然后执行：

```bash
source ~/.bash_profile
```

### 验证工具

```bash
command -v codelinter
command -v ohpm
command -v hstack
command -v hdc

codelinter -v
ohpm -v
hdc -v
```

`hvigorw` 通常位于 HarmonyOS 项目根目录，是随项目提供的构建包装脚本。因此进入项目后优先运行 `./hvigorw`，而不是假设它已全局安装：

```bash
cd /path/to/MyHarmonyApp
./hvigorw --help
```

如果某个命令找不到，先在解压目录定位它，再将其所在目录加入 `PATH`：

```bash
find "$HARMONY_CLI_HOME" -type f \( -name codelinter -o -name ohpm -o -name hstack \)
find "$HARMONY_CLI_HOME" -type f -name hdc
```

## 4. 准备项目和 VS Code

使用 VS Code 打开已有的 ArkTS 项目：

```bash
cd /path/to/MyHarmonyApp
code .
```

项目根目录通常至少应包含以下文件：

```text
AppScope/
entry/
build-profile.json5
hvigorfile.ts
oh-package.json5
hvigorw
```

Command Line Tools 主要负责依赖、构建、检查和设备操作；不要在没有确认已安装相应脚手架的情况下直接使用网上的 `deveco create` 命令。没有 DevEco Studio 时，建议从团队模板或官方示例项目开始，再用本章命令完成后续开发。

## 5. 安装依赖和代码检查

在项目根目录执行：

```bash
ohpm install
codelinter
```

`ohpm install` 根据项目的 `oh-package.json5` 安装依赖。`codelinter` 用于在构建前发现 ArkTS 代码问题；如果项目定义了专用脚本或配置，请以项目配置为准。

## 6. 构建调试 HAP

首次构建或清理构建产物时：

```bash
./hvigorw clean --no-daemon
```

构建默认产品的调试包：

```bash
./hvigorw --mode module -p product=default -p buildMode=debug assembleHap --no-daemon
```

构建命令中的 `product=default` 对应项目产品配置；如果 `build-profile.json5` 定义了其他产品名称，请替换为实际名称。

构建成功后，在 `entry/build/` 下查找生成的 HAP：

```bash
find entry/build -type f -name '*.hap'
```

> 真机安装的 HAP 必须能够通过签名校验。首次接入真机前，请按项目所用 SDK 版本完成调试签名配置；构建失败时优先检查签名文件、`build-profile.json5` 和产品配置。

## 7. 连接并调试真机

在手机或平板上启用开发者选项中的 USB 调试相关开关，然后用数据线连接 Mac。部分设备会出现授权弹窗，选择允许后再继续。

### 7.1 确认设备已连接

```bash
hdc list targets
```

该命令应输出设备序列号。无输出时，按以下顺序排查：

1. 解锁设备，并确认已允许 USB 调试授权。
2. 更换支持数据传输的 USB 线或 USB 端口。
3. 确认 `hdc` 来自当前 SDK：`command -v hdc`。
4. 重新插拔设备后再次执行 `hdc list targets`。

### 7.2 安装调试包

将下面的路径替换为第 6 节找到的 HAP 文件：

```bash
hdc install -r /path/to/entry-default-signed.hap
```

`-r` 表示覆盖安装已有应用。安装成功后，通常可以直接在设备桌面启动应用。

### 7.3 从命令行启动应用

如果需要从终端启动，先从 `AppScope/app.json5` 或模块配置中确认包名和入口 Ability 名称，再执行：

```bash
hdc shell aa start -b com.example.myharmonyapp -a EntryAbility
```

将 `com.example.myharmonyapp` 和 `EntryAbility` 替换成项目实际值。

### 7.4 查看设备日志

另开一个终端窗口执行：

```bash
hdc shell hilog
```

日志较多时，可用 `grep` 按包名、模块名或自定义日志前缀过滤：

```bash
hdc shell hilog | grep 'MyHarmonyApp'
```

停止查看日志时按 `Ctrl+C`。

## 8. 日常开发命令

```bash
# 安装依赖
ohpm install

# 代码检查
codelinter

# 清理构建产物
./hvigorw clean --no-daemon

# 构建调试 HAP
./hvigorw --mode module -p product=default -p buildMode=debug assembleHap --no-daemon

# 查找构建产物
find entry/build -type f -name '*.hap'

# 查看已连接真机
hdc list targets

# 覆盖安装 HAP
hdc install -r /path/to/app.hap

# 查看真机日志
hdc shell hilog
```

## 9. 常见问题

### `command not found`

检查环境变量和实际解压目录：

```bash
echo "$HARMONY_CLI_HOME"
command -v ohpm hdc
```

修改 `~/.zshrc` 后需重新执行 `source ~/.zshrc`，或重开一个终端。

### `hdc list targets` 没有设备

优先检查设备端的 USB 调试开关、授权弹窗和数据线。若系统中存在多个 SDK，确认 `command -v hdc` 输出的是本次配置的 `toolchains/hdc`。

### `hvigorw` 没有执行权限

在项目根目录执行：

```bash
chmod +x hvigorw
```

然后再次使用 `./hvigorw` 运行构建。

### 构建失败或 HAP 无法安装

依次检查 Node.js/JDK 版本是否符合当前工具版本要求、`ohpm install` 是否完成、调试签名是否配置正确，以及目标设备的系统/API 版本是否满足项目要求。

## 10. 参考链接

- [HarmonyOS 开发者下载中心](https://developer.huawei.com/consumer/cn/download/)
- [HarmonyOS 开发者文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/)
