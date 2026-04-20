# Nebula Dict 配置说明

## 1. 配置概览

`nebula-dict` 当前主要涉及以下几类配置：

- 模式开关配置
- remote 调用配置
- 缓存 TTL 配置
- 独立服务运行配置

---

## 2. 模式开关

当前模块通过 `nebula.dict.mode` 控制 local / remote 行为。

### 2.1 local 模式

```yaml
nebula:
  dict:
    mode: local
```

含义：

- 当前应用本地启用 `DictController` 和本地实现
- 对外直接暴露 `/api/dict/*`

### 2.2 remote 模式

```yaml
nebula:
  dict:
    mode: remote
```

含义：

- 当前应用不直接实现字典能力
- 通过 remote 层转调远程字典服务

---

## 3. remote 配置

当前 `DictFeignClient` 与 `DictRemoteProperties` 支持以下配置：

```yaml
nebula:
  dict:
    remote:
      service-name: nebula-dict-service
      service-url: http://localhost:17779
```

### 3.1 `service-name`

- 默认值：`nebula-dict-service`
- 用途：服务发现名称

### 3.2 `service-url`

- 默认值：空
- 用途：直连远程字典服务地址

说明：

- 如果使用注册中心，通常主要依赖 `service-name`
- 如果不走注册中心，可直接通过 `service-url` 指定地址

---

## 4. 字典缓存 TTL 配置

当前缓存定义使用以下配置项：

```yaml
nebula:
  dict:
    cache-ttl-seconds: 300
```

说明：

- 默认 TTL 为 `300` 秒
- 同时作用于平铺字典缓存和树形字典缓存

当前缓存域包括：

- `dictItemByType`
- `dictItemTreeByType`

---

## 5. 独立服务相关配置

从 `nebula-dict-service/src/main/resources/application.yml` 可以确认，独立服务当前典型配置包括：

```yaml
server:
  port: 17779

nebula:
  architecture:
    mode: remote
  dict:
    mode: local
  web:
    result-advice-enable: true
  cache:
    type: caffeine
    default-ttl: 300
```

说明：

- 服务端口默认是 `17779`
- 字典模块自身在服务内仍按 `local` 实现
- 统一响应包装由 `nebula.web.*` 控制
- 缓存由 `nebula.cache.*` 控制

---

## 6. 数据源与基础设施配置

独立服务还会复用基础设施配置，例如：

- `spring.datasource.*`
- `spring.data.redis.*`
- `mybatis-plus.*`
- `management.*`

这些配置不是 dict 模块特有，但独立服务运行时会依赖它们。

---

## 7. 使用建议

### 7.1 单体项目

建议：

- `nebula.dict.mode=local`
- 与当前应用一起提供字典能力

### 7.2 微服务项目

建议：

- 独立部署 `nebula-dict-service`
- 业务服务配置 `nebula.dict.mode=remote`
- 配好 `nebula.dict.remote.*`

### 7.3 查询密集场景

建议：

- 保留字典缓存
- 通过 `cache-ttl-seconds` 调整失效时间
- 依赖模块内自动清理机制保持一致性
