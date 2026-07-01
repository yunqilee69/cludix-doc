---
title: Docker Buildx 使用说明
date: 2026-07-01 14:30
tags: [docker, usage, tutorial, configuration, cache]
---

# Docker Buildx 使用说明

Docker Buildx 是 Docker 官方提供的增强构建工具，底层基于 BuildKit，常用于多平台镜像构建、构建缓存复用、独立 builder 管理和构建阶段镜像源配置。

本文按实际使用顺序说明：先创建 BuildKit 配置并创建 builder，再给出常用构建命令，最后补充原理和排查说明。

## 1. 前置检查

确认 Docker 已安装 Buildx：

```bash
docker version
docker buildx version
docker buildx ls
```

如果需要构建非本机架构镜像，先安装多架构模拟支持：

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

## 2. 配置 Buildx 镜像源

普通 Docker 镜像源通常写在 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": ["https://xxxx.xuanyuan.run/"]
}
```

但使用 `docker-container` driver 时，Buildx 会启动独立的 BuildKit 容器执行构建。构建阶段拉取 `FROM alpine`、`FROM node` 等基础镜像时，主要读取 BuildKit 自己的配置，不一定直接复用 Docker daemon 的 `registry-mirrors`。

因此，Buildx 镜像源建议写到 `buildkitd.toml`。

### 2.1 在宿主机创建 BuildKit 配置

下面的 `/etc/buildkitd.toml` 是在**宿主机**上创建的文件，不是在 Buildx 的 BuildKit 容器里手动创建。

执行 `docker buildx create --buildkitd-config /etc/buildkitd.toml` 时，Buildx 会从宿主机读取该配置，并用它启动 BuildKit 容器。

```bash
sudo tee /etc/buildkitd.toml >/dev/null <<'EOF'
debug = true

[registry."docker.io"]
  mirrors = ["mirror.gcr.io"]
EOF
```

如果有自己的 Docker Hub 加速域名，可以替换 `mirror.gcr.io`：

```toml
debug = true

[registry."docker.io"]
  mirrors = ["xxxx.xuanyuan.run"]
```

说明：

- 编辑位置：宿主机 `/etc/buildkitd.toml`
- 使用位置：Buildx 创建的 BuildKit 容器
- 生效时机：创建 builder 时读取
- 修改配置后：已有 builder 不会自动更新，需要删除并重建 builder

### 2.2 HTTP 或内网自建镜像源

如果镜像源是 HTTP，或者使用自签证书，可以增加 `http` / `insecure` 配置：

```toml
debug = true

[registry."docker.io"]
  mirrors = ["192.168.100.100:5000"]
  http = true
  insecure = true

[registry."192.168.100.100:5000"]
  http = true
  insecure = true
```

:::warning
`http = true` 和 `insecure = true` 只建议用于内网可信环境。生产环境建议为镜像仓库配置 HTTPS 和认证。
:::

## 3. 创建 Buildx Builder

推荐使用 `docker-container` driver：

```bash
docker buildx create \
  --use \
  --bootstrap \
  --name mirror-builder \
  --driver docker-container \
  --buildkitd-config /etc/buildkitd.toml
```

参数说明：

- `--name mirror-builder`：builder 名称
- `--driver docker-container`：使用独立 BuildKit 容器
- `--buildkitd-config /etc/buildkitd.toml`：读取宿主机上的 BuildKit 配置文件
- `--use`：创建后立即切换为当前 builder
- `--bootstrap`：创建后立即启动 builder

查看 builder：

```bash
docker buildx ls
docker buildx inspect mirror-builder --bootstrap
```

如果修改了 `/etc/buildkitd.toml`，需要重建 builder：

```bash
docker buildx rm mirror-builder

docker buildx create \
  --use \
  --bootstrap \
  --name mirror-builder \
  --driver docker-container \
  --buildkitd-config /etc/buildkitd.toml
```

## 4. 常用构建命令

### 4.1 本地单平台构建

使用 `docker-container` driver 时，构建结果默认不会出现在 `docker images` 中。本地测试建议加 `--load`：

```bash
docker buildx build \
  --builder mirror-builder \
  --platform linux/amd64 \
  -t demo/app:local \
  --load \
  .
```

验证：

```bash
docker images | grep demo/app
docker run --rm demo/app:local
```

### 4.2 多平台构建并推送

多平台镜像建议直接推送到镜像仓库：

```bash
docker login registry.example.com

docker buildx build \
  --builder mirror-builder \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/demo/app:1.0.0 \
  -t registry.example.com/demo/app:latest \
  --push \
  .
```

不同架构机器拉取同一个镜像标签时，Docker 会自动选择对应架构的镜像。

### 4.3 指定 Dockerfile 和构建参数

```bash
docker buildx build \
  --builder mirror-builder \
  -f Dockerfile \
  -t demo/app:1.0.0 \
  --build-arg APP_ENV=prod \
  --target runtime \
  --load \
  .
```

### 4.4 使用缓存构建

简单场景可以使用 inline cache：

```bash
docker buildx build \
  --builder mirror-builder \
  -t registry.example.com/demo/app:1.0.0 \
  --push \
  --cache-to type=inline \
  --cache-from type=registry,ref=registry.example.com/demo/app:1.0.0 \
  .
```

CI/CD 场景建议使用单独的 registry cache：

```bash
docker buildx build \
  --builder mirror-builder \
  -t registry.example.com/demo/app:1.0.0 \
  --push \
  --cache-from type=registry,ref=registry.example.com/demo/app:buildcache \
  --cache-to type=registry,ref=registry.example.com/demo/app:buildcache,mode=max \
  .
```

## 5. 常用管理命令

```bash
# 查看 Buildx 版本
docker buildx version

# 查看 builder 列表
docker buildx ls

# 查看当前 builder 详情
docker buildx inspect --bootstrap

# 切换 builder
docker buildx use mirror-builder

# 指定 builder 构建
docker buildx build --builder mirror-builder -t demo/app:local --load .

# 停止 builder
docker buildx stop mirror-builder

# 删除 builder
docker buildx rm mirror-builder

# 查看缓存占用
docker buildx du

# 清理缓存
docker buildx prune
```

## 6. 常见问题

### 6.1 构建成功但本地没有镜像

原因：使用 `docker-container` driver 构建时，没有指定 `--load`。

解决：

```bash
docker buildx build -t demo/app:local --load .
```

### 6.2 多平台构建不能直接 `--load`

`--load` 更适合单平台镜像导入本地。多平台镜像通常使用 `--push` 推送到镜像仓库，由仓库存储 manifest list。

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/demo/app:latest \
  --push \
  .
```

### 6.3 配了 Docker daemon 镜像源但 Buildx 仍然很慢

原因：`docker-container` builder 使用独立 BuildKit 容器，构建阶段拉取基础镜像时主要看 BuildKit 配置。

解决：通过 `/etc/buildkitd.toml` 配置 mirror，并使用 `--buildkitd-config` 重建 builder。

### 6.4 修改 `buildkitd.toml` 后不生效

原因：配置在创建 builder 时读取，已有 builder 不会自动更新。

解决：

```bash
docker buildx rm mirror-builder

docker buildx create \
  --use \
  --bootstrap \
  --name mirror-builder \
  --driver docker-container \
  --buildkitd-config /etc/buildkitd.toml
```

### 6.5 查看镜像源是否被使用

如果 `buildkitd.toml` 中启用了 `debug = true`，可以查看 BuildKit 容器日志：

```bash
docker logs buildx_buildkit_mirror-builder0
```

## 7. 补充说明

### 7.1 `docker` driver 和 `docker-container` driver 的区别

| driver | 特点 |
| --- | --- |
| `docker` | 使用 Docker daemon 内置 BuildKit，简单构建方便，通常自动加载本地镜像 |
| `docker-container` | 使用独立 BuildKit 容器，适合多平台构建、缓存导出、镜像源定制 |

日常如果需要配置 Buildx 专用镜像源，建议使用 `docker-container` driver。

### 7.2 `--load` 和 `--push` 的选择

| 场景 | 推荐参数 |
| --- | --- |
| 本地单平台测试 | `--load` |
| 发布到镜像仓库 | `--push` |
| 多平台镜像 | `--push` |
| CI/CD 构建 | `--push` + `--cache-to` / `--cache-from` |

### 7.3 Dockerfile 中的平台变量

BuildKit 会自动提供平台参数：

- `BUILDPLATFORM`：执行构建的节点平台
- `TARGETPLATFORM`：目标镜像平台
- `TARGETOS`：目标操作系统
- `TARGETARCH`：目标 CPU 架构

示例：

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.22 AS builder
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY . .
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o app ./cmd/app

FROM alpine:3.20
COPY --from=builder /src/app /usr/local/bin/app
CMD ["app"]
```

### 7.4 多仓库镜像源配置

如果需要同时加速 Docker Hub、GHCR、Quay 等仓库，可以分别配置：

```toml
debug = true

[registry."docker.io"]
  mirrors = ["docker-mirror.example.com"]

[registry."ghcr.io"]
  mirrors = ["ghcr-mirror.example.com"]

[registry."quay.io"]
  mirrors = ["quay-mirror.example.com"]
```

不同镜像源服务的路径规则不同，如果服务商要求路径前缀，需要以服务商说明为准。

### 7.5 Bake 简介

当构建命令越来越长，或者一个仓库需要同时构建多个镜像时，可以使用 `docker buildx bake` 把构建配置写入 `docker-bake.hcl`。

```hcl
group "default" {
  targets = ["app"]
}

target "app" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["registry.example.com/demo/app:latest"]
  platforms = ["linux/amd64", "linux/arm64"]
}
```

执行：

```bash
docker buildx bake --push
```

## 8. 参考资料

- [Docker Buildx CLI reference](https://docs.docker.com/reference/cli/docker/buildx/)
- [docker buildx create](https://docs.docker.com/reference/cli/docker/buildx/create/)
- [docker buildx build](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Build drivers](https://docs.docker.com/build/builders/drivers/)
- [Configure BuildKit](https://docs.docker.com/build/buildkit/configure/)
- [BuildKit TOML configuration](https://docs.docker.com/build/buildkit/toml-configuration/)
- [Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Cache storage backends](https://docs.docker.com/build/cache/backends/)
