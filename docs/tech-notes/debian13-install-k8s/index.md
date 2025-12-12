# Debian 13 上部署 Kubernetes 1.33 集群指南

本文档详细介绍如何在 Debian 13 系统上部署 Kubernetes 1.33 集群。本教程采用 2 主 5 从的集群架构：

- **主节点**: 2C4G（2个主节点：k8s-m1、k8s-m2）
- **工作节点**: 1C4G（5个工作节点：k8s-w1 到 k8s-w5）
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
| k8s-w1 | 192.168.100.12 | Worker节点 | 1C4G |
| k8s-w2 | 192.168.100.13 | Worker节点 | 1C4G |
| k8s-w3 | 192.168.100.14 | Worker节点 | 1C4G |
| k8s-w4 | 192.168.100.15 | Worker节点 | 1C4G |
| k8s-w5 | 192.168.100.16 | Worker节点 | 1C4G |

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
192.168.100.12 k8s-w1
192.168.100.13 k8s-w2
192.168.100.14 k8s-w3
192.168.100.15 k8s-w4
192.168.100.16 k8s-w5
```

> ⚠️ **注意**: 克隆虚拟机后，需要修改每个节点的：
> 1. 静态IP地址（按规划表分配）
> 2. 对应的主机名
> 3. hosts文件保持一致

## 3. 系统初始化配置

### 3.1 关闭 Swap 分区

**说明**: Kubernetes 要求关闭 Swap 分区，因为 Swap 会影响 Pod 的性能和调度决策。

```bash
# 临时关闭所有Swap分区
swapoff -a

# 永久关闭：注释掉fstab中的swap条目
sed -i '/ swap /s/^/#/' /etc/fstab

# 验证关闭结果
swapon --show
# 期望：无任何输出（空结果）
```

### 3.2 加载内核模块

**说明**: Kubernetes 需要特定的内核模块来支持容器网络和存储。

```bash
# 创建Kubernetes内核模块配置文件
cat <<EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# 立即加载内核模块
modprobe overlay br_netfilter

# 验证模块加载状态
lsmod | grep -E 'overlay|br_netfilter'
# 期望看到类似输出：
# br_netfilter           36864  0
# bridge                389120  1 br_netfilter
# overlay               217088  0
```

### 3.3 配置内核参数

**说明**: 设置必要的内核参数以支持 Kubernetes 的网络功能。

```bash
# 创建Kubernetes内核参数配置文件
cat <<EOF | tee /etc/sysctl.d/99-k8s.conf
# 启用bridge网卡的iptables过滤
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
# 启用IP转发
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
```

## 4. 安装和配置 Containerd

Containerd 是 Kubernetes 1.33 推荐的容器运行时，替代了之前的 Docker。

### 4.1 安装 Containerd 2.1.1

```bash
# 更新软件包索引
apt update

# 添加Docker官方GPG密钥（containerd官方仓库）
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 添加Docker APT仓库（包含containerd）
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 再次更新软件包索引以获取新仓库的包
apt update

# 查看可用的containerd版本
apt-cache policy containerd.io

# 安装指定版本的containerd（2.1.1）
apt install -y containerd.io=2.1.1-1 curl gpg

# 锁定containerd版本，防止意外升级
apt-mark hold containerd.io

# 创建containerd配置目录
mkdir -p /etc/containerd

# 生成默认配置文件
containerd config default | sudo tee /etc/containerd/config.toml

# 设置containerd开机自启动
systemctl enable --now containerd
```

**版本说明**:
- 直接安装 containerd **v2.1.1** 版本
- 使用 Docker 官方仓库获取指定版本
- 通过 `apt-mark hold` 锁定版本，防止意外升级

**安装验证**:
```bash
# 验证安装的版本
containerd --version
# 期望输出：containerd github.com/containerd/containerd v2.1.1
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
- 默认使用 `k8s.gcr.io/pause:3.10`
- 国内访问 gcr.io 可能很慢或无法访问
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

### 4.4 配置验证命令

```bash
# 检查containerd版本
containerd --version
# 推荐版本：containerd github.com/containerd/containerd v2.1.1 或更高版本

# 检查containerd服务状态
systemctl is-active containerd
systemctl is-enabled containerd

# 查看containerd配置（可选）
containerd config dump

# 检查containerd客户端和服务端版本（更详细信息）
containerd version
# 期望输出包含：
# containerd github.com/containerd/containerd v2.1.x
#   commit: xxx
#   runc: version x.x.x
#   spec: 1.x.x
```

## 5. 安装 Kubernetes 组件

安装 Kubernetes 的三个核心组件：`kubeadm`、`kubelet` 和 `kubectl`。

### 5.1 添加 Kubernetes APT 仓库

```bash
# 创建APT密钥目录
mkdir -p /etc/apt/keyrings

# 添加Kubernetes官方GPG密钥（使用清华镜像）
curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/kubernetes/core:/stable:/v1.33/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# 添加Kubernetes APT仓库（使用清华镜像源）
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://mirrors.tuna.tsinghua.edu.cn/kubernetes/core:/stable:/v1.33/deb/ /" | \
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

## 6. 集群初始化

### 6.1 主节点初始化（k8s-m1）

```bash
# 在第一个主节点（k8s-m1）上执行
kubeadm init \
  --apiserver-advertise-address=192.168.100.10 \
  --image-repository registry.aliyuncs.com/google_containers \
  --kubernetes-version=v1.33.0 \
  --service-cidr=10.96.0.0/12 \
  --pod-network-cidr=10.244.0.0/16 \
  --ignore-preflight-errors=all
```

### 6.2 配置 kubectl

初始化成功后，按照提示配置 kubectl：

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 6.3 安装网络插件（CNI）

选择一个 CNI 插件，这里以 Calico 为例：

```bash
# 应用Calico网络插件
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml
```

### 6.4 添加其他节点

**其他主节点加入**:
在其他主节点上执行 `kubeadm init` 时生成的 join 命令。

**工作节点加入**:
在工作节点上执行 join 命令，格式类似：
```bash
kubeadm join 192.168.100.10:6443 --token <token> --discovery-token-ca-cert-hash <hash>
```

### 6.5 验证集群状态

```bash
# 查看节点状态
kubectl get nodes

# 查看Pod状态
kubectl get pods --all-namespaces

# 查看集群信息
kubectl cluster-info
```

---

## 📋 总结

完成以上所有步骤后，您将拥有一个功能完整的 Kubernetes 1.33 集群。主要配置包括：

✅ **系统准备** - Debian 13 最小化安装
✅ **网络配置** - 静态IP和主机名解析
✅ **系统初始化** - 关闭Swap、加载内核模块、配置内核参数
✅ **容器运行时** - Containerd 配置（cgroup驱动和pause镜像优化）
✅ **Kubernetes组件** - kubeadm、kubelet、kubectl 安装
✅ **集群部署** - 初始化主节点、添加工作节点

您的集群现在已经准备好运行容器化应用了！

