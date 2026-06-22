# 容器部署

本目录收录各类常用服务的 Docker Compose 部署文档，统一遵循 [Docker 规范](../index.md) 中的单应用 compose 模式。

## 中间件

| 服务 | 说明 |
| --- | --- |
| [MySQL](./MySQL部署) | 关系型数据库 |
| [PostgreSQL 17](./PostgreSQL17部署) | 关系型数据库 |
| [Redis](./Redis部署) | 缓存与消息队列 |
| [Nacos](./Nacos部署) | 服务注册与配置中心 |
| [RocketMQ](./RocketMQ部署) | 消息队列 |
| [Milvus](./Milvus部署) | 向量数据库 |

## 网关与代理

| 服务 | 说明 |
| --- | --- |
| [Nginx](./Nginx部署) | 反向代理与静态资源服务 |
| [NewAPI](./NewAPI部署) | 大模型统一网关 |
| [Bifrost](./Bifrost部署) | AI 网关 |

## 运维工具

| 服务 | 说明 |
| --- | --- |
| [Portainer](./Portainer部署) | Docker 管理面板 |
| [Jenkins](./Jenkins部署) | CI/CD 服务器 |
| [Filebrowser](./Filebrowser部署) | 文件管理器 |

## 媒体服务

| 服务 | 说明 |
| --- | --- |
| [Jellyfin](./Jellyfin部署) | 媒体服务器 |
| [Jellyseerr](./Jellyseerr部署) | 媒体请求管理 |

## AI 应用

| 服务 | 说明 |
| --- | --- |
| [DeerFlow](./DeerFlow部署) | Super Agent Harness（字节跳动开源） |
