# SDKMAN! 在 macOS 上的安装与 Java 多版本管理

## 什么是 SDKMAN!

SDKMAN! 是一个用于管理多个软件开发套件的并行版本的工具。它提供了一个便捷的命令行界面，可以轻松安装、切换和管理各种 SDK（Software Development Kit），包括 Java、Groovy、Scala、Kotlin 等。

## 安装 SDKMAN!

### 前置要求

- macOS 系统
- `curl` 命令行工具
- `zip` 和 `unzip` 工具
- Bash 或 Zsh shell

### 安装步骤

打开终端，运行以下命令：

```bash
curl -s "https://get.sdkman.io" | bash
```

安装完成后，按照提示执行以下命令使环境变量生效：

```bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

或者重启终端。

### 验证安装

```bash
sdk version
```

如果看到版本信息，说明安装成功。

## 安装 Java

### 查看可用的 Java 版本

```bash
sdk list java
```

这将列出所有可用的 Java 发行版和版本。

### 安装指定版本的 Java

#### 安装最新的 LTS 版本（推荐）

```bash
sdk install java
```

#### 安装特定版本

```bash
sdk install java 17.0.17-tem
sdk install java 21.0.9-tem
```

常用 Java 发行版标识：
- `tem` - Temurin（AdoptOpenJDK 的继任者）
- `amzn` - Amazon Corretto
- `librca` - Liberica JDK
- `zulu` - Azul Zulu

## 管理 Java 版本

### 查看已安装的 Java 版本

```bash
sdk list java | grep installed
```

或

```bash
sdk current java
```

### 切换 Java 版本（临时）

```bash
sdk use java 17.0.9-tem
```

此切换仅在当前终端会话有效。

### 切换 Java 版本（永久）

```bash
sdk default java 17.0.9-tem
```

此切换将设置全局默认版本。

### 在特定目录使用特定 Java 版本

在项目根目录创建 `.sdkmanrc` 文件：

```bash
echo "java=17.0.9-tem" > .sdkmanrc
```

进入该目录后运行：

```bash
sdk env
```

## 常用命令

```bash
# 更新 SDKMAN!
brew upgrade sdkman-cli

# 更新所有已安装的 SDK
sdk upgrade

# 卸载 Java 版本
sdk uninstall java 8.0.392-tem

# 设置 Java 主目录环境变量
sdk home java 17.0.9-tem

# 离线模式（避免网络请求）
sdk offline enable
sdk offline disable
```
