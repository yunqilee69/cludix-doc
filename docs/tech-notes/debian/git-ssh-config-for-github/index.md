# Debian配置Github的SSH连接

在debian系统上配置ssh,实现通过ssh协议来对github仓库进行操作

## 配置全局名称和邮箱

需要在全局配置你的git名称和邮箱，用于提交commit时使用

```bash
git config --global user.name "你的名称，推荐github账号名"
git config --global user.email "你的邮箱，推荐github邮箱"

# 确保你的配置是正确的
git config --list
```

## 本地生成公私钥

使用下面命令生成公私钥，直接将对应配置放在 `~/.ssh` 目录下

```bash
# 一路回车即可，文件默认位置为 ~/.ssh目录下
ssh-keygen -t rsa -b 4096 -C "你的邮箱"
```

生成后，会在.ssh目录下存在两个id_rsa文件，只需要复制id_rsa.pub的内容（公钥）。
yunqi@debian:~/.ssh$ ls
id_rsa  id_rsa.pub  known_hosts  known_hosts.old

### github账号配置公钥

1. 登录 GitHub 账户
2. 点击右上角头像 → Settings
3. 左侧菜单选择 "SSH and GPG keys"
4. 点击 "New SSH key"
5. Title 输入描述性名称（如 "Debian Desktop"）
6. Key 字段粘贴复制的公钥内容
7. 点击 "Add SSH key"

### 测试

在完成上面步骤的修改后，使用下面的ssh命令进行测试，第一次测试时，需要输入一次yes进行测试连接

```bash
ssh -T git@github.com
```

成功后，会有以下类似的输出
Hi username! You've successfully authenticated, but GitHub does not provide shell access.