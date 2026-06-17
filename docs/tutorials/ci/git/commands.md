---
title: Git 常用命令
---
# Git 常用命令

Git 日常开发中常用的命令速查。

## 目录

- [分支操作](#分支操作)
- [远程仓库管理](#远程仓库管理)
- [SSH 配置](#ssh-配置)
- [常用组合命令](#常用组合命令)
- [参考资源](#参考资源)

---

## 分支操作

### 查看分支

```bash
# 查看本地分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 查看远程分支
git branch -r

# 查看分支详细信息（最后一次提交）
git branch -v

# 查看所有分支详细信息
git branch -av
```

### 新建分支

```bash
# 创建新分支（但不切换）
git branch <branch-name>

# 创建并切换到新分支
git checkout -b <branch-name>

# 从指定提交创建分支
git branch <branch-name> <commit-hash>

# 从远程分支创建本地分支
git checkout -b <local-branch-name> origin/<remote-branch-name>
```

### 切换分支

```bash
# 切换到已有分支
git checkout <branch-name>

# 切换到上一个分支
git checkout -

# 使用 switch 命令切换（Git 2.23+）
git switch <branch-name>

# 创建并切换到新分支
git switch -c <branch-name>
```

### 合并分支

```bash
# 切换到目标分支
git checkout main

# 合并指定分支到当前分支
git merge <branch-name>

# 合并时不使用 fast-forward（保留分支历史）
git merge --no-ff <branch-name>

# 中止合并
git merge --abort
```

### 删除分支

```bash
# 删除已合并的本地分支
git branch -d <branch-name>

# 强制删除本地分支（未合并也可删除）
git branch -D <branch-name>

# 删除远程分支
git push origin --delete <branch-name>

# 删除本地已删除的远程分支的追踪
git fetch -p
# 或
git remote prune origin
```

### 一键删除本地无用分支

> **注意**：以下命令使用 `grep`、`awk`、`xargs`，在 Linux/macOS/Git Bash 中可用。Windows PowerShell 用户请使用 Git Bash 或手动执行。

删除所有已合并到当前分支的本地分支：

```bash
# 删除所有已合并到当前分支的分支（排除 main/master/develop）
git branch --merged | grep -vE "^\*|main|master|develop" | xargs git branch -d
```

删除所有本地分支（保留当前分支和 main/master）：

```bash
# 危险操作！删除所有本地分支，只保留当前分支、main 和 master
git branch | grep -vE "^\*|main|master" | xargs git branch -D
```

删除已不存在的远程分支对应的本地追踪分支：

```bash
# 清理远程已删除的分支的本地引用
git fetch -p && git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -D
```

**Windows PowerShell 替代方案**：

```powershell
# 删除已合并的分支（排除 main/master/develop 和当前分支）
git branch --merged | Where-Object { $_ -notmatch '^\*|main|master|develop' } | ForEach-Object { git branch -d $_.Trim() }
```

### 重命名分支

```bash
# 重命名本地分支
git branch -m <old-name> <new-name>

# 重命名当前分支
git branch -m <new-name>
```

---

## 远程仓库管理

### 查看远程仓库

```bash
# 查看远程仓库列表
git remote

# 查看远程仓库详细信息
git remote -v

# 查看指定远程仓库的详细信息
git remote show origin
```

### 添加远程仓库

```bash
# 添加远程仓库
git remote add origin git@github.com:username/repo.git

# 添加第二个远程仓库（使用不同名称）
git remote add upstream git@github.com:original-owner/repo.git

# 添加镜像仓库
git remote add mirror git@gitlab.com:username/repo.git
```

### 修改远程仓库

```bash
# 修改远程仓库 URL
git remote set-url origin git@github.com:username/new-repo.git

# 修改远程仓库名称
git remote rename old-name new-name

# 修改远程仓库的推送 URL（与拉取 URL 不同）
git remote set-url --push origin git@github.com:username/repo.git
```

### 删除远程仓库

```bash
# 删除远程仓库
git remote remove origin

# 或使用 rm
git remote rm origin
```

### 推送到远程仓库

```bash
# 推送当前分支到远程仓库
git push origin <branch-name>

# 推送并设置上游分支（首次推送）
git push -u origin <branch-name>

# 推送所有分支
git push --all origin

# 推送所有标签
git push --tags

# 强制推送（危险操作！）
git push -f origin <branch-name>
# 或使用 --force-with-lease（更安全）
git push --force-with-lease origin <branch-name>
```

### 从远程仓库拉取

```bash
# 拉取远程分支并合并
git pull origin <branch-name>

# 拉取并使用 rebase 合并
git pull --rebase origin <branch-name>

# 获取远程仓库信息（不合并）
git fetch origin

# 获取所有远程仓库信息
git fetch --all
```

---

## SSH 配置

详细的 SSH 配置请参考 [Git 配置指南](./#ssh-密钥配置)。

### 快速配置 SSH

```bash
# 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your.email@example.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub

# 测试 SSH 连接
ssh -T git@github.com
```

### 使用 SSH URL 克隆仓库

```bash
# 使用 SSH 协议克隆
git clone git@github.com:username/repo.git

# 将 HTTPS 仓库改为 SSH
git remote set-url origin git@github.com:username/repo.git

# 将 SSH 仓库改为 HTTPS
git remote set-url origin https://github.com/username/repo.git
```

---

## 常用组合命令

### 同步远程分支到本地

```bash
# 获取最新远程分支信息
git fetch origin

# 查看远程分支
git branch -r

# 创建本地分支跟踪远程分支
git checkout -b feature-xxx origin/feature-xxx
```

### 完整的分支管理流程

```bash
# 1. 从 main 创建新分支
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 2. 开发完成后推送
git push -u origin feature/new-feature

# 3. 合并到 main
git checkout main
git pull origin main
git merge --no-ff feature/new-feature
git push origin main

# 4. 清理分支
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

---

## 参考资源

- [Git 配置指南](./) - SSH 密钥配置、多平台配置等
- [Git 官方文档](https://git-scm.com/doc)
- [Pro Git 中文版](https://git-scm.com/book/zh/v2)

---

**文档版本：** v1.0  
**更新日期：** 2026-05-08  
**维护者：** 开发团队




