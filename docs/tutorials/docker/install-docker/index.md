---
title: Debian系统安装Docker
---
# Debian系统安装Docker

本文介绍在 Debian 系统上安装 Docker，并将用户添加到 docker 组中。

## 1. 配置 Docker 下载源

确保目录存在：

```bash
sudo mkdir -p /etc/apt/keyrings
```

下载中科大 Docker GPG 密钥并导入：

```bash
# 下载 gpg 公钥（不存在 gpg 命令时执行 sudo apt install gpg）
curl -fsSL https://mirrors.ustc.edu.cn/docker-ce/linux/debian/gpg \
| sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 将 docker 下载源添加到 apt 镜像源中
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://mirrors.ustc.edu.cn/docker-ce/linux/debian \
$(lsb_release -cs) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

## 2. 更新 apt 索引并安装

```bash
sudo apt update

sudo apt install docker-ce docker-ce-cli docker-compose-plugin docker-buildx-plugin

# 安装完成查看版本，确认安装成功
sudo docker --version
```

## 3. 用户添加至 docker 组

用户添加至 docker 组后，不再需要使用 sudo 命令：

```bash
sudo usermod -aG docker $USER

# 重新登陆生效
su - $USER
```

## 4. 配置 Docker 自启动

```bash
sudo systemctl enable docker
```

## 5. 配置镜像源和自建仓库

镜像加速源和自建 HTTP 仓库源的配置，请参考 [Docker 配置](../docker-config)。




