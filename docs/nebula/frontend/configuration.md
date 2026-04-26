# Nebula Frontend 配置说明

## 1. 配置总览

`nebula-frontend` 的配置来源主要分成三类：

1. **静态 Spring Boot 配置项**：以 `nebula.frontend.*` 为主
2. **平台级前端参数**：通过参数中心读取 `frontend.*`
3. **独立服务运行配置**：如端口，以及对 auth / param 的依赖模式

理解这三类配置的边界很重要：

- `nebula.frontend.*` 决定 frontend 模块如何运行
- `frontend.*` 决定前端平台默认值是什么
- `application.yml` 决定独立 frontend 服务如何启动以及依赖哪些远程模块

---

## 2. `nebula.frontend.*` 核心配置

结合当前模块结构和 README，可整理出如下核心配置：

```yaml
nebula:
  frontend:
    mode: local
    remote:
      service-name: nebula-frontend-service
      service-url: http://localhost:17785
```

### 2.1 `nebula.frontend.mode`

可选值：

- `local`
- `remote`

作用：

- `local`：启用本地控制器与本地 service 实现
- `remote`：当前应用作为 frontend 服务消费者，通过 remote 层转调

### 2.2 `nebula.frontend.remote.*`

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.frontend.remote.service-name` | 远程 frontend 服务名 | `nebula-frontend-service` |
| `nebula.frontend.remote.service-url` | 远程 frontend 服务直连地址 | 无 |

适用场景：

- 微服务消费者通过服务发现访问 frontend 服务
- 本地开发时通过固定 URL 直连独立 frontend 服务

---

## 3. 平台级前端参数 `frontend.*`

frontend 模块本身还依赖参数中心中的平台级配置键。

对应源码：

- `nebula-frontend-core/src/main/java/com/cludix/nebula/frontend/config/FrontendParamKeys.java`

当前主要参数包括：

| 参数键 | 说明 | 默认值 |
|---|---|---|
| `frontend.project-name` | 项目名称 | `Nebula` |
| `frontend.layout-mode` | 平台布局模式 | `side` |
| `frontend.default-theme-code` | 默认主题编码 | `nebula-light` |
| `frontend.default-locale` | 默认语言 | `zh-CN` |
| `frontend.locale-options` | 可选语言列表（JSON 数组） | `["zh-CN","en-US"]` |

### 3.1 `frontend.project-name`

作用：

- 控制前端平台默认项目名称
- 常用于工作台标题、系统名称展示等场景

### 3.2 `frontend.layout-mode`

可选值：

- `side`
- `top`
- `mix`

作用：

- 控制平台级默认布局模式

### 3.3 `frontend.default-theme-code`

当前支持的内置主题编码包括：

- `nebula-light`
- `nebula-graphite`

作用：

- 控制默认主题

### 3.4 `frontend.default-locale`

常见值：

- `zh-CN`
- `en-US`

作用：

- 控制默认语言

### 3.5 `frontend.locale-options`

作用：

- 控制前端允许切换的语言集合

说明：

- 当前实现将它保存为 JSON 数组字符串
- 服务层会自动规范化语言标签，并确保默认语言出现在该集合中

---

## 4. 独立服务运行配置

从 `nebula-frontend-service/src/main/resources/application.yml` 可确认，当前独立服务默认配置包括：

```yaml
server:
  port: 17785

nebula:
  architecture:
    mode: remote
  frontend:
    mode: local
  auth:
    mode: remote
  param:
    mode: remote
```

### 4.1 服务端口

- 默认端口：`17785`

### 4.2 架构模式

- `nebula.architecture.mode=remote`

说明：

- 当前服务以独立模块方式运行，供外部系统通过网关或 remote 层访问

### 4.3 frontend 模块模式

- `nebula.frontend.mode=local`

说明：

- frontend 服务自身启用的是本地实现接口，对外直接暴露 REST 能力

### 4.4 对 auth 的依赖模式

- `nebula.auth.mode=remote`

说明：

- frontend 服务需要从 auth 服务读取登录初始化配置
- 因此独立 frontend 服务默认通过 remote 方式消费 auth

### 4.5 对 param 的依赖模式

- `nebula.param.mode=remote`

说明：

- frontend 服务需要从 param 服务读取和保存平台级前端配置
- 因此独立 frontend 服务默认通过 remote 方式消费 param

---

## 5. 运行边界与依赖说明

### 5.1 frontend 服务本身不是完全独立的孤岛

它当前至少依赖：

- auth 模块：提供登录配置
- param 模块：提供平台级前端配置
- cache 模块：提供动态缓存服务

因此如果采用独立服务部署，需要同步考虑这些依赖模块的可用性。

### 5.2 默认配置与用户偏好是两条链路

- 平台默认配置来自参数中心
- 用户偏好来自 `frontend_user_preference` 表

这意味着部署时不仅要考虑参数服务，还要保证 frontend 自身数据库可用，以便保存用户偏好。

---

## 6. 配置治理建议

### 6.1 本地模式与远程模式不要混用

与 Nebula 其他模块一致，建议：

- 单体应用只引入 `nebula-frontend-local`
- 微服务消费者只引入 `nebula-frontend-remote`

不要在同一应用里同时引入本地和远程实现，以免出现同一契约双实现冲突。

### 6.2 平台级前端配置建议统一走参数中心

如果后续继续扩展 frontend 配置，建议延续当前模式：

- 使用稳定参数键
- 通过 frontend 模块统一保存与读取

这样更利于：

- 多服务共享
- 配置中心治理
- 统一页面渲染

### 6.3 前端编码要与后端受控集合保持一致

当前后端会严格校验：

- 主题编码
- 布局模式
- 导航布局编码
- 侧边栏布局编码
- 语言标签

因此前端实现不应临时拼接新编码，而应严格复用后端文档中的稳定枚举值。
