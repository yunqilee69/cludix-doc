---
slug: /nebula/backend/quick-start
title: "[草稿] 后端快速启动"
description: 用最短路径启动 Nebula 后端，并为前端联调准备可用入口。
---

# [草稿] 后端快速启动

如果你的目标是“先把 Nebula 跑起来”，最短路径就是优先跑单体入口，再决定是否拆服务。`nebula-app-starter` 已经把认证、字典、参数、通知和基础设施组合好了，适合作为第一站。

## 环境前提

在仓库里能直接确认到的基础条件包括：

- Java `21`
- Maven 多模块工程
- MySQL
- Redis

注意：仓库里的 `nebula-app-starter` 示例配置仍带有环境相关地址和凭证，落地时应替换为你自己的环境。

## 方式一：先跑单体入口

在 `nebula` 仓库根目录下执行：

```bash
mvn spring-boot:run -pl nebula-app/nebula-app-starter
```

这种方式最适合：

- 本地开发
- 新人熟悉项目
- 前端先接通认证、菜单、字典、通知等平台能力

## 方式二：跑微服务和网关

当你需要更接近正式拆分形态时，可以分别启动：

```bash
mvn spring-boot:run -pl nebula-auth/nebula-auth-service
mvn spring-boot:run -pl nebula-dict/nebula-dict-service
mvn spring-boot:run -pl nebula-param/nebula-param-service
mvn spring-boot:run -pl nebula-notify/nebula-notify-service
mvn spring-boot:run -pl nebula-gateway/nebula-gateway-service
```

其中网关默认端口是 `17777`，对前端最有用的入口是：

- `http://localhost:17777/doc.html`
- `http://localhost:17777/swagger-ui.html`

## 启动模式能力范围

为了避免第一次联调时误解能力边界，可以先按下面方式理解：

| 启动方式 | 主要目标 | 默认最适合验证的能力 |
| --- | --- | --- |
| `nebula-app-starter` | 单体快速体验 | auth、dict、param、notify、基础设施 |
| 各 `*-service` + gateway | 微服务联调 | auth、dict、param、notify，以及网关聚合 |
| storage/comms/scheduler 独立服务 | 专项能力验证 | 文件存储、企业通信、调度 |

也就是说，如果你要验证文件上传或企业通信，不要默认认为最小启动链路已经覆盖这些能力，最好显式启动对应模块或按专项能力方式集成。

## 给前端联调的建议

如果前端走 `nebula-portal/apps/shell`，最稳定的联调方式是让前端始终只面向网关地址工作。这样前端不需要分别记住每个服务的端口，也能统一查看聚合文档。

## 常见注意点

- 示例配置中含有真实环境痕迹，不建议直接带入新环境
- 如果你准备让前端通过相对路径访问接口，要保证代理或网关路径与 `/api/...` 保持一致
- 如果只是首次上手，先跑单体比先拆服务更省时间
