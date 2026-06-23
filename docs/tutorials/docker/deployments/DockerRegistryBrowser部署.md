---
title: Docker Registry Browser 部署
date: 2026-06-23 15:00
tags: [docker, deployment]
---

# Docker Registry Browser

Docker Registry Browser 是一个轻量级的 Web 界面,用于浏览和管理私有 Docker Registry 中的镜像仓库。它基于 Docker Registry HTTP API V2 实现,无需额外数据库,可直接添加到已有的 Registry 服务之上。本文提供基于 Docker Compose 的部署示例,并说明如何将其与现有 Registry 集成。

> **相关文档**: 如果您尚未部署 Docker Registry,请先参阅 [Docker Registry 部署文档](DockerRegistry部署.md)。

## 1. 功能特点

- **仓库浏览**: 展示 Registry 中所有镜像仓库列表
- **标签管理**: 显示每个仓库的标签列表、镜像大小和 Digest
- **镜像详情**: 查看镜像的详细信息,包括层(Layer)、配置(Config)和构建历史
- **标签删除**: 支持通过界面直接删除镜像标签
- **无状态设计**: 不依赖外部数据库,所有数据实时从 Registry API 获取
- **子路径部署**: 支持与 Registry 共用同一域名,以子路径方式部署

## 2. 目录与挂载约定

```text
/app/docker-registry-browser/
├─ docker-compose.yml
└─ .env
```

说明:

- `.env`: 环境变量配置文件,用于存储 Registry URL、密钥等敏感信息

## 3. 环境变量配置示例

`/app/docker-registry-browser/.env`:

```bash
# Registry 连接地址(必需)
DOCKER_REGISTRY_URL=http://<服务器IP>:5000

# Rails 密钥(必需) - 用于加密会话数据
SECRET_KEY_BASE=<使用 openssl rand -hex 64 生成>

# 如 Registry 启用了认证,需配置凭据(可选)
# 格式为 base64 编码的 username:password
# 例如: echo -n "registry_user:your_password" | base64
REGISTRY_AUTH=<base64编码的认证信息>
```

说明:

- `DOCKER_REGISTRY_URL` 是 Registry 的 API 访问地址,通常为 `http://<服务器IP>:5000`
- `SECRET_KEY_BASE` 用于 Rails 会话加密,生产环境必须使用随机生成的强密钥
- 如果 Registry 启用了基础认证,需要提供 `REGISTRY_AUTH` 环境变量

生成密钥:

```bash
openssl rand -hex 64
```

生成认证凭据:

```bash
echo -n "registry_user:your_password" | base64
```

## 4. Compose 配置示例

`/app/docker-registry-browser/docker-compose.yml`:

```yaml
services:
  docker-registry-browser:
    image: klausmeyer/docker-registry-browser:latest
    container_name: docker-registry-browser
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:8080/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

配置原因:

- 使用 `klausmeyer/docker-registry-browser:latest` 官方镜像
- 暴露 `8080` 端口,避免与 Registry 的 `5000` 端口冲突
- 通过 `env_file` 加载环境变量,便于配置管理
- 健康检查验证 Web 服务是否正常响应

## 5. 启动与验证

```bash
# 启动 Docker Registry Browser
cd /app/docker-registry-browser && docker compose up -d

# 查看容器状态
cd /app/docker-registry-browser && docker compose ps

# 查看容器日志
docker logs -f docker-registry-browser
```

访问 Web 界面:

```text
http://<服务器IP>:8080
```

## 6. 与 Registry 共用域名的子路径部署

如果希望 Registry 和 Browser 共用同一域名,可通过子路径方式部署。例如:

- Registry: `http://registry.example.com/v2/`
- Browser: `http://registry.example.com/browser/`

Compose 配置调整:

```yaml
services:
  docker-registry-browser:
    image: klausmeyer/docker-registry-browser:latest
    container_name: docker-registry-browser
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      DOCKER_REGISTRY_URL: http://127.0.0.1:5000
      SECRET_KEY_BASE: <生成的密钥>
      SCRIPT_NAME: /browser
      RAILS_RELATIVE_URL_ROOT: /browser
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:8080/browser/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

Nginx 反向代理配置示例:

```nginx
server {
    listen 80;
    server_name registry.example.com;

    # Browser 子路径
    location /browser/ {
        proxy_pass http://127.0.0.1:8080/;  # 注意末尾的 /
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Registry API
    location /v2/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置要点:

- `SCRIPT_NAME` 和 `RAILS_RELATIVE_URL_ROOT` 设置为 `/browser`,告知 Rails 应用运行在子路径下
- Nginx 的 `proxy_pass` 末尾必须带 `/`,确保子路径被正确剥离
- Browser 和 Registry 可共用同一域名,便于统一访问和管理

## 7. Docker Registry 删除配置

Browser 支持删除镜像标签,但前提是 Registry 必须启用删除功能。在 Registry 的配置文件中添加:

`/app/docker-registry/config/config.yml`:

```yaml
storage:
  delete:
    enabled: true
```

或在 Compose 中通过环境变量启用:

```yaml
services:
  docker-registry:
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
```

:::warning
启用删除功能后,建议定期执行 Registry 垃圾回收以释放空间。详见 [Docker Registry 部署文档](DockerRegistry部署.md)第 9 章。
:::

## 8. 常用运维命令

```bash
# 启动或更新容器
cd /app/docker-registry-browser && docker compose up -d

# 停止并删除容器
cd /app/docker-registry-browser && docker compose down

# 重启服务
cd /app/docker-registry-browser && docker compose restart

# 查看实时日志
docker logs -f docker-registry-browser

# 更新密钥(需重启容器)
# 1. 编辑 .env 文件,更新 SECRET_KEY_BASE
# 2. docker compose restart
```

## 9. 安全建议

- **生产环境必须使用 HTTPS**: Browser 界面不应通过 HTTP 直接暴露,建议通过 Nginx/Traefik 配置 HTTPS
- **启用 Registry 认证**: 防止未授权访问和操作
- **限制 Browser 端口访问**: 使用防火墙限制 `8080` 端口的访问来源
- **定期更换密钥**: `SECRET_KEY_BASE` 属于敏感信息,应定期更换并妥善保管
- **访问控制**: 如果 Browser 提供删除功能,建议通过反向代理增加访问控制层(如 OAuth2 Proxy)

## 10. 局限性说明

由于 Browser 直接调用 Registry API,存在以下局限性:

- **不支持高级搜索**: 无法跨仓库进行复杂查询或过滤
- **依赖 Registry API 性能**: 仓库和标签列表来自 API,大型 Registry 可能响应较慢
- **无持久化状态**: 无法保存用户偏好、自定义设置等
- **无用户管理**: Browser 本身不提供独立的用户认证体系,依赖 Registry 或反向代理的认证

## 11. 参考资料

- [klausmeyer/docker-registry-browser GitHub](https://github.com/klausmeyer/docker-registry-browser)
- [klausmeyer/docker-registry-browser Docker Hub](https://hub.docker.com/r/klausmeyer/docker-registry-browser)
- [Docker Registry HTTP API V2 规范](https://distribution.github.io/distribution/spec/api/)
- [Docker Registry 部署文档](DockerRegistry部署.md)