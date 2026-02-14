# Helm 安装、配置与基础使用（国内网络优先）

本文只聚焦 Helm 本身，不包含具体业务应用部署。

Rancher 空白集群部署请看：`operations/k8s/rancher/empty-cluster-rancher`

## 1. 安装 Helm

### 1.1 前置条件

- 可联网主机（或已准备离线安装包）
- 具备 `sudo` 权限
- 若需操作集群，需已安装 `kubectl`

### 1.2 脚本安装

```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

### 1.3 二进制安装

```bash
curl -LO https://get.helm.sh/helm-v3.18.6-linux-amd64.tar.gz
tar -zxvf helm-v3.18.6-linux-amd64.tar.gz
sudo mv linux-amd64/helm /usr/local/bin/helm
helm version
```

版本发布页：[Helm Releases](https://github.com/helm/helm/releases)

## 2. 基础配置（国内网络优先）

### 2.1 使用 HTTP Chart 仓库

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm repo list
```

### 2.2 常见网络报错说明

如果出现：

- `failed to perform FetchReference`
- `registry-1.docker.io ... connection reset by peer`

说明当前节点访问 OCI 源不稳定，优先换 HTTP 仓库，或在内网场景使用离线 chart 包。

## 3. Helm 基础使用

### 3.1 搜索与查看

```bash
helm search repo ingress-nginx
helm show chart ingress-nginx/ingress-nginx
helm show values ingress-nginx/ingress-nginx
```

### 3.2 安装、升级、回滚、卸载

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
helm upgrade ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --set controller.replicaCount=2
helm history ingress-nginx -n ingress-nginx
helm rollback ingress-nginx 1 -n ingress-nginx
helm uninstall ingress-nginx -n ingress-nginx
```

### 3.3 排障命令

```bash
helm list -A
helm get values ingress-nginx -n ingress-nginx
helm get manifest ingress-nginx -n ingress-nginx
helm template ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx
```

## 4. 内网/离线环境下如何使用 Helm

关键点：**Chart 包不包含镜像层**，Chart 与镜像需要分别处理。

### 4.1 外网机器下载 Chart

```bash
helm pull rancher-stable/rancher --version 2.11.3
helm show values rancher-stable/rancher > values-rancher.yaml
```

将 `rancher-2.11.3.tgz` 和 `values-rancher.yaml` 传入内网。

### 4.2 外网机器提取镜像列表

```bash
helm template rancher rancher-stable/rancher -n cattle-system \
  --set hostname=rancher.cludix.com \
  | grep 'image:' | awk '{print $2}' | sort -u > images.txt
```

### 4.3 内网安装方式

方式 A（推荐，直接使用本地 chart 包）：

```bash
helm upgrade --install rancher ./rancher-2.11.3.tgz \
  -n cattle-system \
  --create-namespace \
  -f values-rancher.yaml
```

方式 B（内网 OCI 仓库）：

```bash
helm registry login harbor.intra.local
helm push rancher-2.11.3.tgz oci://harbor.intra.local/helm
helm upgrade --install rancher oci://harbor.intra.local/helm/rancher -n cattle-system --create-namespace
```
