# Git 配置指南

Git 相关的配置和工具使用文档。

## 目录

- [基础配置](#基础配置)
- [SSH 密钥配置](#ssh-密钥配置)
- [验证 SSH 连接](#验证-ssh-连接)
- [多平台 SSH 配置](#多平台-ssh-配置)
- [常见问题](#常见问题)

---

## 基础配置

### 配置用户名和邮箱

Git 需要配置用户名和邮箱，用于提交记录。

#### 查看当前配置

```bash
# 查看全局配置
git config --global user.name
git config --global user.email

# 查看所有配置
git config --global --list
```

#### 设置全局用户名和邮箱

```bash
# 设置用户名
git config --global user.name "Your Name"

# 设置邮箱
git config --global user.email "your.email@example.com"
```

#### 为特定仓库设置不同的用户名和邮箱

```bash
# 进入项目目录
cd /path/to/project

# 设置仓库级别的用户名和邮箱（不加 --global）
git config user.name "Your Work Name"
git config user.email "your.work@company.com"

# 查看当前仓库配置
git config --local user.name
git config --local user.email
```

---

## SSH 密钥配置

SSH 密钥用于免密码与 Git 服务器进行安全通信。

### 检查现有 SSH 密钥

```bash
# 查看已有的 SSH 密钥
ls -al ~/.ssh

# 常见的密钥文件名：
# id_rsa / id_rsa.pub
# id_ed25519 / id_ed25519.pub
```

### 生成新的 SSH 密钥

#### 生成 RSA 密钥（传统方式）

```bash
# 生成 4096 位 RSA 密钥
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"

# 按提示操作：
# 1. 保存位置（默认 ~/.ssh/id_rsa）
# 2. 输入密码短语（可选，直接回车跳过）
# 3. 确认密码短语
```

#### 生成 Ed25519 密钥（推荐）

```bash
# 生成 Ed25519 密钥（更安全、更快）
ssh-keygen -t ed25519 -C "your.email@example.com"

# 如果系统不支持 Ed25519，使用 RSA
# ssh-keygen -t rsa -b 4096 -C "your.email@example.com"
```

### 查看和复制公钥

```bash
# 查看公钥内容
cat ~/.ssh/id_ed25519.pub
# 或
cat ~/.ssh/id_rsa.pub

# 复制公钥到剪贴板（Linux/macOS）
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
# 或
cat ~/.ssh/id_ed25519.pub | pbcopy  # macOS

# 复制公钥到剪贴板（WSL/Windows）
cat ~/.ssh/id_ed25519.pub | clip.exe
```

### 添加公钥到 Git 服务器

#### GitHub

1. 访问 [GitHub SSH 设置](https://github.com/settings/keys)
2. 点击 **New SSH key**
3. 输入标题（如 "Debian Server"）
4. 粘贴公钥内容
5. 点击 **Add SSH key**

#### GitLab

1. 访问 [GitLab SSH 设置](https://gitlab.com/-/profile/keys)
2. 点击 **Add new key**
3. 粘贴公钥内容
4. 点击 **Add key**

#### Gitee（码云）

1. 访问 [Gitee SSH 设置](https://gitee.com/profile/sshkeys)
2. 点击 **添加公钥**
3. 粘贴公钥内容
4. 点击 **确定**

### 启动 SSH 代理并添加密钥

```bash
# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加私钥到 ssh-agent
ssh-add ~/.ssh/id_ed25519
# 或
ssh-add ~/.ssh/id_rsa

# 查看已添加的密钥
ssh-add -l
```

### 配置 SSH 自动加载

编辑 `~/.ssh/config`：

```bash
nano ~/.ssh/config
```

添加以下内容：

```
Host *
    AddKeysToAgent yes
    IdentityFile ~/.ssh/id_ed25519
```

---

## 验证 SSH 连接

### 测试 GitHub 连接

```bash
# 测试 GitHub SSH 连接
ssh -T git@github.com

# 成功输出示例：
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

### 测试 GitLab 连接

```bash
# 测试 GitLab SSH 连接
ssh -T git@gitlab.com

# 成功输出示例：
# Welcome to GitLab, @username!
```

### 测试 Gitee 连接

```bash
# 测试 Gitee SSH 连接
ssh -T git@gitee.com

# 成功输出示例：
# Hi username! You've successfully authenticated, but Gitee does not provide shell access.
```

---

## 多平台 SSH 配置

当需要同时使用多个 Git 服务（如 GitHub、GitLab、Gitee）时，可以为每个平台生成不同的 SSH 密钥。

### 为不同平台生成独立密钥

```bash
# 为 GitHub 生成密钥
ssh-keygen -t ed25519 -C "your.email@example.com" -f ~/.ssh/id_ed25519_github

# 为 GitLab 生成密钥
ssh-keygen -t ed25519 -C "your.email@example.com" -f ~/.ssh/id_ed25519_gitlab

# 为 Gitee 生成密钥
ssh-keygen -t ed25519 -C "your.email@example.com" -f ~/.ssh/id_ed25519_gitee
```

### 配置 SSH config 文件

创建或编辑 `~/.ssh/config`：

```bash
nano ~/.ssh/config
```

添加以下配置：

```
# GitHub
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    IdentitiesOnly yes

# GitLab
Host gitlab.com
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/id_ed25519_gitlab
    IdentitiesOnly yes

# Gitee
Host gitee.com
    HostName gitee.com
    User git
    IdentityFile ~/.ssh/id_ed25519_gitee
    IdentitiesOnly yes
```

**配置说明：**
- `Host`: 别名，可以使用简短名称（如 `gh` 代替 `github.com`）
- `HostName`: 实际的服务器地址
- `User`: 登录用户名（Git 服务统一使用 `git`）
- `IdentityFile`: 指定的私钥文件路径
- `IdentitiesOnly yes`: 只使用指定的 IdentityFile，不使用默认的 ssh-agent

### 添加所有密钥到 ssh-agent

```bash
# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加所有密钥
ssh-add ~/.ssh/id_ed25519_github
ssh-add ~/.ssh/id_ed25519_gitlab
ssh-add ~/.ssh/id_ed25519_gitee

# 查看已添加的密钥
ssh-add -l
```

### 使用别名简化操作

可以在 `~/.ssh/config` 中使用简短的别名：

```
# GitHub - 使用简短别名
Host gh
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github

# GitLab - 使用简短别名
Host gl
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/id_ed25519_gitlab

# Gitee - 使用简短别名
Host gee
    HostName gitee.com
    User git
    IdentityFile ~/.ssh/id_ed25519_gitee
```

使用别名克隆仓库：

```bash
# 使用完整域名
git clone git@github.com:username/repo.git

# 使用别名
git clone git@gh:username/repo.git
```

### 为不同仓库配置不同的用户

如果需要在同一个机器上使用不同的 Git 用户身份，可以为每个仓库单独配置：

```bash
# 进入项目目录
cd /path/to/project

# 为该仓库配置用户名和邮箱
git config user.name "Work Name"
git config user.email "work@company.com"

# 查看配置
git config user.name
git config user.email
```

或者使用条件包含（Git 2.13+）：

编辑 `~/.gitconfig`：

```bash
nano ~/.gitconfig
```

添加：

```ini
[includeIf "gitdir:~/work/"]
    path = ~/.gitconfig-work

[includeIf "gitdir:~/personal/"]
    path = ~/.gitconfig-personal
```

创建工作配置文件 `~/.gitconfig-work`：

```bash
nano ~/.gitconfig-work
```

添加：

```ini
[user]
    name = Your Work Name
    email = work@company.com
```

创建个人配置文件 `~/.gitconfig-personal`：

```bash
nano ~/.gitconfig-personal
```

添加：

```ini
[user]
    name = Your Personal Name
    email = personal@gmail.com
```

---

## 常见问题

### 1. SSH 连接超时或失败

**错误信息：**
```
ssh: connect to host github.com port 22: Connection timed out
```

**解决方法：**

```bash
# 方法1：使用 SSH over HTTPS（端口 443）
# 编辑 ~/.ssh/config
nano ~/.ssh/config

# 添加以下内容
Host github.com
    Hostname ssh.github.com
    Port 443
    User git

# 测试连接
ssh -T git@github.com

# 方法2：配置代理（如果使用代理）
Host github.com
    Hostname github.com
    User git
    ProxyCommand nc -X 5 -x 192.168.100.1:10808 %h %p
```

### 2. 权限拒绝（Permission denied）

**错误信息：**
```
Permission denied (publickey)
```

**解决方法：**

```bash
# 1. 检查密钥是否存在
ls -al ~/.ssh

# 2. 确认公钥已添加到 Git 服务器
cat ~/.ssh/id_ed25519.pub
# 复制并添加到 GitHub/GitLab/Gitee

# 3. 测试 SSH 连接（使用 -v 查看详细信息）
ssh -vT git@github.com

# 4. 确保使用正确的密钥
ssh-add ~/.ssh/id_ed25519
```

### 3. Git 提交时用户名不正确

**解决方法：**

```bash
# 查看当前配置
git config user.name
git config user.email

# 修改当前仓库配置
git config user.name "Correct Name"
git config user.email "correct@email.com"

# 修改最后一次提交（谨慎使用）
git commit --amend --author="Correct Name <correct@email.com>"
```

### 4. 多个密钥冲突

**问题：** SSH 默认尝试所有密钥，导致服务器拒绝连接。

**解决方法：**

在 `~/.ssh/config` 中为每个 Host 添加 `IdentitiesOnly yes`：

```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    IdentitiesOnly yes
```

### 5. SSH 密钥密码短语遗忘

**解决方法：**

```bash
# 生成新密钥
ssh-keygen -t ed25519 -C "your.email@example.com"

# 删除旧密钥的密码短语（不推荐）
openssl rsa -in ~/.ssh/id_rsa -out ~/.ssh/id_rsa_nopass
```

### 6. Git 仓库权限问题

**错误信息：**
```
fatal: detected dubious ownership in repository at '/path/to/repo'
```

**解决方法：**

```bash
# 添加仓库到安全目录
git config --global --add safe.directory /path/to/repo

# 或添加整个目录树
git config --global --add safe.directory '*'
```

---

## 最佳实践

1. **使用 Ed25519 密钥**：更安全、更快速
2. **为不同平台使用不同密钥**：提高安全性和可管理性
3. **为密钥设置密码短语**：增强安全性
4. **定期审查 SSH 密钥**：删除不使用的密钥
5. **使用条件包含**：为不同项目配置不同的用户身份
6. **启用两步验证**：在 Git 服务器上启用 2FA
7. **备份 SSH 密钥**：安全地备份私钥文件

---

## 参考资源

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub SSH 密钥文档](https://docs.github.com/zh/authentication/connecting-to-github-with-ssh)
- [GitLab SSH 密钥文档](https://docs.gitlab.com/ee/user/ssh.html)
- [SSH Config 手册](https://man.openbsd.org/ssh_config)

---

**文档版本：** v1.0
**更新日期：** 2026-02-06
**维护者：** 开发团队
