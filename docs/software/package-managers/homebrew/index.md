# Homebrew 在 macOS 上的安装与国内源配置

## 什么是 Homebrew

Homebrew 是 macOS 上的包管理器，可以方便地安装、更新和管理各种软件包。它使用简单的命令行界面，支持数千个开源软件包。

## 安装 Homebrew

### 前置要求

- macOS 14 (Sonoma) 或更高版本
- Apple Silicon CPU 或 64 位 Intel CPU
- Xcode Command Line Tools

### 安装 Xcode Command Line Tools

如果尚未安装，运行以下命令：

```bash
xcode-select --install
```

按照提示完成安装。

### 安装 Homebrew

打开终端，运行以下命令：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安装过程可能需要几分钟，需要输入用户密码。

### 验证安装

```bash
brew --version
```

如果看到版本信息，说明安装成功。

## 配置国内镜像源

由于网络原因，使用国内镜像源可以显著提高下载速度。

> **注意**：自 Homebrew 4.0.0 起，大部分用户通过 API 安装软件包，无需设置 `homebrew-core` 和 `homebrew-cask` 仓库镜像。只需设置 `HOMEBREW_API_DOMAIN` 和 `HOMEBREW_BOTTLE_DOMAIN` 即可。

### 配置清华大学镜像源

#### 配置 API 和 Bottles 镜像

**Zsh（推荐用于 macOS）**：

```bash
echo 'export HOMEBREW_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/api"' >> ~/.zprofile
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn"' >> ~/.zprofile
source ~/.zprofile
```

**Bash**：

```bash
echo 'export HOMEBREW_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/api"' >> ~/.bash_profile
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn"' >> ~/.bash_profile
source ~/.bash_profile
```

#### 替换 brew 核心仓库

```bash
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
brew update
```

> **注意**：如果需要使用 Homebrew 的开发命令（如 `brew cat <formula>`），则需要设置 core 和 cask 仓库镜像：

```bash
brew tap --custom-remote homebrew/core https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git
brew tap --custom-remote homebrew/cask https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask.git
```



## 恢复官方源

如果需要恢复到官方源：

```bash
# 删除环境变量
unset HOMEBREW_API_DOMAIN
unset HOMEBREW_BOTTLE_DOMAIN

# 重新拉取远程
brew update
```

**从配置文件中删除镜像配置**：

编辑 `~/.zprofile`（zsh）或 `~/.bash_profile`（bash），删除以下环境变量相关行：
- `HOMEBREW_API_DOMAIN`
- `HOMEBREW_BOTTLE_DOMAIN`

## 常用命令

```bash
# 更新 Homebrew 和所有软件包
brew update

# 升级所有已安装的软件包
brew upgrade

# 安装软件包
brew install <formula>

# 卸载软件包
brew uninstall <formula>

# 搜索软件包
brew search <formula>

# 查看已安装的软件包
brew list

# 查看软件包信息
brew info <formula>

# 查看过时的软件包
brew outdated

# 清理旧版本
brew cleanup

# 诊断问题
brew doctor
```

## 常用软件包示例

```bash
# 安装 wget
brew install wget

# 安装 git
brew install git

# 安装 node
brew install node

# 安装 python
brew install python

# 安装 java
brew install openjdk

# 安装 docker
brew install --cask docker
```

## 故障排除

### 问题：权限错误

**Intel 芯片 Mac**：

```bash
sudo chown -R $(whoami) /usr/local/var/homebrew
```

**Apple Silicon（M 系列芯片）Mac**：

```bash
sudo chown -R $(whoami) /opt/homebrew/var/homebrew
```

### 问题：Git 速度慢

确保已经正确配置镜像源，或者使用代理：

```bash
git config --global http.proxy http://proxy_address:port
git config --global https.proxy https://proxy_address:port
```

### 问题：无法连接到 GitHub

检查网络连接，或使用镜像源。也可以在 `/etc/hosts` 中添加：

```
185.199.108.133 raw.githubusercontent.com
185.199.109.133 raw.githubusercontent.com
185.199.110.133 raw.githubusercontent.com
185.199.111.133 raw.githubusercontent.com
```

### 问题：SSL 证书错误

```bash
brew update --force
brew doctor
```

## 最佳实践

1. **定期更新**：定期运行 `brew update` 和 `brew upgrade`
2. **清理旧版本**：运行 `brew cleanup` 释放磁盘空间
3. **使用官方软件包优先**：优先使用 Cask 安装 GUI 应用程序
4. **备份配置**：定期备份自定义的 Tap 和配置文件
5. **查看健康状态**：定期运行 `brew doctor` 检查问题

## 参考资源

- [Homebrew 官方网站](https://brew.sh/)
- [Homebrew GitHub](https://github.com/Homebrew/brew)
- [清华大学开源软件镜像站](https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/)
