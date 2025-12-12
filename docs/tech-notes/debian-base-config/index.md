---
title: Debian 13 系统基础配置
---

本文档介绍在完成 Debian 13 系统最小化安装后，需要进行的基础配置操作。这些配置将提高系统的易用性和功能性。

## 1. 配置APT软件源

### 问题说明
使用 DVD ISO 安装 Debian 系统后，默认使用本地光盘作为软件源，需要更换为国内镜像源以提高下载速度和软件可用性。

### 操作步骤

```bash
# 1. 备份原始配置文件
cp /etc/apt/sources.list /etc/apt/sources.list.bak

# 2. 使用中科大镜像源替换配置
sed -i '1,$c\deb https://mirrors.ustc.edu.cn/debian/ trixie main contrib non-free non-free-firmware\ndeb https://mirrors.ustc.edu.cn/debian/ trixie-updates main contrib non-free non-free-firmware\ndeb https://mirrors.ustc.edu.cn/debian/ trixie-backports main contrib non-free non-free-firmware\ndeb https://mirrors.ustc.edu.cn/debian-security trixie-security main contrib non-free non-free-firmware' /etc/apt/sources.list

# 3. 更新软件包索引
apt update
```

### 其他可选镜像源
如果中科大镜像访问较慢，可以选择其他国内镜像源：

**清华大学镜像源**:
```bash
sed -i '1,$c\deb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie main contrib non-free non-free-firmware\ndeb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie-updates main contrib non-free non-free-firmware\ndeb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie-backports main contrib non-free non-free-firmware\ndeb https://mirrors.tuna.tsinghua.edu.cn/debian-security trixie-security main contrib non-free non-free-firmware' /etc/apt/sources.list
```

**阿里云镜像源**:
```bash
sed -i '1,$c\deb https://mirrors.aliyun.com/debian/ trixie main contrib non-free non-free-firmware\ndeb https://mirrors.aliyun.com/debian/ trixie-updates main contrib non-free non-free-firmware\ndeb https://mirrors.aliyun.com/debian/ trixie-backports main contrib non-free non-free-firmware\ndeb https://mirrors.aliyun.com/debian-security trixie-security main contrib non-free non-free-firmware' /etc/apt/sources.list
```

> ⚠️ **重要提示**: 当前系统为最小化安装，尚未配置 `sudo` 命令。请使用 `root` 账户执行上述命令。

## 2. 安装基础软件包

安装一些常用的系统工具和软件包：

```bash
apt install sudo curl gpg vim net-tools
```

### 软件包功能说明

| 软件包 | 功能描述 | 使用场景 |
|--------|----------|----------|
| **sudo** | 权限提升工具 | 允许普通用户以管理员权限执行命令 |
| **curl** | 网络请求工具 | HTTP/HTTPS请求、API调用、文件下载 |
| **gpg** | GNU隐私卫士 | 软件包签名验证、密钥管理（Docker、K8s安装必需） |
| **vim** | 文本编辑器 | 系统配置文件编辑 |
| **net-tools** | 网络工具集 | 包含ifconfig、netstat等经典网络命令 |

### 可选安装包

根据需要，您还可以安装以下有用的软件包：

```bash
# 系统监控工具
apt install htop iotop

# 网络诊断工具
apt install traceroute telnet dnsutils

# 开发工具
apt install git build-essential

# 文件传输工具
apt install wget unzip
```

## 3. 优化Root用户Shell环境

为了提升 root 用户的命令行使用体验，需要配置相关的环境文件：

```bash
# 复制默认shell配置文件到root用户目录
cp /etc/skel/.profile /root/
cp /etc/skel/.bashrc /root/

# 重新加载配置文件使更改立即生效
source /root/.profile
source /root/.bashrc
```

### 配置说明

- `.profile`: 用户登录时执行的环境配置文件
- `.bashrc`: Bash shell的配置文件，包含别名、函数等设置

### 验证配置

重新登录root用户或执行以下命令验证配置是否生效：

```bash
# 检查是否有彩色提示符
echo $PS1

# 检查常用命令别名是否生效
alias ls
alias ll
```

## 4. 添加系统管理命令到PATH

普通用户默认无法执行 `/sbin` 和 `/usr/sbin` 目录下的系统管理命令，需要将这些路径添加到用户PATH环境变量中：

```bash
echo 'export PATH=$PATH:/sbin:/usr/sbin' | tee /etc/profile.d/user-sbin-path.sh
```

### 配置说明

- `/sbin`: 系统二进制文件，包含重要的系统管理命令
- `/usr/sbin`: 用户系统管理二进制文件
- `tee` 命令同时输出到屏幕和文件
- `/etc/profile.d/user-sbin-path.sh` 系统级配置文件，对所有用户生效

### 使配置立即生效

```bash
# 重新加载系统环境配置
source /etc/profile
```

### 验证配置

```bash
# 测试是否可以执行系统管理命令
which ifconfig
which iptables
```

## 5. 配置普通用户Sudo权限

为了允许普通用户执行管理员命令，需要将用户添加到sudo组中：

```bash
usermod -aG sudo 用户名
```

### 使用示例

```bash
# 将用户 'john' 添加到sudo组
usermod -aG sudo john

# 将用户 'alice' 添加到sudo组
usermod -aG sudo alice
```

### 参数说明

- `-a`: **append**（追加），将用户添加到组而不移除其他组成员资格
- `-G`: **groups**，指定用户要加入的附加组
- `sudo`: Debian中的管理员组

### 验证配置

1. **检查用户组归属**:
   ```bash
   groups 用户名
   # 或者
   id 用户名
   ```

2. **测试sudo权限**:
   ```bash
   # 切换到普通用户
   su - 用户名

   # 测试sudo命令
   sudo whoami
   # 应该返回 'root'
   ```

3. **查看sudoers配置**:
   ```bash
   sudo -l
   ```

### 重要提示

- 需要用户重新登录才能使组权限生效
- 首次使用sudo时需要输入用户密码
- sudo组的权限默认允许执行所有命令，生产环境中建议配置更精细的权限控制
