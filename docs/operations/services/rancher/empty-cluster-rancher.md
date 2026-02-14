# 空白集群基础配置与 Rancher 部署指南（国内网络优先）

本文面向“刚建好的空白 Kubernetes 集群”，按可落地顺序完成 Rancher 部署。

## 1. 目标与架构

目标：在空白集群上部署一套可访问的 Rancher 控制台。

推荐组件：

- CNI：Calico（或你现有 CNI）
- Ingress：ingress-nginx
- 证书：cert-manager
- Rancher：rancher-stable chart

## 2. 空白集群基础检查

## 2.1 集群可用性

```bash
kubectl get nodes -o wide
kubectl get pods -A
```

至少要满足：

- 节点状态为 `Ready`
- `kube-system` 关键组件正常

## 2.2 CNI 网络就绪

```bash
kubectl get pods -n kube-system
```

如果还没装 CNI，可参考：`operations/basics/install-k8s/index`

## 2.3 默认 StorageClass

```bash
kubectl get sc
```

建议有一个默认 `StorageClass`（虽然 Rancher 主体不强依赖 PVC，但后续管理集群常会用到）。

本指南不再使用 `local-path`。空白集群请优先准备 NFS 共享存储（nfsd），并基于 NFS 提供默认存储类。

NFS Server（nfsd）安装与配置请先完成：`operations/services/nfs-server/index`

完成后，确认集群内有默认 `StorageClass`：

```bash
kubectl get sc
```

输出中带 `(default)` 的即为默认存储类。

## 2.4 对接 NFS（NFS CSI）

以下示例使用 `nfs-subdir-external-provisioner` 对接 NFS。

### 2.4.1 节点安装 NFS 客户端（所有 Node）

```bash
sudo apt update
sudo apt install -y nfs-common
```

### 2.4.2 安装 NFS CSI Provisioner

```bash
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
helm repo update

helm upgrade --install nfs-client nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  -n nfs-provisioner \
  --create-namespace \
  --set nfs.server=192.168.100.20 \
  --set nfs.path=/data/k8s \
  --set storageClass.name=nfs-client \
  --set storageClass.defaultClass=true \
  --set storageClass.reclaimPolicy=Retain
```

### 2.4.3 验证默认 StorageClass

```bash
kubectl get sc
kubectl get pods -n nfs-provisioner
```

### 2.4.4 创建 PVC 验证读写

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-rwx-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
  storageClassName: nfs-client
```

```bash
kubectl apply -f nfs-rwx-pvc.yaml
kubectl get pvc nfs-rwx-pvc
```

若状态为 `Bound`，说明 NFS 对接成功。

## 2.5 域名与入口

- 准备域名：`rancher.cludix.com`
- DNS 解析到 Ingress 暴露地址（LB/VIP）

## 3. 安装 Ingress 控制器

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --create-namespace
```

验证：

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

## 4. 安装 cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm upgrade --install cert-manager jetstack/cert-manager \
  -n cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

验证：

```bash
kubectl get pods -n cert-manager
```

## 5. 安装 Rancher

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

helm upgrade --install rancher rancher-stable/rancher \
  -n cattle-system \
  --create-namespace \
  --set hostname=rancher.cludix.com \
  --set bootstrapPassword=Admin@12345 \
  --set replicas=1
```

等待就绪：

```bash
kubectl -n cattle-system rollout status deploy/rancher
kubectl get pods -n cattle-system
```

## 6. 国内网络优先配置

如果节点拉取公网镜像失败，建议直接接入内网 Harbor：

```bash
helm upgrade --install rancher rancher-stable/rancher \
  -n cattle-system \
  --create-namespace \
  --set hostname=rancher.cludix.com \
  --set bootstrapPassword=Admin@12345 \
  --set systemDefaultRegistry=harbor.intra.local \
  --set replicas=1
```

建议同时做两件事：

1. 节点运行时（Docker/containerd）配置镜像加速器或内网镜像仓库
2. 业务镜像统一同步到 Harbor，再通过 `systemDefaultRegistry` 管控拉取来源

## 7. 入口高可用方案说明（Keepalived/HAProxy 与 MetalLB）

本套文档中两类高可用组件是分工关系：

- `keepalived + haproxy`：用于 **Kubernetes API Server** 高可用入口（控制平面）
- `MetalLB`：用于 **业务 Service(type=LoadBalancer)** 分配对外 VIP（业务流量）

建议做法：

1. 控制平面继续使用现有 API VIP（例如 `192.168.100.7`）
2. 业务侧为 MetalLB 预留独立地址池（例如 `192.168.100.240-192.168.100.250`）
3. `ingress-nginx-controller` 使用 `LoadBalancer`，由 MetalLB 分配 EXTERNAL-IP
4. 将 `rancher.cludix.com` 解析到该 EXTERNAL-IP

注意事项：

- MetalLB 地址池不能与节点 IP、Keepalived VIP、DHCP 地址池冲突
- 这是裸机场景常见做法；若在公有云，可直接用云厂商 LoadBalancer

### 7.1 安装 MetalLB

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
kubectl get pods -n metallb-system
```

### 7.2 配置地址池与广播（L2 模式）

请先确认地址池未被占用。以下示例使用 `192.168.100.240-192.168.100.250`：

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.100.240-192.168.100.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2
  namespace: metallb-system
spec: {}
```

```bash
kubectl apply -f metallb-pool.yaml
kubectl get ipaddresspool -n metallb-system
kubectl get l2advertisement -n metallb-system
```

### 7.3 与 ingress-nginx 对接验证

```bash
kubectl get svc -n ingress-nginx
kubectl get ingress -n cattle-system
```

期望结果：

- `ingress-nginx-controller` 的 `EXTERNAL-IP` 不再是 `<pending>`
- `rancher` ingress 能通过 nginx 对外提供访问

最终将 DNS 解析到该 `EXTERNAL-IP`：

- `rancher.cludix.com -> ingress-nginx-controller EXTERNAL-IP`

## 8. 首次登录与验收

访问地址：`https://rancher.cludix.com`

若未设置 `bootstrapPassword`，获取初始化密码：

```bash
kubectl get secret --namespace cattle-system bootstrap-secret \
  -o go-template='{{.data.bootstrapPassword|base64decode}}{{"\n"}}'
```

验收清单：

- 浏览器可打开 Rancher 登录页
- `cattle-system` 下 Rancher Pod 全部 `Running`
- Ingress 与证书状态正常

## 9. 常见问题（含本次部署踩坑）

## 9.1 Rancher Pod Pending

```bash
kubectl describe pod -n cattle-system POD_NAME
kubectl describe node
kubectl get sc
```

## 9.2 证书不生效或页面打不开

```bash
kubectl get pods -n cert-manager
kubectl get ingress -n cattle-system
kubectl describe ingress -n cattle-system
```

## 9.3 镜像拉取失败

```bash
kubectl describe pod -n cattle-system POD_NAME
kubectl get events -A --sort-by=.metadata.creationTimestamp
```

重点检查：

- 节点到镜像仓库网络连通性
- `systemDefaultRegistry` 是否正确
- Harbor 中镜像与 tag 是否完整

## 9.4 Ingress 没有地址（`EXTERNAL-IP <pending>`）

症状：

- `kubectl get svc -n ingress-nginx` 中 `ingress-nginx-controller` 为 `LoadBalancer` 但 `EXTERNAL-IP` 一直是 `<pending>`

原因：

- 集群中没有可用的 LB 控制器（裸机未安装 MetalLB）

处理：

1. 安装 MetalLB 并配置地址池
2. 或临时使用 NodePort 验证访问

## 9.5 Ingress `CLASS <none>` 或未被 nginx 接管

症状：

- `kubectl get ingress -n cattle-system` 显示 `CLASS <none>`

处理：

```bash
kubectl patch ingress rancher -n cattle-system --type=merge \
  -p '{"spec":{"ingressClassName":"nginx"}}'
```

## 9.6 Rancher 初始阶段 `Startup probe failed`

症状：

- 事件里出现 `connect: connection refused`

说明：

- 这是启动早期常见现象，若随后 Pod `Ready=True`，可视为恢复正常

## 9.7 NFS Provisioner 报 `mount ... fsconfig() failed`

症状：

- `MountVolume.SetUp failed ... NFS: mount program didn't pass remote address`

排查要点：

```bash
showmount -e NFS_SERVER_IP
kubectl get pod -n nfs-provisioner -o wide
```

说明：

- 重点检查 NFS 导出、节点 `nfs-common`、NFS 版本兼容（建议优先 `nfsvers=4.1`）

## 9.8 Calico 报 `failed to find plugin "calico" in path [/usr/lib/cni]`

原因：

- 节点 CNI 插件目录不一致（`/opt/cni/bin` 与 `/usr/lib/cni`）

处理：

- 统一 containerd CNI `bin_dir=/opt/cni/bin`
- 必要时补 `/usr/lib/cni` 兼容软链接
- 该修复必须在所有节点执行

## 9.9 containerd 配了镜像但不生效

原因：

- `config.toml` 中可能有多个 `config_path`，但只认 `[plugins."io.containerd.grpc.v1.cri".registry]` 下的 `config_path`

处理：

- 确保其值为 `/etc/containerd/certs.d`
- 重启 `containerd` 与 `kubelet`
- 在报错节点用 `crictl pull` 实测拉取
