---
title: SSH 免密登录
date: 2026-07-13 10:00
tags: [linux, security, auth, configuration]
---

# SSH 免密登录

实现机器 A 通过 SSH 连接机器 B 时无需输入密码，基于公钥认证方式完成。

## 原理

SSH 公钥认证流程：

1. A 生成密钥对（私钥 + 公钥）
2. A 将公钥复制到 B 的 `~/.ssh/authorized_keys`
3. A 连接 B 时，B 用公钥加密一个随机数发给 A
4. A 用私钥解密后返回，B 验证通过，无需密码

## 步骤

### 1. 在 A 上生成密钥对

```bash
ssh-keygen -t ed25519 -C "your_comment"
```

- `-t ed25519`：使用 Ed25519 算法（推荐，更安全更快）
- `-C`：注释，通常用邮箱或用途标识

执行后会有三个提示：

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/user/.ssh/id_ed25519):  # 直接回车，使用默认路径
Enter passphrase (empty for no passphrase):  # 直接回车，不设密码（否则每次仍需输入）
Enter same passphrase again:  # 直接回车
```

生成结果：

- 私钥：`~/.ssh/id_ed25519`（**绝不能泄露**）
- 公钥：`~/.ssh/id_ed25519.pub`

> 如果需要兼容老旧系统，可使用 `ssh-keygen -t rsa -b 4096`。

### 2. 将公钥复制到 B

**方式一：使用 ssh-copy-id（推荐）**

```bash
ssh-copy-id user@B的IP
```

该命令会自动将 A 的公钥追加到 B 的 `~/.ssh/authorized_keys` 文件中，并设置正确的权限。

如果 A 上有多个密钥，可指定公钥文件：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@B的IP
```

**方式二：手动复制**

如果 `ssh-copy-id` 不可用，可以手动操作：

```bash
# 在 A 上查看公钥内容
cat ~/.ssh/id_ed25519.pub

# SSH 登录到 B，将公钥内容追加到 authorized_keys
ssh user@B的IP
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**方式三：一行命令完成**

```bash
cat ~/.ssh/id_ed25519.pub | ssh user@B的IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### 3. 确认 B 的 sshd 配置

在 B 上检查 SSH 服务端是否开启了公钥认证：

```bash
grep -E "PubkeyAuthentication|AuthorizedKeysFile" /etc/ssh/sshd_config
```

确保以下配置未被注释或设为 no：

```
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

> 大多数发行版默认已开启，但部分云服务器镜像会显式关闭。

如果需要修改，编辑后重启 sshd：

```bash
sudo systemctl restart sshd
```

### 4. 验证

```bash
ssh user@B的IP
```

如果配置正确，应该直接登录，不再提示输入密码。

## 常见问题

### 权限问题

SSH 对权限要求非常严格，如果权限不对会拒绝公钥认证：

```bash
# 在 B 上检查和修复权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_ed25519       # 如果 B 上也有私钥
chmod 644 ~/.ssh/id_ed25519.pub   # 公钥可以 644

# 家目录权限也不能太宽松
chmod 755 ~
```

### SELinux 问题（CentOS/RHEL）

如果 SELinux 开启，可能需要恢复安全上下文：

```bash
restorecon -Rv ~/.ssh
```

### 连接仍要求密码

排查步骤：

1. **密钥文件名不是默认名**（最常见）：

   SSH 默认只尝试标准文件名（`id_rsa`、`id_ed25519` 等）。如果密钥文件名不是默认名，SSH **不会自动尝试**，直接回退到密码认证。

   > 这在 Windows 上尤其常见，很多工具生成的密钥文件名不是默认格式（如 `id_192.168.100_11`）。

   用 `ssh -vvv` 排查时，如果看到 `no such identity` 对默认密钥报错，且没有 `Offering public key` 你的实际密钥，就是这个问题。

   **解决方式一**：命令行 `-i` 指定密钥

   ```bash
   ssh -i ~/.ssh/my_key user@B的IP

   # Windows 示例
   ssh -i C:\Users\admin\.ssh\id_192.168.100_11 yunqi@192.168.100.11
   ```

   **解决方式二**：写入 `~/.ssh/config`（推荐）

   ```bash
   # Linux: ~/.ssh/config
   # Windows: C:\Users\用户名\.ssh\config
   ```

   ```
   Host 192.168.100.11
       User yunqi
       IdentityFile ~/.ssh/id_192.168.100_11
   ```

   之后直接 `ssh 192.168.100.11` 即可。

2. **查看服务端日志**（在 B 上）：

   ```bash
   # Debian/Ubuntu
   sudo tail -f /var/log/auth.log
   
   # CentOS/RHEL
   sudo tail -f /var/log/secure
   ```

3. **客户端调试连接**（在 A 上）：

   ```bash
   ssh -vvv user@B的IP
   ```

   关注 `Offering public key` 和 `Authentication succeeded` 相关输出。

4. **确认 B 的 sshd 配置**：参考[步骤 3](#3-确认-b-的-sshd-配置)，确保 `PubkeyAuthentication yes`。

### 已有 known_hosts 冲突

如果 B 重装过系统，指纹会变化：

```bash
ssh-keygen -R B的IP
```

删除旧指纹后重新连接即可。

## 安全建议

- **私钥绝不离开本机**：不要通过邮件、聊天工具发送私钥
- **使用 Ed25519**：比 RSA 更安全、密钥更短、速度更快
- **生产环境考虑 passphrase**：给私钥加密码，配合 `ssh-agent` 使用，防止私钥泄露后被直接利用
- **禁用密码登录**：确认公钥认证可用后，在 B 的 `/etc/ssh/sshd_config` 中设置 `PasswordAuthentication no`，仅允许公钥认证
- **定期轮换密钥**：长期使用的密钥建议定期更换
