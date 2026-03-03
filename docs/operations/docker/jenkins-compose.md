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

权限要求（强制）：

- 必须先按 [Docker 部署规范](./) 完成 `/app` 权限初始化
- 执行 `getent group appgroup | cut -d: -f3` 获取 GID，再写入 `group_add`

## 2. Compose 配置示例

`/app/docker-compose.jenkins.yml`：

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk21
    container_name: jenkins
    restart: unless-stopped
    group_add:
      - "<APPGROUP_GID>"
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
- `user: 1000:1000` 指定容器以 jenkins 用户（UID 1000）运行，避免权限问题
- 端口 `31000:8080` 避免与宿主机其他服务冲突
- 端口 `50000:50000` 用于 Jenkins agent 连接
- 通过 `group_add` 复用宿主机组权限，减少重复 `chown` 操作
- 使用外部网络 `app-net`，便于与其他 compose 中的应用直接互通

## 3. 常用命令

```bash
# 启动 Jenkins
docker compose -f /app/docker-compose.jenkins.yml up -d

# 关闭 Jenkins
docker compose -f /app/docker-compose.jenkins.yml down

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

## 5. 故障排查：权限报错

当启动时报错：

`Permission denied` 或 `Can't write to /var/jenkins_home`

这是因为容器内的用户与宿主机目录的所有者不匹配。

### 修改目录所有者为容器用户

```bash
# Jenkins 容器默认使用 UID 1000
sudo chown -R 1000:1000 /app/jenkins/data

# 重启容器
docker compose -f /app/docker-compose.jenkins.yml restart
```