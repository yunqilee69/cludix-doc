# Nebula Param 配置说明

## 1. 配置总览

`nebula-param` 的配置来源主要分成两类：

1. **静态 Spring Boot 配置项**：以 `nebula.param.*` 为主
2. **独立服务运行配置**：如端口、数据源、Redis、MyBatis 等

理解这两类配置的边界很重要：

- `nebula.param.*` 决定参数模块如何运行
- `application.yml` 决定独立参数服务如何启动

---

## 2. `nebula.param.*` 核心配置

结合当前模块结构和 README，可整理出如下核心配置：

```yaml
nebula:
  param:
    mode: local
    cache-ttl-seconds: 300
    remote:
      service-name: nebula-param-service
      service-url: http://localhost:17780
```

### 2.1 `nebula.param.mode`

可选值：

- `local`
- `remote`

作用：

- `local`：启用本地控制器与本地 service 实现
- `remote`：当前应用作为参数服务消费者，通过 remote 层转调

### 2.2 `nebula.param.cache-ttl-seconds`

作用：

- 控制按 key 读取参数缓存的默认 TTL

默认值：

- `300`

建议：

- 生产环境通常可以保持 300 秒左右，兼顾读取性能和变更生效速度
- 如果参数变化很少，可以适当增大
- 如果配置频繁调整，且希望更快生效，可以适当减小

### 2.3 `nebula.param.remote.*`

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.param.remote.service-name` | 远程参数服务名 | `nebula-param-service` |
| `nebula.param.remote.service-url` | 远程参数服务直连地址 | 无 |

适用场景：

- 微服务消费者通过服务发现访问参数中心
- 本地开发时通过固定 URL 直连独立参数服务

---

## 3. 独立服务运行配置

从 `nebula-param-service/src/main/resources/application.yml` 可确认，当前独立服务默认配置包括：

```yaml
server:
  port: 17780

nebula:
  architecture:
    mode: remote
  param:
    mode: local
  web:
    result-advice-enable: true
  cache:
    type: caffeine
    default-ttl: 300
```

### 3.1 服务端口

- 默认端口：`17780`

### 3.2 架构模式

- `nebula.architecture.mode=remote`

说明：

- 当前服务以独立模块方式运行，供外部系统通过网关或 remote 层访问

### 3.3 参数模块模式

- `nebula.param.mode=local`

说明：

- 这表示参数服务自身启用的是本地实现接口，对外直接暴露 REST 能力

### 3.4 Web 响应封装

- `nebula.web.result-advice-enable=true`

说明：

- 接口返回将统一包装为 `ApiResult`

### 3.5 缓存配置

- `nebula.cache.type=caffeine`
- `nebula.cache.default-ttl=300`

说明：

- 当前独立参数服务默认启用 Caffeine 缓存
- 适合单节点或测试环境的快速接入

---

## 4. 数据源与基础设施配置

当前 `application.yml` 中还包含：

- MySQL 数据源
- Redis 连接配置
- MyBatis-Plus 配置
- Actuator 管理端点配置

这些配置不专属于 param 模块本身，但在独立服务部署时必不可少。

### 4.1 MySQL

当前示例里使用：

- `com.mysql.cj.jdbc.Driver`
- MySQL `nebula` 数据库
- Druid 连接池

### 4.2 Redis

当前示例里包含 Redis 连接配置，但 health 检查关闭：

- `management.health.redis.enabled=false`

### 4.3 MyBatis-Plus

关键配置包括：

- 驼峰映射开启
- `id-type=assign_uuid`
- `mapper-locations=classpath*:mapper/*.xml`

---

## 5. 配置治理建议

### 5.1 本地模式与远程模式不要混用

与 Nebula 其他模块一致，建议：

- 单体应用只引入 `nebula-param-local`
- 微服务消费者只引入 `nebula-param-remote`

不要在同一应用里同时引入本地和远程实现，以免出现同一契约双实现冲突。

### 5.2 缓存 TTL 需要和变更频率匹配

如果系统参数变更频率高，建议：

- 适当缩短 TTL
- 或在关键写入链路后确保缓存失效策略可用

### 5.3 生产环境注意替换示例基础设施配置

当前服务 `application.yml` 带有示例环境中的：

- 数据库地址
- Redis 地址
- Druid 管理账号

生产环境请务必替换为自己的真实配置，避免把示例配置直接带入线上。

---

## 6. 网关与依赖模块协作

在 Nebula 的整体架构中，参数服务通常与这些模块协作：

- `auth`：读取登录、注册和安全策略参数
- `frontend`：读取前端平台配置并写回默认设置
- `notify` / `storage` / 其他业务模块：读取模块级系统配置
- `gateway`：统一代理 `/api/param/**`

这意味着参数模块虽然本身业务比较聚焦，但在系统架构中的位置非常基础，属于其他模块经常依赖的中心能力。
