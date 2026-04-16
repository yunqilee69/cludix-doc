---
slug: /software/rust-cargo
title: Rust 环境与 Cargo 配置（macOS）
---

# Rust 环境与 Cargo 配置（macOS）

本文说明如何在 macOS 上安装 Rust、配置 Cargo，并完成基础环境初始化。内容聚焦于安装、环境变量、镜像配置和少量常用命令，适合首次搭建 Rust 开发环境时参考。

## 什么是 Rust 和 Cargo

- **Rust**：一门强调性能、内存安全和并发能力的系统编程语言
- **Cargo**：Rust 官方提供的包管理器和构建工具，用于依赖管理、编译和运行项目

通常安装 Rust 时会一并安装 Cargo，因此大多数情况下只需要完成一次官方工具链安装即可。

## 前置要求

在 macOS 上安装 Rust 前，建议先确认以下条件：

- macOS 可正常联网
- 已安装命令行工具 `Xcode Command Line Tools`
- 默认使用 `zsh` 终端（macOS 新版本通常默认如此）

### 安装 Xcode Command Line Tools

如果尚未安装，请先执行：

```bash
xcode-select --install
```

安装完成后，可使用以下命令确认：

```bash
xcode-select -p
```

如果输出类似下面的路径，说明命令行工具已可用：

```bash
/Library/Developer/CommandLineTools
```

## 安装 Rust

### 方法一：使用官方 rustup 安装（推荐）

Rust 官方推荐通过 `rustup` 安装和管理工具链。它会同时安装 Rust、Cargo 以及常用的工具链管理能力。

执行以下命令：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装过程中会看到交互提示，一般直接选择默认选项即可：

```text
1) Proceed with standard installation (default - just press enter)
```

安装完成后，按提示重新加载 shell 环境：

```bash
source "$HOME/.cargo/env"
```

如果你使用的是 `zsh`，也可以直接重开一个终端窗口。

### 方法二：使用 Homebrew 安装（可选）

如果你更习惯通过 Homebrew 安装，也可以执行：

```bash
brew install rustup-init
rustup-init
```

> 推荐优先使用官方 `rustup` 方案，因为后续升级、切换工具链和统一管理都会更方便。

## 配置环境变量

Rust 安装完成后，核心可执行文件通常位于：

```bash
$HOME/.cargo/bin
```

为了让终端直接识别 `rustc`、`cargo`、`rustup` 等命令，需要把该目录加入 `PATH`。

### zsh 配置

将以下内容追加到 `~/.zshrc`：

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

然后执行：

```bash
source ~/.zshrc
```

### bash 配置

如果你使用 bash，可以把相同内容写入 `~/.bash_profile`：

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

然后执行：

```bash
source ~/.bash_profile
```

### 使用 rustup 自动环境脚本

如果是通过官方脚本安装，通常也可以直接加载：

```bash
source "$HOME/.cargo/env"
```

这个脚本会自动处理 Rust 常用环境变量，因此通常比手动配置更省事。

## 验证安装

安装并加载环境变量后，执行以下命令确认：

```bash
rustc --version
cargo --version
rustup --version
```

如果输出版本号，说明安装成功。

## 配置 Cargo 镜像源

在国内网络环境下，Cargo 下载 crates.io 依赖可能较慢，可以通过配置镜像源加速。

Cargo 配置文件默认位于：

```bash
~/.cargo/config.toml
```

如果文件不存在，可以手动创建：

```bash
mkdir -p ~/.cargo
nano ~/.cargo/config.toml
```

### 配置 rsproxy.cn 镜像（推荐）

将以下内容写入 `~/.cargo/config.toml`：

```toml
[source.crates-io]
replace-with = "rsproxy-sparse"

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"

[registries.rsproxy]
index = "sparse+https://rsproxy.cn/index/"
```

这是目前较常见、兼容性也较好的配置方式。

### 查看 Cargo 当前配置

可以使用以下命令检查配置文件是否已生效：

```bash
cat ~/.cargo/config.toml
```

## 常用命令

以下命令足够覆盖大多数安装后检查和基础使用场景：

```bash
# 查看 Rust 编译器版本
rustc --version

# 查看 Cargo 版本
cargo --version

# 查看 rustup 版本
rustup --version

# 查看当前工具链状态
rustup show

# 更新 Rust 工具链
rustup update

# 查看 Cargo 帮助
cargo --help

# 查看 Cargo 配置
cargo config get
```

## 常见问题

### 问题一：安装后提示找不到 cargo

可以先检查 PATH：

```bash
echo $PATH
```

然后确认 `~/.cargo/bin` 是否已加入环境变量。

也可以直接执行：

```bash
source "$HOME/.cargo/env"
```

如果这样可以恢复，说明是 shell 配置文件尚未生效。

### 问题二：Cargo 下载依赖很慢

优先检查 `~/.cargo/config.toml` 是否已正确配置镜像源。

可以查看配置文件内容：

```bash
cat ~/.cargo/config.toml
```

同时确认网络、代理或公司内网限制是否影响访问。

### 问题三：升级后依然使用旧版本

可以检查当前命令路径：

```bash
which rustc
which cargo
```

如果输出的不是 `~/.cargo/bin` 下的路径，说明系统中可能存在其他来源安装的 Rust，需要优先调整 `PATH` 顺序。

## 卸载 Rust

如果需要完全卸载通过 rustup 安装的 Rust，可执行：

```bash
rustup self uninstall
```

卸载后，如有手动写入 shell 配置文件的 `PATH` 设置，也建议一并删除。

## 参考资源

- [Rust 官网](https://www.rust-lang.org/)
- [Rust 官方安装文档](https://www.rust-lang.org/tools/install)
- [Cargo 官方文档](https://doc.rust-lang.org/cargo/)
- [rustup 官方文档](https://rust-lang.github.io/rustup/)
- [rsproxy.cn](https://rsproxy.cn/)
