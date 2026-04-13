---
slug: /operations/docker
title: Docker 规范
---

# Docker 规范

本目录下的大多数容器部署文档（如 Nginx、MySQL、Redis、Nacos）统一遵循同一套 Docker Compose 模式，便于运维管理与按需启停。

:::tip
像 DeerFlow 这类官方维护多服务编排的项目，会优先遵循其上游仓库提供的 Docker 工作流，而不是强行改造成本文的单应用 `app-net` 规范。相关文档见 [DeerFlow Docker 部署指南](./deployments/DeerFlow部署.md)。
:::

## 1. 统一原则

- 每个 `docker compose` 文件只定义一个应用服务
- 所有应用都加入同一个外部网络 `app-net`
- 网络使用 `external: true`，不在 compose 内重复创建

这样可以让不同 compose 文件启动的容器之间直接通过容器名互通。

## 2. 首次部署前

部署前请先完成 [服务器初始化](./server-init.md)，包括：

- 创建共享网络 `app-net`
- 创建基础目录 `/app`

## 3. Compose 写法模板

```yaml
services:
  app-name:
    image: your-image:latest
    networks:
      - app-net

networks:
  app-net:
    external: true
```

说明：

- 网络统一接入 `app-net`，确保跨 compose 服务可互通
- 各应用的目录权限设置见具体部署文档

## 4. 目录内文档说明

- [服务器初始化](./server-init.md) - 首次部署前的服务器级别配置
- [Docker 部署列表](./deployments/index.md)
- [Docker 使用文档](./usage/index.md)

后续新增其他容器文档时，均按本规范编排。