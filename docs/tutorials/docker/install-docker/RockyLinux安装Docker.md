---
title: Rocky Linux 系统安装 Docker
date: 2026-07-27 15:00
tags: [docker, rocky, linux, installation]
---
# Rocky Linux 系统安装 Docker

本文介绍在 **Rocky Linux**（8 / 9）系统上通过 **dnf/yum 仓库**安装 Docker CE（社区版），并将用户添加到 docker 组。

> 适用系统：Rocky Linux 8、Rocky Linux 9（64 位）。
> 本文使用中科大（USTC）镜像源加速下载。

## 0. 前置说明

Rocky Linux 是 RHEL 的下游重建版本，与 RHEL/CentOS 二进制兼容。Docker CE 官方仓库使用 CentOS 路径，Rocky Linux 可直接使用。

Rocky Linux 版本与 `$releasever` 对应关系：

| 系统版本 | `$releasever` | 包管理器 | Docker 支持情况 |
| --- | --- | --- | --- |
| Rocky Linux 8 | 8 | dnf（兼容 yum） | ✅ 支持 |
| Rocky Linux 9 | 9 | dnf（兼容 yum） | ✅ 推荐 |

> 下方命令统一使用 `dnf`，`yum` 是 `dnf` 的软链接，效果一致。

## 1. 卸载旧版本

如果系统曾安装过旧版 Docker（或 `docker-engine`、`podman`、`runc`），先卸载避免冲突：

```bash
sudo dnf remove -y docker \
  docker-client \
  docker-client-latest \
  docker-common \
  docker-latest \
  docker-latest-logrotate \
  docker-logrotate \
  docker-engine \
  podman \
  runc

# 清理残留目录（可选）
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

> 卸载不会删除镜像、容器等数据。如需保留数据，跳过 `rm -rf` 步骤。

## 2. 安装依赖工具

```bash
sudo dnf install -y dnf-plugins-core device-mapper-persistent-data lvm2
```

## 3. 配置 dnf 仓库（中科大镜像）

使用 `dnf config-manager` 添加 Docker CE 官方仓库（CentOS 路径）：

```bash
sudo dnf config-manager --add-repo https://mirrors.ustc.edu.cn/docker-ce/linux/centos/docker-ce.repo
```

添加后，将仓库地址中的 `download.docker.com` 替换为中科大镜像，加速后续下载：

```bash
sudo sed -i 's|download.docker.com|mirrors.ustc.edu.cn/docker-ce|g' /etc/yum.repos.d/docker-ce.repo
```

验证仓库是否生效：

```bash
dnf list docker-ce --showduplicates | sort -r
```

输出应显示可用的 docker-ce 版本列表。

## 4. 安装 Docker

### 4.1 安装最新版（推荐）

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io \
  docker-compose-plugin docker-buildx-plugin
```

安装包说明：

| 包名 | 作用 |
| --- | --- |
| `docker-ce` | Docker 守护进程（dockerd） |
| `docker-ce-cli` | Docker 客户端命令行 |
| `containerd.io` | 容器运行时 |
| `docker-compose-plugin` | Docker Compose（CLI 插件方式） |
| `docker-buildx-plugin` | Docker Buildx 构建工具 |

### 4.2 安装指定版本

如需安装特定版本，先查询可用版本：

```bash
dnf list docker-ce --showduplicates | sort -r
```

找到目标版本后（如 `26.1.4-1.el9`），执行：

```bash
sudo dnf install -y docker-ce-<VERSION_STRING> docker-ce-cli-<VERSION_STRING> \
  containerd.io docker-compose-plugin docker-buildx-plugin
```

## 5. 启动并设置开机自启

```bash
# 启动 Docker
sudo systemctl start docker

# 设置开机自启
sudo systemctl enable docker

# 查看运行状态
sudo systemctl status docker
```

状态为 `active (running)` 即表示启动成功。

## 6. 验证安装

```bash
# 查看版本
sudo docker --version

# 运行测试容器
sudo docker run --rm hello-world
```

看到 "Hello from Docker!" 输出即表示 Docker 运行正常。

## 7. 当前用户加入 docker 组

加入 docker 组后，执行 docker 命令不再需要 `sudo`：

```bash
# 将当前用户加入 docker 组
sudo usermod -aG docker $USER

# 刷新用户组（或重新登录生效）
newgrp docker
```

验证：

```bash
docker ps
```

> 完成此步骤后如果仍提示权限不足，请注销并重新登录。

## 8. 配置镜像加速

安装完成后，建议配置国内镜像加速源。请参考 [Docker 配置](../docker-config)。

## 附：常见问题

### Q1：安装报 kernel/module 依赖错误？

确认内核版本 ≥ 3.10：

```bash
uname -r
```

如内核过低，先升级系统：

```bash
sudo dnf update -y
```

### Q2：`dnf config-manager` 命令找不到？

安装 `dnf-plugins-core`：

```bash
sudo dnf install -y dnf-plugins-core
```

### Q3：防火墙导致容器无法访问？

Rocky Linux 默认使用 `firewalld`，如遇容器端口不通，可检查：

```bash
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

### Q4：与 podman / buildah 冲突？

Rocky Linux 默认可能预装 podman。Docker 与 podman 可以共存但建议卸载 podman 以避免 socket 冲突：

```bash
sudo dnf remove -y podman buildah
```
