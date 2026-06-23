---
title: Docker Registry 部署
date: 2026-06-23 15:00
tags: [docker, deployment]
---

# Docker Registry

Docker Registry 是 Docker 官方提供的镜像仓库服务，适合在内网或私有环境中保存业务镜像、离线交付镜像和缓存常用基础镜像。本文提供基于 Docker Compose 的单节点部署示例，并说明如何将其配置为 Docker 客户端可使用的镜像仓库源。

> **相关文档**: 如果需要 Web 界面管理 Registry 镜像,可参考 [Docker Registry Browser 部署文档](DockerRegistryBrowser部署.md),提供镜像仓库浏览、标签查看和删除等功能。

## 1. 目录与挂载约定

```text
/app/docker-registry/
├─ docker-compose.yml
├─ config.yml
├─ htpasswd
└─ data/
```

说明：

- `config.yml`：Registry 配置文件，用于固定监听地址、存储路径和删除策略
- `htpasswd`：基础认证文件，生产环境建议开启认证，避免任意用户推送镜像
- `data`：镜像层、清单和元数据的持久化目录，容器重建后镜像不会丢失

## 2. Registry 配置示例

`/app/docker-registry/config.yml`：

```yaml
version: 0.1
log:
  fields:
    service: registry
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
```

配置原因：

- `rootdirectory` 固定为 `/var/lib/registry`，与 Compose 中的数据挂载路径保持一致
- `delete.enabled` 允许后续删除镜像清单并配合垃圾回收释放空间
- `http.addr` 使用容器内默认的 `5000` 端口，宿主机端口由 Compose 统一映射

## 3. 生成基础认证文件

如果只在完全可信的隔离内网使用，可以临时不启用认证；生产环境建议创建 `htpasswd` 文件：

```bash
docker run --rm \
  --entrypoint htpasswd \
  httpd:2.4-alpine \
  -Bbn registry_user '请替换为强密码' \
  > /app/docker-registry/htpasswd
```

说明：

- `registry_user` 是登录 Registry 的用户名，可按实际环境修改
- `-B` 使用 bcrypt 哈希密码，安全性高于传统 MD5 htpasswd
- 密码建议使用强密码，并避免直接写入 shell 历史记录

## 4. Compose 配置示例

`/app/docker-registry/docker-compose.yml`：

```yaml
services:
  docker-registry:
    image: registry:3
    container_name: docker-registry
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml:ro
      - ./htpasswd:/auth/htpasswd:ro
      - ./data:/var/lib/registry
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:5000/v2/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

配置原因：

- 使用 `registry:3`，这是当前 Docker Distribution/Registry v2 的常用镜像标签
- 暴露 `5000` 端口，符合 Registry 默认访问端口习惯
- `config.yml` 和 `htpasswd` 使用只读挂载，避免容器运行时误改关键配置
- `data` 单独持久化，确保镜像数据不会随容器删除而丢失
- 健康检查访问 `/v2/` 接口，可快速判断 Registry HTTP 服务是否可用

:::tip
如果不想启用基础认证，可删除 Compose 中的 `REGISTRY_AUTH*` 环境变量，并移除 `./htpasswd:/auth/htpasswd:ro` 挂载。但无认证模式只建议用于临时测试或受防火墙严格限制的内网环境。
:::

## 5. 启动与验证

```bash
# 启动 Docker Registry
cd /app/docker-registry && docker compose up -d

# 查看容器状态
cd /app/docker-registry && docker compose ps

# 查看容器日志
docker logs -f docker-registry

# 登录私有仓库
docker login <服务器IP>:5000
```

推送测试镜像：

```bash
docker pull alpine:3.20
docker tag alpine:3.20 <服务器IP>:5000/library/alpine:3.20
docker push <服务器IP>:5000/library/alpine:3.20

docker rmi <服务器IP>:5000/library/alpine:3.20
docker pull <服务器IP>:5000/library/alpine:3.20
```

## 6. Docker 客户端配置

如果 Registry 没有配置 HTTPS，Docker 客户端默认会拒绝以 HTTP 方式连接。测试环境可在客户端主机配置 `insecure-registries`：

`/etc/docker/daemon.json`：

```json
{
  "insecure-registries": [
    "<服务器IP>:5000"
  ]
}
```

配置完成后重启 Docker：

```bash
systemctl daemon-reload
systemctl restart docker
```

:::warning
生产环境建议通过 Nginx、Traefik 或网关统一配置 HTTPS，并使用可信证书访问 Registry。`insecure-registries` 会允许明文传输镜像和认证信息，不建议在公网或跨机房网络中使用。
:::

## 7. 可选：通过 Nginx 反向代理 HTTPS

如果已有 Nginx 统一管理证书，可以将 Registry 放在内网端口，由 Nginx 暴露 HTTPS 域名：

```nginx
server {
    listen 443 ssl;
    server_name registry.example.com;

    ssl_certificate /etc/nginx/ssl/registry.example.com.pem;
    ssl_certificate_key /etc/nginx/ssl/registry.example.com.key;

    client_max_body_size 0;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置原因：

- `client_max_body_size 0` 避免大镜像推送时被 Nginx 限制请求体大小
- 保留 `Host` 和 `X-Forwarded-*` 头，便于 Registry 和日志记录识别真实访问来源
- 客户端使用可信 HTTPS 域名后，不再需要配置 `insecure-registries`

## 8. 常用运维命令

```bash
# 启动或更新容器
cd /app/docker-registry && docker compose up -d

# 停止并删除容器
cd /app/docker-registry && docker compose down

# 重启服务
cd /app/docker-registry && docker compose restart

# 查看实时日志
docker logs -f docker-registry

# 查看仓库列表
curl -u registry_user:'请替换为强密码' http://<服务器IP>:5000/v2/_catalog
```

## 9. 镜像删除与空间回收

Registry 删除镜像通常分两步：先删除镜像 manifest，再执行垃圾回收。垃圾回收需要服务停止写入，建议在维护窗口执行。

```bash
# 进入容器执行垃圾回收
docker exec -it docker-registry registry garbage-collect /etc/docker/registry/config.yml
```

注意事项：

- 垃圾回收前应暂停镜像推送，避免并发写入导致数据不一致
- 建议先备份 `/app/docker-registry/data`
- 如果使用反向代理或 CI 推送镜像，需要提前通知使用方维护窗口

## 10. 安全建议

- 生产环境优先使用 HTTPS 域名访问，不建议长期使用明文 HTTP
- 开启基础认证，并为推送账号设置强密码
- 使用防火墙限制 `5000` 端口访问来源，避免 Registry 暴露到不可信网络
- 定期备份 `/app/docker-registry/data` 和 `/app/docker-registry/htpasswd`
- 不建议使用会漂移的镜像标签作为业务镜像发布标签，生产镜像应使用明确版本号

## 11. 参考资料

- [Docker Distribution Registry 配置文档](https://distribution.github.io/distribution/about/configuration/)
- [Docker Registry 官方镜像说明](https://hub.docker.com/_/registry)
- [Docker daemon insecure registries 配置](https://docs.docker.com/reference/cli/dockerd/#insecure-registries)
