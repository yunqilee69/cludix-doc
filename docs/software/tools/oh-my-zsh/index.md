# Oh My Zsh配置

Oh My Zsh是一个强大的Zsh框架，提供丰富的插件和主题配置，提升终端使用体验。

## 安装Oh My Zsh

```bash
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

安装完成后，Zsh会自动成为默认Shell。

## 配置备份与恢复

### 备份位置

Oh My Zsh 安装时会自动备份原有的配置文件：
- `~/.zshrc` → `~/.zshrc.pre-oh-my-zsh`

### 恢复原有配置

如果安装 Oh My Zsh 后发现之前的配置（如 NVM、SDKMAN 等）丢失，可以按照以下步骤恢复：

1. **查看备份文件内容**

```bash
cat ~/.zshrc.pre-oh-my-zsh
```

2. **将备份配置添加到新的 .zshrc**

编辑 `~/.zshrc`，在文件末尾添加备份文件中的配置（通常包括 NVM、SDKMAN 等环境配置）：

```bash
# 示例：从备份文件中添加 NVM 和 SDKMAN 配置
# NVM 配置
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix)/opt/nvm/nvm.sh" ] && . "$(brew --prefix)/opt/nvm/nvm.sh"

# SDKMAN 配置（必须在文件末尾）
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"
```

3. **重新加载配置**

```bash
source ~/.zshrc
```

**注意**：
- 不要完全替换 `.zshrc`，而是将备份文件中的个人配置追加到 Oh My Zsh 配置的末尾
- SDKMAN 的配置必须放在 `.zshrc` 文件的最末尾
- 建议在修改前先备份当前的配置文件

## 配置主题

### 查看内置主题

Oh My Zsh内置了丰富的主题，可以在 `~/.oh-my-zsh/themes/` 目录下查看所有可用主题。

### 更换内置主题

编辑配置文件：

```bash
nano ~/.zshrc
```

找到 `ZSH_THEME` 配置项，修改为主题名称：

```bash
ZSH_THEME="robbyrussell"  # 默认主题
# 或者尝试其他内置主题
ZSH_THEME="agnoster"
ZSH_THEME="powerline"
ZSH_THEME="bira"
```

保存后重新加载配置：

```bash
source ~/.zshrc
```

### 安装Powerlevel10k主题

Powerlevel10k是目前最流行的Oh My Zsh主题，速度快、显示信息丰富。

#### 克隆主题仓库

```bash
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
```

#### 配置主题

编辑 `~/.zshrc`，设置主题为 Powerlevel10k：

```bash
ZSH_THEME="powerlevel10k/powerlevel10k"
```

#### 配置向导

重新加载配置后，Powerlevel10k会自动启动配置向导：

```bash
source ~/.zshrc
```

按照向导提示选择合适的样式，包括：
- 图标样式（ASCII/Unicode）
- 提示符颜色
- 时间显示
- 目录显示模式
- Git状态显示

#### 重新配置

如果需要重新配置Powerlevel10k，运行：

```bash
p10k configure
```

## 安装常用插件

### 查看内置插件

所有内置插件位于 `~/.oh-my-zsh/plugins/` 目录。

### 启用内置插件

编辑 `~/.zshrc`，在 `plugins=(...)` 部分添加插件：

```bash
plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
  z
  sudo
)
```

#### 常用插件说明

- **git**: Git命令补全和别名
- **z**: 快速跳转到常用目录
- **sudo**: 双击ESC快速添加sudo
- **extract**: 统一解压命令

### 安装外部插件

#### zsh-autosuggestions（自动补全建议）

```bash
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

#### zsh-syntax-highlighting（语法高亮）

```bash
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

配置完成后重新加载：

```bash
source ~/.zshrc
```

## 常用配置

### 历史记录配置

编辑 `~/.zshrc`，添加以下配置：

```bash
# 历史记录保存数量
HISTSIZE=10000
SAVEHIST=10000

# 历史记录文件
HISTFILE=~/.zsh_history

# 不记录重复命令
setopt HIST_IGNORE_DUPS

# 不记录以空格开头的命令
setopt HIST_IGNORE_SPACE
```

### 别名配置

在 `~/.zshrc` 中添加常用别名：

```bash
# 文件操作
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Git别名
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph --decorate'

# Docker别名
alias dps='docker ps'
alias dpsa='docker ps -a'
alias di='docker images'
alias dex='docker exec -it'
```

### 环境变量配置

```bash
# 编辑器
export EDITOR=nano
export VISUAL=nano

# 语言设置
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8
```

## 解决终端图标显示问题

某些主题（如 Powerlevel10k）使用特殊图标字符，在 VSCode 或 JetBrains 等编辑器的终端中可能无法正常显示。

### 问题验证

在终端中执行以下命令测试：

```bash
echo $'\uf179 \uf07c \uf418 \ue0b0'
```

如果显示的是乱码或方框，需要安装 Nerd Font 字体。

### 安装 Nerd Font 字体

推荐使用 Meslo 字体（与 iTerm2 和 Oh My Zsh 官方示例同族，视觉协调）：

```bash
brew tap homebrew/cask-fonts
brew install --cask font-meslo-lg-nerd-font
```

安装完成后，字体册中会出现 `MesloLGS NF` / `MesloLGM Nerd Font` 等条目。

### VSCode 配置

在设置中搜索 `terminal.integrated.fontFamily`，修改为：

```
MesloLGM Nerd Font
```

保存后重启 VSCode 终端，图标即可正常显示。

### JetBrains 系列配置

- 打开 `Preferences` → `Editor` → `Font`
- 取消勾选 `Use console font`
- 将 `Console Font` 设置为 `MesloLGM Nerd Font`
- 点击 `Apply & Restart`

### 验证

在终端执行：

```bash
echo $'\uf179 \uf07c \uf418 \ue0b0'
```

能看到苹果、文件夹、Git 分支图标和三角形，即表示 Nerd Font 已生效。然后运行：

```bash
omz reload
```

左侧提示符的图标会正常显示。

## 切换回Bash

如果需要切换回Bash：

```bash
chsh -s /bin/bash
```

切换到Zsh：

```bash
chsh -s /bin/zsh
```

## 卸载Oh My Zsh

运行卸载脚本：

```bash
uninstall_oh_my_zsh
```

## 参考资料

- [Oh My Zsh官方文档](https://github.com/ohmyzsh/ohmyzsh)
- [Powerlevel10k官方文档](https://github.com/romkatv/powerlevel10k)
- [Oh My Zsh主题列表](https://github.com/ohmyzsh/ohmyzsh/wiki/Themes)
- [Oh My Zsh插件列表](https://github.com/ohmyzsh/ohmyzsh/wiki/Plugins)
