# Jenkins

本文提供 Jenkins CI/CD 服务器的配置示例与配置原因说明。

## 1. 目录与挂载约定

```text
/app/jenkins/
├─ docker-compose.yml
└─ data/
```

说明：

- `data`：Jenkins 主目录，包含配置、任务、插件等所有数据

### 目录权限

`jenkins/jenkins:lts-jdk21` 镜像在容器内以 **UID 1000** 的 `jenkins` 用户运行（非 root）。挂载 `./data:/var/jenkins_home` 后，宿主机 `data/` 目录必须归属 UID 1000，否则容器内 jenkins 用户无写权限，启动时会报：

```
INSTALL WARNING: User: missing rw permissions on JENKINS_HOME: /var/jenkins_home
Can not write to /var/jenkins_home/copy_reference_file.log. Wrong volume permissions?
```

首次启动前，在宿主机执行：

```bash
sudo chown -R 1000:1000 /app/jenkins/data
```

## 2. Compose 配置示例

`/app/jenkins/docker-compose.yml`：

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk21
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "31000:8080"
      - "50000:50000"
    volumes:
      - ./data:/var/jenkins_home
```

配置原因：

- 使用 `lts-jdk21` 镜像，容器内已预装 JDK 21，无需额外安装
- 端口 `31000:8080` 避免与宿主机其他服务冲突
- 端口 `50000:50000` 用于 Jenkins agent 连接

## 3. 常用命令

```bash
# 启动 Jenkins
cd /app/jenkins && docker compose up -d

# 关闭 Jenkins
cd /app/jenkins && docker compose down

# 查看容器日志
docker logs -f jenkins
```

## 4. 初始化配置

### 获取初始密码

第一次访问时，需要从容器内获取初始化密码。由于已经挂载了目录，可以直接在宿主机上查看：

```bash
cat /app/jenkins/data/secrets/initialAdminPassword
```

### 访问服务

服务启动后，访问 http://localhost:31000 进行初始化配置。

### 安装插件

初始化时直接选择社区推荐的插件安装即可，后续可根据需求增减插件。
