---
slug: /operations/jenkins-compose
title: Jenkins Docker Compose 配置
---

# Jenkins

本文提供 Jenkins CI/CD 服务器的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.jenkins.yml
└─ jenkins/
   └─ data/
```

说明：

- `data`：Jenkins 主目录，包含配置、任务、插件等所有数据

## 2. 目录权限设置

Jenkins 官方镜像容器内使用 `jenkins` 用户，UID 和 GID 均为 `1000`。需在启动前设置目录权限：

```bash
# 创建目录
mkdir -p /app/jenkins/data

# 设置目录所有者为容器内 jenkins 用户
sudo chown -R 1000:1000 /app/jenkins
```

## 3. Compose 配置示例

`/app/docker-compose.jenkins.yml`：

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk21
    container_name: jenkins
    restart: unless-stopped
    user: 1000:1000
    ports:
      - "31000:8080"
      - "50000:50000"
    volumes:
      - /app/jenkins/data:/var/jenkins_home
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 使用 `lts-jdk21` 镜像，容器内已预装 JDK 21，无需额外安装
- `user: 1000:1000` 指定容器以 jenkins 用户（UID 1000）运行
- 端口 `31000:8080` 避免与宿主机其他服务冲突
- 端口 `50000:50000` 用于 Jenkins agent 连接
- 使用外部网络 `app-net`，便于与其他 compose 中的应用直接互通

## 4. 常用命令

```bash
# 启动 Jenkins
docker compose -f /app/docker-compose.jenkins.yml up -d

# 关闭 Jenkins
docker compose -f /app/docker-compose.jenkins.yml down

# 查看容器日志
docker logs -f jenkins
```

## 5. 初始化配置

### 获取初始密码

第一次访问时，需要从容器内获取初始化密码。由于已经挂载了目录，可以直接在宿主机上查看：

```bash
cat /app/jenkins/data/secrets/initialAdminPassword
```

### 访问服务

服务启动后，访问 http://localhost:31000 进行初始化配置。

### 安装插件

初始化时直接选择社区推荐的插件安装即可，后续可根据需求增减插件。