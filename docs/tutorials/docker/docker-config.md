---
title: Docker 配置
tags: [docker, config]
---
# Docker 配置

本文介绍 Docker 的镜像源配置和自建 HTTP 仓库源配置。

## 1. 配置镜像加速源

由于 Docker Hub 等海外仓库在国内访问受限，需要配置镜像加速源。

### 1.1 创建配置目录

```bash
sudo mkdir -p /etc/docker
```

### 1.2 写入镜像源配置

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<EOF
{
  "registry-mirrors": ["https://xxxx.xuanyuan.run/"]
}
EOF
```

### 1.3 重载并重启 Docker

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 1.4 验证配置生效

```bash
sudo docker info
```

输出末尾应显示配置的镜像源。

## 2. 轩辕镜像

推荐使用轩辕镜像，支持以下容器仓库加速：

| 仓库 | 说明 |
| --- | --- |
| docker.io | Docker Hub |
| ghcr.io | GitHub Container Registry |
| gcr.io | Google Container Registry |
| quay.io | Red Hat Quay |
| registry.k8s.io | Kubernetes 官方仓库 |

### 2.1 注册账号

[轩辕镜像，点击注册](https://xuanyuan.cloud/?code=5EGSZC)

注册后充值流量，可生成专属加速域名。

### 2.2 拉取示例

**手动拉取 ghcr.io 镜像**：

```bash
# 原始地址
docker pull ghcr.io/owner/image:tag

# 使用加速
docker pull xxxx.xuanyuan.run/ghcr.io/owner/image:tag
```

## 3. 自建 HTTP 仓库源

如果需要拉取自建的无认证 HTTP 仓库（如自建的 Docker Registry），Docker 默认要求 HTTPS，直接拉取会报错：

```
Error response from daemon: Get "https://192.168.100.100:80/v2/": http: server gave HTTP response to HTTPS client
```

需要在 Docker 配置中声明 `insecure-registries`，允许 HTTP 访问。

### 3.1 配置示例

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<EOF
{
  "registry-mirrors": ["https://xxxx.xuanyuan.run/"],
  "insecure-registries": ["192.168.100.100:80"]
}
EOF
```

### 3.2 重启生效

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 3.3 拉取自建仓库镜像

```bash
docker pull 192.168.100.100:80/sirmapp/mind-backend-test:latest
```

:::warning
`insecure-registries` 仅适用于内部可信网络环境。生产环境建议为自建仓库配置 HTTPS 和认证。
:::

## 4. 完整配置示例

```json
{
  "registry-mirrors": [
    "https://xxxx.xuanyuan.run/"
  ],
  "insecure-registries": [
    "192.168.100.100:80"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
```

配置说明：

- `registry-mirrors`：镜像加速源列表
- `insecure-registries`：允许 HTTP 访问的仓库地址
- `log-driver` / `log-opts`：容器日志配置，避免日志文件无限增长

## 5. 相关文档

- [Debian 系统安装 Docker](./install-docker/)
- [Debian 13 离线安装 Docker](./Debian13离线安装Docker)