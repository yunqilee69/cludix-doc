# Debian 13 上部署 Kubernetes 1.33 集群指南

本文档详细介绍如何在 Debian 13 系统上部署 Kubernetes 1.33 集群。本教程示例采用 3 主 3 从的集群架构（宿主机 16C64G，预留资源后用于集群 12C48G）：

> ⚠️ **生产建议**: kubeadm 的 HA（stacked etcd）建议使用至少 3 个控制平面节点（奇数个）以保证 etcd 仲裁能力。

- **主节点**: 2C4G（3个主节点：k8s-m1、k8s-m2、k8s-m3）
- **工作节点**: 2C12G（3个工作节点：k8s-w1 到 k8s-w3）
- **虚拟化平台**: VMware Workstation

## 1. 系统准备

### 1.1 安装 Debian 13 系统

1. **下载镜像**: 获取 Debian 13 DVD ISO 镜像文件
2. **安装要求**: 在软件包选择阶段，仅勾选以下两项：
   - ✅ `基础系统工具` (Standard system utilities)
   - ✅ `SSH Server`
3. **网络配置**: 选择 NAT 网络模式，确保网络稳定性

### 1.2 网络规划

本教程使用以下网络配置：

- **网络模式**: NAT
- **子网**: 192.168.100.0/24
- **网关**: 192.168.100.2
- **DNS**: 223.5.5.5, 8.8.8.8

![VMware NAT配置](image.png)

### 1.3 节点规划

| 主机名 | IP地址 | 角色 | 配置 |
|--------|--------|------|------|
| k8s-m1 | 192.168.100.10 | Master节点 | 2C4G |
| k8s-m2 | 192.168.100.11 | Master节点 | 2C4G |
| k8s-m3 | 192.168.100.12 | Master节点 | 2C4G |
| k8s-w1 | 192.168.100.13 | Worker节点 | 2C12G |
| k8s-w2 | 192.168.100.14 | Worker节点 | 2C12G |
| k8s-w3 | 192.168.100.15 | Worker节点 | 2C12G |

> 💡 **建议**: 首先完整配置一个节点（k8s-m1），然后通过 VMware 克隆功能创建其他节点，最后修改 IP 地址和主机名即可。



## 2. 节点基础配置

以下配置需要在所有节点上执行，建议先完整配置一个节点，然后通过 VMware 克隆功能创建其他节点，最后修改各自的 IP 地址和主机名。

### 2.1 系统基础配置

首先完成 Debian 系统的基础配置，参考：
- [Debian 13 系统基础配置](../debian-base-config/)
- [Debian 13 静态IP配置](../debian-static-ip/)

### 2.2 网络配置

#### 静态IP配置

为第一个节点（k8s-m1）配置静态IP：`192.168.100.10`，其他节点按递增顺序配置。

#### 主机名和hosts文件配置

```bash
# 设置主机名（以k8s-m1为例）
hostnamectl set-hostname k8s-m1

# 编辑hosts文件
vim /etc/hosts
```

在 `/etc/hosts` 文件中添加所有节点的映射关系：

```bash
# Kubernetes集群主机映射
192.168.100.10 k8s-m1
192.168.100.11 k8s-m2
192.168.100.12 k8s-m3
192.168.100.13 k8s-w1
192.168.100.14 k8s-w2
192.168.100.15 k8s-w3
```

> ⚠️ **注意**: 克隆虚拟机后，需要修改每个节点的：
> 1. 静态IP地址（按规划表分配）
> 2. 对应的主机名
> 3. hosts文件保持一致

### 2.3 推荐的主流自动化方案（保留手动方案）

当前文档保留了完整的手动步骤，便于理解原理；在实际落地时，更推荐使用自动化减少逐台配置错误。

**方案A（推荐）: Kubespray + Ansible**
- 业界主流，适合 3 主 3 工这类 kubeadm 集群
- 用 inventory 描述节点后，可一键批量初始化与部署
- 重复执行安全，便于后续扩容和变更

**方案B（当前文档）: 手动逐台配置**
- 适合理解原理、排障和小规模实验
- 成本是步骤多、容易出现漏配或节点配置不一致

> 建议：先按本文手动跑通一次，再切换到 Kubespray/Ansible 做标准化。

参考：
- [Kubespray 项目](https://github.com/kubernetes-sigs/kubespray)
- [kubeadm 官方高可用文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)

## 3. 系统初始化配置

### 3.1 关闭 Swap 分区

**说明**: Kubernetes 要求关闭 Swap 分区，因为 Swap 会影响 Pod 的性能和调度决策。

```bash
# 1) 查看当前 swap 形态（分区 / 文件 / zram）
swapon --show --output=NAME,TYPE,SIZE,USED,PRIO

# 2) 临时关闭所有 swap（立即生效）
swapoff -a

# 3) 永久关闭：注释 fstab 里的 swap 条目（覆盖分区和文件）
cp /etc/fstab /etc/fstab.bak
sed -ri '/\s+swap\s+/ s/^#?/#/' /etc/fstab

# 4) 若系统启用了 dphys-swapfile（Debian 常见）
systemctl disable --now dphys-swapfile 2>/dev/null || true

# 5) 若系统启用了 zram（部分发行版常见）
systemctl disable --now systemd-zram-setup@zram0.service 2>/dev/null || true

# 6) 立即验证
swapon --show
free -h | grep -i swap
# 期望：swapon 无输出，且 free 中 Swap 为 0B

# 7) 重启后再次验证（防止开机被服务重新启用）
reboot
# 重启后执行：
swapon --show
free -h | grep -i swap
```

**常见说明**:
- `swap 分区` 和 `swap 文件` 都会出现在 `swapon --show` 中，`swapoff -a` 可统一关闭。
- 仅改 `fstab` 不一定够，若有 `dphys-swapfile/zram` 服务，会在开机重新启用 swap。

### 3.2 加载内核模块

**说明**: Kubernetes 需要特定的内核模块来支持容器网络和存储。

```bash
# 创建Kubernetes内核模块配置文件
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# 立即加载内核模块
modprobe overlay
modprobe br_netfilter

# 立即验证模块加载状态
lsmod | grep -E 'overlay|br_netfilter'
# 期望看到类似输出：
# br_netfilter           36864  0
# bridge                389120  1 br_netfilter
# overlay               217088  0

# 重启后验证（确保开机自动加载）
reboot
# 重启后执行：
lsmod | grep -E 'overlay|br_netfilter'
```

### 3.3 配置内核参数

**说明**: 设置必要的内核参数以支持 Kubernetes 的网络功能。

```bash
# 创建Kubernetes内核参数配置文件
cat <<EOF | tee /etc/sysctl.d/99-k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# 应用所有系统参数
sysctl --system

# 验证参数设置
sysctl net.bridge.bridge-nf-call-iptables \
       net.bridge.bridge-nf-call-ip6tables \
       net.ipv4.ip_forward
# 期望：所有参数值都为1
# net.bridge.bridge-nf-call-iptables = 1
# net.bridge.bridge-nf-call-ip6tables = 1
# net.ipv4.ip_forward = 1

# 重启后验证（确保参数持久化）
reboot
# 重启后执行：
sysctl net.bridge.bridge-nf-call-iptables \
       net.bridge.bridge-nf-call-ip6tables \
       net.ipv4.ip_forward
```

> 如果 3.3 在不重启时验证异常，通常是 3.2 的 `br_netfilter` 未成功加载导致；请先确认 `lsmod | grep br_netfilter` 有输出。

## 4. 安装和配置 Containerd

Containerd 是 Kubernetes 1.33 推荐的容器运行时，替代了之前的 Docker。

### 4.1 安装 Containerd

```bash
# 更新软件包索引
apt update

# 安装containerd
apt install -y containerd

# 锁定containerd版本，防止意外升级
apt-mark hold containerd

# 创建containerd配置目录
mkdir -p /etc/containerd

# 生成默认配置文件
containerd config default | sudo tee /etc/containerd/config.toml

# 设置containerd开机自启动
systemctl enable --now containerd
```


**安装验证**:
```bash
# 验证安装的版本
containerd --version
# 期望输出：containerd github.com/containerd/containerd vx.x.x
```

### 4.2 关键配置详解

#### 📌 Cgroup 驱动配置

**问题说明**: Kubernetes 中的 kubelet 和容器运行时需要使用统一的 cgroup 驱动模式，否则会出现权限管理和资源控制问题。

**两种驱动模式**:
1. **cgroupfs** (传统模式): 直接使用内核的 cgroup 文件系统
2. **systemd** (现代模式): 通过 systemd 统一管理 cgroup

**检查当前系统的 cgroup 版本**:
```bash
mount | grep -E 'cgroup2|cgroup'
```

如果输出包含 `cgroup2`（现代系统推荐），说明系统支持 cgroup v2，建议使用 systemd 驱动。

**修改配置为 systemd 驱动**:
```bash
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' \
       /etc/containerd/config.toml
```

**为什么必须与 kubelet 保持一致**?
- kubelet 负责为 Pod 分配和管理资源（CPU、内存等）
- containerd 负责实际的容器资源限制
- 如果两者使用不同的 cgroup 驱动，会出现资源管理不一致
- 可能导致 Pod 资源限制失效、节点状态异常等问题

#### 📌 Pause 镜像配置

**什么是 Pause 容器**?
- Pause 容器是 Kubernetes 中每个 Pod 的"基础容器"
- 它为 Pod 内的其他容器提供共享的网络和 PID 命名空间
- 每个 Pod 都会有一个看不见的 pause 容器

**修改 Pause 镜像源**:
```bash
sed -i 's|sandbox_image = .*|sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.10"|' \
       /etc/containerd/config.toml
```

**为什么要修改为国内镜像源**?
- 默认使用 `registry.k8s.io/pause:3.10`
- 国内访问 registry.k8s.io 可能较慢或不稳定
- 使用阿里云镜像加速下载，提高集群初始化速度

### 4.3 应用配置并验证

```bash
# 重启containerd服务使配置生效
systemctl restart containerd

# 验证containerd服务状态
systemctl status containerd

# 验证配置文件中的关键设置
grep -E "SystemdCgroup|sandbox_image" /etc/containerd/config.toml
# 期望输出：
# SystemdCgroup = true
# sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.10"
```

## 5. 安装 Kubernetes 组件

安装 Kubernetes 的三个核心组件：`kubeadm`、`kubelet` 和 `kubectl`。

### 5.1 添加 Kubernetes APT 仓库

```bash
# 创建APT密钥目录
mkdir -p /etc/apt/keyrings

# 添加Kubernetes官方GPG密钥（v1.33）
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# 添加Kubernetes APT仓库（官方 pkgs.k8s.io）
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

# 更新软件包索引
apt update
```

### 5.2 安装 Kubernetes 组件

```bash
# 安装Kubernetes核心组件
apt install kubeadm kubelet kubectl

# 锁定版本，防止意外升级
apt-mark hold kubeadm kubelet kubectl
```

### 5.3 组件说明

| 组件 | 功能 | 用途 |
|------|------|------|
| **kubeadm** | 集群初始化工具 | 用于初始化和管理集群 |
| **kubelet** | 节点代理 | 在每个节点上运行，管理Pod生命周期 |
| **kubectl** | 命令行工具 | 与集群交互的客户端工具 |

### 5.4 预拉取镜像

```bash
# 预拉取Kubernetes所需镜像（使用阿里云镜像源）
kubeadm config images pull --image-repository registry.aliyuncs.com/google_containers
```

**说明**: 预拉取镜像可以加快集群初始化速度，避免在实际初始化时等待镜像下载。

### 5.5 验证安装

```bash
# 验证kubeadm版本
kubeadm version
# 期望：输出kubeadm版本信息，如 kubeadm version: &version.Info{... Version:"v1.33.x"}

# 验证kubelet服务状态
systemctl is-active kubelet
systemctl is-enabled kubelet

# 验证kubectl
kubectl version --client
# 期望：输出kubectl客户端版本信息
```

## 6. 主节点高可用架构

### 6.1 高可用架构概述

在多主节点的 Kubernetes 集群中，主节点高可用是确保集群稳定运行的关键。由于 Kubernetes 集群对外暴露的 API Server 地址只有一个，当存在多个主节点时，需要通过虚拟 IP（VIP）技术实现负载均衡和故障转移。

#### 高可用架构组件

- **Keepalived**: VRRP协议实现，负责虚拟IP的抢占和故障转移
- **HAProxy**: 高性能负载均衡器，负责将流量分发到多个主节点的API Server
- **虚拟IP（VIP）**: 集群对外提供的统一访问入口

#### 架构设计原理

```
客户端请求
    ↓
   VIP (192.168.100.7)
    ↓
  Keepalived (故障检测)
    ↓
  HAProxy (负载均衡)
    ↓
┌─────────────────────────────────┐
│  Master节点1 (k8s-m1:6443)    │
│  Master节点2 (k8s-m2:6443)    │
│  Master节点3 (k8s-m3:6443)    │
└─────────────────────────────────┘
```

### 6.2 网络规划

除了现有的节点IP外，我们需要为高可用架构分配一个虚拟IP：

| 组件 | IP地址 | 端口 | 说明 |
|------|--------|------|------|
| k8s-m1 | 192.168.100.10 | 6443 | Master节点1 API Server |
| k8s-m2 | 192.168.100.11 | 6443 | Master节点2 API Server |
| k8s-m3 | 192.168.100.12 | 6443 | Master节点3 API Server |
| **VIP** | **192.168.100.7** | 8443 | 集群统一访问入口 |

> 💡 **注意**: VIP (192.168.100.7) 是一个虚拟IP，不实际分配给任何物理网卡，由Keepalived管理。

### 6.3 安装和配置 Keepalived

#### 6.3.1 在所有主节点上安装 Keepalived

```bash
# 在 k8s-m1、k8s-m2、k8s-m3 上执行
apt update
apt install -y keepalived

# 设置开机自启动
systemctl start keepalived
systemctl enable --now keepalived
```

#### 6.3.2 配置 Keepalived

**主节点（k8s-m1）配置**:
```bash
# 创建 Keepalived 配置文件
cat > /etc/keepalived/keepalived.conf << 'EOF'
! Configuration File for keepalived
global_defs {
   router_id k8s-m1                    # 路由器标识，需要唯一
   script_user root                    # 执行脚本的用户
   enable_script_security              # 启用脚本安全检查
}

vrrp_script chk_haproxy {
   script "/usr/local/bin/check_haproxy.sh"  # 检查HAProxy状态的脚本
   interval 2                             # 检查间隔（秒）
   weight -20                            # 检查失败时权重减少
   fall 3                                # 连续失败3次才认为失败
   rise 2                                # 连续成功2次才认为恢复
}

vrrp_instance VI_1 {
    state MASTER                        # 初始状态：主节点
    interface ens33                     # 绑定的网络接口（根据实际网卡名称调整）
    virtual_router_id 51                # 虚拟路由ID，同一集群必须一致
    priority 110                        # 优先级（主节点更高）
    advert_int 1                        # VRRP广播间隔（秒）

    authentication {
        auth_type PASS                  # 认证类型
        auth_pass k8s@2025              # 认证密码
    }

    virtual_ipaddress {
        192.168.100.7                 # 虚拟IP地址
    }

    track_script {
        chk_haproxy                     # 跟踪HAProxy健康状态
    }

    # 状态切换时的通知脚本
    notify_master "/usr/local/bin/notify_master.sh"
    notify_backup "/usr/local/bin/notify_backup.sh"
    notify_fault "/usr/local/bin/notify_fault.sh"
}
EOF
```

**备节点（k8s-m2）配置**:
```bash
# 创建 Keepalived 配置文件
cat > /etc/keepalived/keepalived.conf << 'EOF'
! Configuration File for keepalived
global_defs {
   router_id k8s-m2
   script_user root
   enable_script_security
}

vrrp_script chk_haproxy {
   script "/usr/local/bin/check_haproxy.sh"
   interval 2
   weight -20
   fall 3
   rise 2
}

vrrp_instance VI_1 {
    state BACKUP                       # 初始状态：备节点
    interface ens33
    virtual_router_id 51
    priority 100                        # 优先级（备节点较低）
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass k8s@2025
    }

    virtual_ipaddress {
        192.168.100.7
    }

    track_script {
        chk_haproxy
    }

    notify_master "/usr/local/bin/notify_master.sh"
    notify_backup "/usr/local/bin/notify_backup.sh"
    notify_fault "/usr/local/bin/notify_fault.sh"
}
EOF
```

**备节点（k8s-m3）配置（与 k8s-m2 基本一致）**:
```bash
# 仅列出与 k8s-m2 不同的关键项
router_id k8s-m3
priority 90
```

#### 6.3.3 创建健康检查和通知脚本

**HAProxy健康检查脚本**:
```bash
# 在所有主节点上创建健康检查脚本
cat > /usr/local/bin/check_haproxy.sh << 'EOF'
#!/bin/bash

# 检查HAProxy进程是否存在
if ! pgrep haproxy > /dev/null; then
    echo "HAProxy process not found"
    exit 1
fi

# 检查HAProxy是否在监听端口
if ! ss -lntp | grep -q ":8443"; then
    echo "HAProxy not listening on port 8443"
    exit 1
fi

# 通过HAProxy管理接口检查后端服务器状态
curl -s -f http://127.0.0.1:8404/stats > /dev/null
if [ $? -ne 0 ]; then
    echo "HAProxy stats interface not accessible"
    exit 1
fi

echo "HAProxy is healthy"
exit 0
EOF

chmod +x /usr/local/bin/check_haproxy.sh
```

**状态通知脚本**:
```bash
# 状态切换通知脚本
cat > /usr/local/bin/notify_master.sh << 'EOF'
#!/bin/bash
echo "$(date): Node became MASTER" >> /var/log/keepalived/notify.log
# 可以添加邮件、短信等通知逻辑
EOF

cat > /usr/local/bin/notify_backup.sh << 'EOF'
#!/bin/bash
echo "$(date): Node became BACKUP" >> /var/log/keepalived/notify.log
EOF

cat > /usr/local/bin/notify_fault.sh << 'EOF'
#!/bin/bash
echo "$(date): Node entered FAULT state" >> /var/log/keepalived/notify.log
EOF

chmod +x /usr/local/bin/notify_*.sh

# 创建日志目录
mkdir -p /var/log/keepalived
```

### 6.4 安装和配置 HAProxy

#### 6.4.1 安装 HAProxy

```bash
# 在所有主节点上安装 HAProxy
apt update
apt install -y haproxy

# 设置开机自启动
systemctl enable --now haproxy
```

#### 6.4.2 配置 HAProxy

```bash
# 备份原始配置
cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak

# 创建 Kubernetes API Server 负载均衡配置
cat > /etc/haproxy/haproxy.cfg << 'EOF'
global
    log /dev/log    local0
    log /dev/log    local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend k8s_api_frontend
    bind *:8443
    mode tcp
    default_backend k8s_api_backend

backend k8s_api_backend
    mode tcp
    balance roundrobin
    option tcp-check
    server k8s-m1 192.168.100.10:6443 check
    server k8s-m2 192.168.100.11:6443 check
    server k8s-m3 192.168.100.12:6443 check

listen stats
    bind 127.0.0.1:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 30s
    # 如需开启管理操作，请配合内网ACL和认证
EOF
```

#### 6.4.3 验证 HAProxy 配置

```bash
# 检查配置文件语法
haproxy -f /etc/haproxy/haproxy.cfg -c
# 没有任何输出代表正确

# 重启 HAProxy 服务
systemctl restart haproxy

# 检查服务状态
systemctl status haproxy

# 检查监听端口
ss -lntp | grep haproxy
```

## 7. 集群初始化

### 7.1 主节点初始化（k8s-m1）

使用高可用架构进行集群初始化：

:::warning
初始化前需要确保keepalived haproxy两个服务都是启动成功的
systemctl is-active keepalived haproxy
:::

```bash
# 在第一个主节点（k8s-m1）上执行，使用VIP作为API Server地址
 kubeadm init \
    --apiserver-advertise-address=192.168.100.10 \
    --apiserver-bind-port=6443 \
    --control-plane-endpoint=192.168.100.7:8443 \
    --image-repository registry.aliyuncs.com/google_containers \
    --kubernetes-version=v1.33.0 \
    --service-cidr=10.96.0.0/12 \
    --pod-network-cidr=10.244.0.0/16
```

:::tip 参数说明
- **apiserver-advertise-address**: API Server服务的绑定地址，使用当前主节点的物理IP（如192.168.100.10）
- **apiserver-bind-port**: API Server监听的端口，使用标准端口6443
- **control-plane-endpoint**: Kubernetes集群对外的统一访问地址，使用VIP:8443（如192.168.100.7:8443）
:::


### 7.2 配置 kubectl

初始化成功后，按照提示配置 kubectl：

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

:::tip 提示
这个 kubectl 是在机器上用命令行方式操作 k8s 集群，用可视化管理工具也是可以的，例如 Rancher。
:::

### 7.3 启动高可用服务

#### 7.3.1 启动服务顺序

```bash
# 1. 首先启动 HAProxy
systemctl restart haproxy

# 2. 然后启动 Keepalived
systemctl restart keepalived

# 3. 检查服务状态
systemctl status haproxy keepalived
```

#### 7.3.2 验证 VIP 分配

```bash
# 在主节点（k8s-m1）上应该能看到VIP
ip addr show | grep 192.168.100.7

# 在其他备节点（k8s-m2 或 k8s-m3）上不应该看到VIP
ip addr show | grep 192.168.100.7
```

### 7.4 安装网络插件（CNI）

选择一个 CNI 插件，这里以 Calico 为例：

```bash
# 应用 Calico 网络插件（请按官方文档选择与当前版本匹配的清单）
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.30.2/manifests/calico.yaml
```

### 7.5 添加其他节点

**添加其他主节点**:
在初始化的主节点(k8s-m1)上需要执行下面的命令，用于k8s其他的主节点在加入集群时，传递相同的CA证书
```bash
kubeadm init phase upload-certs --upload-certs

# 输出了例如下面的字符串
root@k8s-m1:~# kubeadm init phase upload-certs --upload-certs
I1213 04:56:49.562209    8267 version.go:261] remote version is much newer: v1.34.3; falling back to: stable-1.33
W1213 04:56:49.586253    8267 version.go:109] could not fetch a Kubernetes version from the internet: unable to get URL "https://dl.k8s.io/release/stable-1.33.txt": Get "https://dl.k8s.io/release/stable-1.33.txt": dial tcp [2600:1901:0:26f3::]:443: connect: network is unreachable
W1213 04:56:49.586292    8267 version.go:110] falling back to the local client version: v1.33.6
[upload-certs] Storing the certificates in Secret "kubeadm-certs" in the "kube-system" Namespace
[upload-certs] Using certificate key:
025e086454b81bdb31eb7062590f90ad4a6d18df75b883278ec59c5c3b4cc963

# 最后一行就是--certificate-key 值，需要在主节点的命令中加上
```
在其他主节点（k8s-m2、k8s-m3）上需要，使用第一个主节点初始化时生成的 join 命令，并额外添加 `--control-plane` 表示加入控制平面：
  ```bash
  kubeadm join 192.168.100.7:8443 \
    --token <token> \
    --discovery-token-ca-cert-hash <hash> \
    --control-plane \
    --certificate-key 025e086454b8xxxx
  ```

**添加工作节点**:
在工作节点上直接执行join命令（无需安装高可用组件）：
```bash
kubeadm join 192.168.100.7:8443 --token <token> --discovery-token-ca-cert-hash <hash>
```

> 💡 **注意**: 工作节点只需要安装kubelet、kubeadm、kubectl，无需安装Keepalived和HAProxy

### 7.6 验证集群状态

```bash
# 查看节点状态
kubectl get nodes

# 查看Pod状态
kubectl get pods --all-namespaces

# 查看集群信息
kubectl cluster-info

# 测试通过VIP访问API Server
curl -k https://192.168.100.7:8443/version
```

## 8. 高可用维护和监控

### 8.1 故障转移测试

#### 8.1.1 模拟主节点故障

```bash
# 在主节点（k8s-m1）上停止HAProxy
systemctl stop haproxy

# 观察VIP是否转移到其他主节点
# 在k8s-m2或k8s-m3上检查：ip addr show | grep 192.168.100.7
```

#### 8.1.2 恢复主节点

```bash
# 在k8s-m1上重启服务
systemctl start haproxy
systemctl restart keepalived

# VIP应该根据优先级重新分配
```

### 8.2 监控和日志

#### 8.2.1 关键日志位置

```bash
# Keepalived日志
tail -f /var/log/syslog | grep keepalived
tail -f /var/log/keepalived/notify.log

# HAProxy日志
tail -f /var/log/haproxy.log

# 系统服务日志
journalctl -u keepalived -f
journalctl -u haproxy -f
```

#### 8.2.2 健康检查脚本

```bash
# 创建集群健康状态检查脚本
cat > /usr/local/bin/check_ha_cluster.sh << 'EOF'
#!/bin/bash

echo "=== Kubernetes HA Cluster Health Check ==="
echo "Timestamp: $(date)"

# 检查VIP状态
echo -e "\n1. VIP Status:"
VIP_FOUND=$(ip addr show | grep -c "192.168.100.7")
if [ $VIP_FOUND -eq 1 ]; then
    echo "✅ VIP is present on this node"
else
    echo "❌ VIP is not present on this node"
fi

# 检查Keepalived状态
echo -e "\n2. Keepalived Status:"
systemctl is-active keepalived && echo "✅ Keepalived is running" || echo "❌ Keepalived is not running"

# 检查HAProxy状态
echo -e "\n3. HAProxy Status:"
systemctl is-active haproxy && echo "✅ HAProxy is running" || echo "❌ HAProxy is not running"

# 检查后端API Server状态
echo -e "\n4. Backend API Servers:"
echo "k8s-m1 API Server:"
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.100.10:6443/healthz 2>/dev/null || echo "❌ Failed"
echo "k8s-m2 API Server:"
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.100.11:6443/healthz 2>/dev/null || echo "❌ Failed"
echo "k8s-m3 API Server:"
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.100.12:6443/healthz 2>/dev/null || echo "❌ Failed"

# 检查通过VIP的访问
echo -e "\n5. VIP Access Test:"
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.100.7:8443/healthz 2>/dev/null || echo "❌ Failed"

echo -e "\n=== Health Check Completed ==="
EOF

chmod +x /usr/local/bin/check_ha_cluster.sh
```

### 8.3 扩展主节点

当需要添加更多主节点时：

1. **新节点安装相同组件**: Keepalived + HAProxy
2. **调整配置**:
   - Keepalived配置中设置适当的优先级
   - HAProxy配置中添加新的后端服务器
3. **更新所有主节点的HAProxy配置**，添加新的主节点
4. **重启相关服务**使配置生效

> ⚠️ **重要提示**: 每次添加新主节点时，需要更新所有现有主节点的HAProxy配置文件，将新的主节点添加到后端服务器列表中。

### 8.4 常见问题排查

#### 问题1: VIP无法绑定
- 检查网卡名称是否正确
- 确认IP地址没有冲突
- 检查防火墙规则

#### 问题2: HAProxy健康检查失败
- 检查API Server端口是否正常监听
- 验证健康检查脚本的权限和路径
- 查看HAProxy日志获取详细错误信息

#### 问题3: 故障转移不生效
- 确认Keepalived配置中的优先级设置
- 检查VRRP认证密码是否一致
- 验证网络连通性

---

## 📋 总结

完成以上所有步骤后，您将拥有一个功能完整且高可用的 Kubernetes 1.33 集群。主要配置包括：

✅ **系统准备** - Debian 13 最小化安装和网络规划
✅ **网络配置** - 静态IP和主机名解析
✅ **系统初始化** - 关闭Swap、加载内核模块、配置内核参数
✅ **容器运行时** - Containerd 配置（cgroup驱动和pause镜像优化）
✅ **Kubernetes组件** - kubeadm、kubelet、kubectl 安装
✅ **高可用架构** - Keepalived + HAProxy 实现主节点高可用
✅ **集群部署** - 使用VIP初始化高可用集群、添加工作节点
✅ **监控维护** - 健康检查、故障转移、扩展方案

### 🔧 关键特性

- **高可用性**: 通过Keepalived + HAProxy实现API Server的高可用
- **自动故障转移**: 主节点故障时，VIP自动切换到备用节点
- **负载均衡**: HAProxy将请求分发到多个健康的主节点
- **易于扩展**: 支持动态添加新的主节点和工作节点
- **完整监控**: 提供健康检查脚本和日志监控方案

您的Kubernetes集群现在已经准备好运行生产环境的容器化应用了！

### 📚 相关参考

- [Keepalived官方文档](https://keepalived.org/doc/)
- [HAProxy官方文档](http://www.haproxy.org/doc/)
- [Kubernetes高可用官方文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)

