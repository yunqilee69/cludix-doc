# Linux 安装配置 Homebrew 指南

本文档介绍如何在 Debian 系统中安装和配置 Homebrew 包管理器，并配置国内镜像源加速下载。

> **注意：** 如果已经安装了 Homebrew，配置镜像源时需要修改 git 远程地址。直接设置环境变量不会改变已有仓库的远程地址。

## 目录

- [前置要求](#前置要求)
- [安装 Homebrew](#安装-homebrew)
- [配置镜像源](#配置镜像源)
- [验证安装](#验证安装)
- [常用命令](#常用命令)

---

## 前置要求

- Debian 系统（Debian 10+）
- 已安装 Git
- 已安装 Curl
- sudo 权限

### 安装依赖

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

---

## 安装 Homebrew

### 一键安装脚本

执行官方安装脚本：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安装过程中需要：
1. 按回车键继续
2. 输入用户密码确认

### 检查安装位置

安装完成后，先查找 Homebrew 的实际安装路径：

```bash
# 方法一：查找 brew 可执行文件位置
which brew

# 方法二：查找 Homebrew 安装目录
ls -d /home/linuxbrew/.linuxbrew 2>/dev/null
ls -d ~/.linuxbrew 2>/dev/null

# 方法三：直接查找
find /home -name brew 2>/dev/null
```

### 配置环境变量

根据实际安装位置配置环境变量。

#### 情况一：安装在 /home/linuxbrew/.linuxbrew（默认）

编辑 `~/.bashrc`：

```bash
nano ~/.bashrc
```

在文件末尾添加：

```bash
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
```

#### 情况二：安装在 ~/.linuxbrew

编辑 `~/.bashrc`：

```bash
nano ~/.bashrc
```

在文件末尾添加：

```bash
eval "$(~/.linuxbrew/bin/brew shellenv)"
```

#### 使配置生效

```bash
source ~/.bashrc
```

#### 验证配置

```bash
# 检查 brew 是否可用
which brew

# 查看版本
brew --version

# 查看环境变量
echo $PATH | grep linuxbrew
```

---

## 配置镜像源

Homebrew 默认使用 GitHub 下载，国内访问较慢。建议使用国内镜像源加速。

**重要：** 对于已安装的 Homebrew，需要修改 git 远程地址才能使用镜像源。

### 方式一：使用中科大镜像源（推荐）

#### 步骤 1：修改 git 远程地址

```bash
# 修改 brew 仓库的远程地址
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote set-url origin https://mirrors.ustc.edu.cn/brew.git

# 修改 homebrew-core 仓库的远程地址
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote set-url origin https://mirrors.ustc.edu.cn/homebrew-core.git

# 如果 homebrew-cask 已存在，也修改其远程地址
if [ -d "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-cask" ]; then
    git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://mirrors.ustc.edu.cn/homebrew-cask.git
fi
```

#### 步骤 2：配置环境变量

```bash
# 配置环境变量（用于首次安装或后续克隆新仓库时使用）
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"' >> ~/.bashrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-core.git"' >> ~/.bashrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"' >> ~/.bashrc

source ~/.bashrc
```

#### 步骤 3：验证配置

```bash
# 查看 brew 仓库的远程地址
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote -v

# 查看 homebrew-core 仓库的远程地址
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote -v

# 应该显示 mirrors.ustc.edu.cn 而不是 github.com
```

### 方式二：使用清华镜像源

```bash
# 修改 git 远程地址
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote set-url origin https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote set-url origin https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git

# 配置环境变量
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"' >> ~/.bashrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"' >> ~/.bashrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"' >> ~/.bashrc

source ~/.bashrc
```

### 方式三：使用阿里云镜像源

```bash
# 修改 git 远程地址
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote set-url origin https://mirrors.aliyun.com/homebrew/brew.git
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote set-url origin https://mirrors.aliyun.com/homebrew/homebrew-core.git

# 配置环境变量
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/brew.git"' >> ~/.bashrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/homebrew-core.git"' >> ~/.bashrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.aliyun.com/homebrew-bottles"' >> ~/.bashrc

source ~/.bashrc
```

### 切换回官方源

如果需要切换回官方源：

```bash
# 修改 git 远程地址回官方源
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote set-url origin https://github.com/Homebrew/brew.git
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote set-url origin https://github.com/Homebrew/homebrew-core.git

# 编辑 ~/.bashrc，删除镜像源相关的环境变量
nano ~/.bashrc

# 使配置生效
source ~/.bashrc
```

### 方式二：使用清华镜像源

```bash
# 配置环境变量
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"' >> ~/.bashrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"' >> ~/.bashrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"' >> ~/.bashrc

source ~/.bashrc
```

### 方式三：使用阿里云镜像源

```bash
# 配置环境变量
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/brew.git"' >> ~/.bashrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/homebrew-core.git"' >> ~/.bashrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.aliyun.com/homebrew-bottles"' >> ~/.bashrc

source ~/.bashrc
```

### 切换回官方源

如果需要切换回官方源：

```bash
# 编辑 ~/.bashrc，删除镜像源相关的环境变量
nano ~/.bashrc

# 使配置生效
source ~/.bashrc
```

---

## 验证安装

### 1. 检查版本

```bash
brew --version
```

### 2. 检查配置

```bash
brew doctor
```

### 3. 测试安装软件

```bash
# 安装测试软件
brew install hello

# 运行测试软件
hello

# 卸载测试软件
brew uninstall hello
```

### 4. 查看镜像源配置

```bash
# 查看环境变量
echo $HOMEBREW_BREW_GIT_REMOTE
echo $HOMEBREW_CORE_GIT_REMOTE
echo $HOMEBREW_BOTTLE_DOMAIN

# 查看 git 远程地址（确认已切换到镜像源）
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote -v
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote -v
```

应该显示镜像源地址（如 `mirrors.ustc.edu.cn`），而不是 `github.com`。

---

## 常用命令

### 基本命令

```bash
# 更新 Homebrew
brew update

# 升级所有已安装的软件包
brew upgrade

# 升级指定软件包
brew upgrade <package-name>

# 搜索软件包
brew search <package-name>

# 查看软件包信息
brew info <package-name>

# 安装软件包
brew install <package-name>

# 卸载软件包
brew uninstall <package-name>

# 列出已安装的软件包
brew list

# 查看可以升级的软件包
brew outdated
```

### 清理命令

```bash
# 清理旧版本软件包
brew cleanup

# 查看可清理的磁盘空间
brew cleanup --dry-run

# 清理所有缓存
brew cleanup --prune=all
```

### 诊断命令

```bash
# 检查 Homebrew 配置
brew doctor

# 查看系统信息
brew config
```

---

## 常见问题

### 1. 安装失败：Git 未安装

**错误信息：**
```
git: command not found
```

**解决方法：**
```bash
sudo apt install -y git
```

### 2. 权限不足

**解决方法：**
```bash
# 将 Homebrew 目录的所有权改为当前用户
sudo chown -R $(whoami) /home/linuxbrew/.linuxbrew
```

### 3. 命令找不到

**错误信息：**
```
brew: command not found
```

**原因分析：**
1. Homebrew 安装路径与配置不一致
2. 环境变量未生效
3. 安装未成功完成

**解决方法：**

```bash
# 1. 查找实际安装位置
find /home -name brew 2>/dev/null
find ~ -name brew 2>/dev/null

# 2. 根据实际路径配置环境变量
# 如果在 /home/linuxbrew/.linuxbrew
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.bashrc

# 如果在 ~/.linuxbrew
echo 'eval "$(~/.linuxbrew/bin/brew shellenv)"' >> ~/.bashrc

# 3. 使配置生效
source ~/.bashrc

# 4. 验证
which brew
brew --version
```

### 4. 环境变量配置后无效

**解决方法：**

```bash
# 1. 检查 brew 是否真的已安装
ls -la /home/linuxbrew/.linuxbrew/bin/brew
# 或
ls -la ~/.linuxbrew/bin/brew

# 2. 手动执行环境变量命令（临时测试）
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
# 或
eval "$(~/.linuxbrew/bin/brew shellenv)"

# 3. 检查是否生效
which brew

# 4. 如果上面命令生效，说明路径正确，检查 ~/.bashrc 是否正确添加
cat ~/.bashrc | grep brew

# 5. 确保重新加载配置
source ~/.bashrc

# 6. 如果使用 zsh，需要配置 ~/.zshrc
nano ~/.zshrc
# 添加相同的环境变量配置
source ~/.zshrc
```

### 4. 下载速度慢

**解决方法：**
配置国内镜像源（参考上方"配置镜像源"章节）

### 5. git origin 警告

**警告信息：**
```
Warning: Suspicious https://mirrors.ustc.edu.cn/brew.git git origin remote found.
The current git origin is: https://github.com/Homebrew/brew
```

**原因：** 配置了镜像源环境变量，但 git 远程地址仍指向官方源。

**解决方法：**
```bash
# 修改 git 远程地址到镜像源
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote set-url origin https://mirrors.ustc.edu.cn/brew.git
git -C "/home/linuxbrew/.linuxbrew/Homebrew/Library/Taps/homebrew/homebrew-core" remote set-url origin https://mirrors.ustc.edu.cn/homebrew-core.git

# 验证修改
git -C "/home/linuxbrew/.linuxbrew/Homebrew" remote -v
```

### 6. 缺少开发者工具警告

**警告信息：**
```
Warning: No developer tools installed.
Install Clang or run `brew install gcc`.
```

**说明：** 这只是提醒信息，不影响使用。如果需要安装需要编译的软件，需要先安装编译器。

**解决方法：**
```bash
# 安装 gcc 编译器
brew install gcc
```

### 7. SSL 证书错误

**解决方法：**
```bash
# 更新 CA 证书
sudo apt update
sudo apt install -y ca-certificates
```

---

## 参考资源

- [Homebrew 官方文档](https://docs.brew.sh/)
- [Homebrew Linux 安装说明](https://docs.brew.sh/Linux)
- [中科大开源镜像站](https://mirrors.ustc.edu.cn/help/brew.git.html)
- [清华大学开源镜像站](https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/)

---

**文档版本：** v1.0
**更新日期：** 2026-02-06
**维护者：** 运维团队
