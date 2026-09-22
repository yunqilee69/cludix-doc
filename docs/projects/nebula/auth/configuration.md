# Nebula Auth 配置说明

## 1. 配置总览

`nebula-auth` 的配置来源主要分成三类：

1. **静态 Spring Boot 配置项**：以 `nebula.auth.*` 为主
2. **动态登录参数**：通过参数中心读取 `auth.login.*`
3. **独立服务运行配置**：如端口、数据源、Redis、MyBatis 等

理解这三类配置的边界很重要：

- `nebula.auth.*` 决定 auth 模块如何运行
- `auth.login.*` 决定登录开关、注册策略和锁定策略
- `application.yml` 决定独立 auth 服务如何启动

---

## 2. `nebula.auth.*` 核心配置

对应源码：

- `nebula-auth-core/src/main/java/com/cludix/nebula/auth/config/AuthProperties.java`

基础示例：

```yaml
nebula:
  auth:
    mode: local
    excluded-paths:
      - /api/demo/public
    token:
      access-token-expire: 7200
      refresh-token-expire: 604800
      header: Authorization
      algorithm: HmacSHA256
      secret-key: Xtzlos2FEi5jVzqMAjAWUAhtD7rw6btGek0+pUTHxxA=
    password:
      salt-length: 8
    remote:
      service-name: nebula-auth-service
      service-url: http://localhost:17778
    oauth2:
      enabled: false
      register-allowed: true
      default-role-id: admin-role-id
      default-org-id: root-org-id
```

### 2.1 `nebula.auth.mode`

可选值：

- `local`
- `remote`

作用：

- `local`：启用本地控制器与本地 service 实现
- `remote`：当前应用作为 auth 服务消费者，通过 remote 层转调

### 2.2 `nebula.auth.excluded-paths`

作用：

- 在框架固定白名单之外，追加开放接口路径

说明：

- 固定白名单已经包含登录、注册、刷新令牌、认证初始化和部分微信登录接口
- Swagger 文档路径也会自动加入白名单
- 这里适合按项目需要增加公共接口

### 2.3 `nebula.auth.token.*`

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.auth.token.access-token-expire` | access token 过期时长，单位秒 | `7200` |
| `nebula.auth.token.refresh-token-expire` | refresh token 过期时长，单位秒 | `604800` |
| `nebula.auth.token.header` | token 请求头名 | `Authorization` |
| `nebula.auth.token.algorithm` | JWT 签名算法 | `HmacSHA256` |
| `nebula.auth.token.secret-key` | base64 编码后的密钥 | 默认内置值 |

建议：

- 生产环境务必替换 `secret-key`
- `access-token-expire` 不宜过长，便于降低泄漏风险
- `refresh-token-expire` 应与前端续期策略匹配

### 2.4 `nebula.auth.password.salt-length`

作用：

- 控制 `BCryptPasswordEncoder` 的 strength

默认值：

- `8`

注意：

- 代码中允许范围为 `4 ~ 31`
- 超出该范围时会退回到 `10`
- 值越高，密码哈希越安全，但 CPU 开销也更高

### 2.5 `nebula.auth.remote.*`

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.auth.remote.service-name` | 远程 auth 服务名 | `nebula-auth-service` |
| `nebula.auth.remote.service-url` | 远程 auth 服务直连地址 | 无 |

适用场景：

- 微服务消费者通过服务发现访问 auth
- 本地开发时通过固定 URL 直连独立 auth 服务

---

## 3. OAuth2 配置

`AuthProperties` 中的 OAuth2 配置树如下：

```yaml
nebula:
  auth:
    oauth2:
      enabled: false
      register-allowed: true
      default-role-id:
      default-org-id:
      qq:
        enabled: false
        client-id:
        client-secret:
        authorize-url:
        token-url:
        user-info-url:
        redirect-uri:
        grant-type:
        scope:
      wechat-mini-program:
        enabled: false
        app-id:
        app-secret:
        session-url:
        grant-type:
      wechat-web:
        enabled: false
        type: redirect
        app-id:
        app-secret:
        authorize-url:
        token-url:
        redirect-uri:
        grant-type:
        scope:
      alipay:
        enabled: false
        client-id:
        client-secret:
        authorize-url:
        token-url:
        user-info-url:
        redirect-uri:
        grant-type:
        scope:
```

### 3.1 顶层开关

| 配置项 | 说明 |
|---|---|
| `nebula.auth.oauth2.enabled` | 是否启用 OAuth2 登录能力 |
| `nebula.auth.oauth2.register-allowed` | OAuth2 登录后是否允许自动注册 / 自动开通 |
| `nebula.auth.oauth2.default-role-id` | OAuth2 新用户默认角色 |
| `nebula.auth.oauth2.default-org-id` | OAuth2 新用户默认组织 |

### 3.2 QQ / 支付宝通用 OAuth2 客户端配置

适用于：

- `nebula.auth.oauth2.qq.*`
- `nebula.auth.oauth2.alipay.*`

字段说明：

| 配置项 | 说明 |
|---|---|
| `enabled` | 提供商开关 |
| `client-id` | OAuth2 客户端 ID |
| `client-secret` | OAuth2 客户端密钥 |
| `authorize-url` | 授权地址 |
| `token-url` | 令牌地址 |
| `user-info-url` | 用户信息地址 |
| `redirect-uri` | 回调地址 |
| `grant-type` | 授权类型 |
| `scope` | 授权范围 |

### 3.3 微信小程序配置

| 配置项 | 说明 |
|---|---|
| `nebula.auth.oauth2.wechat-mini-program.enabled` | 是否启用微信小程序登录 |
| `app-id` | 小程序 AppId |
| `app-secret` | 小程序 AppSecret |
| `session-url` | code 换 session 接口地址 |
| `grant-type` | 授权类型 |

### 3.4 微信网站配置

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.auth.oauth2.wechat-web.enabled` | 是否启用微信网站登录 | `false` |
| `nebula.auth.oauth2.wechat-web.type` | 登录类型：`redirect` / `qr` | `redirect` |
| `app-id` | 微信网站应用 AppId | 无 |
| `app-secret` | 微信网站应用 AppSecret | 无 |
| `authorize-url` | 授权地址 | 无 |
| `token-url` | token 地址 | 无 |
| `redirect-uri` | 回调地址 | 无 |
| `grant-type` | 授权类型 | 无 |
| `scope` | scope | 无 |

说明：

- `type=redirect` 时主要用于浏览器跳转授权
- `type=qr` 时主要用于二维码扫码登录
- 若关键地址或 appId 缺失，登录流程会直接报参数缺失错误

---

## 4. 动态登录参数 `auth.login.*`

除了 `nebula.auth.*` 之外，登录初始化配置还依赖参数中心中的动态参数。

对应源码：

- `nebula-auth-core/src/main/java/com/cludix/nebula/auth/config/AuthLoginParamKeys.java`
- `nebula-auth-core/src/main/java/com/cludix/nebula/auth/service/AuthLoginConfigSupport.java`

这些参数不是写在 `AuthProperties` 里，而是运行期通过 `ISystemParamService` 获取。

### 4.1 用户名登录相关

| 参数键 | 说明 |
|---|---|
| `auth.login.username.allow-register` | 是否允许用户名注册 |
| `auth.login.username.password-min-length` | 用户名登录密码最小长度 |
| `auth.login.username.password-max-length` | 用户名登录密码最大长度 |
| `auth.login.username.login-fail-max-count` | 最大连续失败次数 |
| `auth.login.username.lock-time-hours` | 锁定时长（小时） |

### 4.2 手机登录相关

| 参数键 | 说明 |
|---|---|
| `auth.login.phone.enabled` | 是否启用手机号登录 |
| `auth.login.phone.allow-register` | 是否允许手机号注册 |
| `auth.login.phone.code-expire-minutes` | 手机验证码有效期（分钟） |
| `auth.login.phone.send-interval-seconds` | 手机验证码发送间隔（秒） |

### 4.3 邮箱登录相关

| 参数键 | 说明 |
|---|---|
| `auth.login.email.enabled` | 是否启用邮箱登录 |
| `auth.login.email.allow-register` | 是否允许邮箱注册 |
| `auth.login.email.code-expire-minutes` | 邮箱验证码有效期（分钟） |
| `auth.login.email.send-interval-seconds` | 邮箱验证码发送间隔（秒） |

### 4.4 OAuth2 登录相关

| 参数键 | 说明 |
|---|---|
| `auth.login.oauth2.enabled` | 是否启用 OAuth2 登录 |
| `auth.login.oauth2.allow-register` | 是否允许 OAuth2 自动注册 |
| `auth.login.oauth2.provider.qq.enabled` | 是否启用 QQ 登录 |
| `auth.login.oauth2.provider.wechat-mini-program.enabled` | 是否启用微信小程序登录 |
| `auth.login.oauth2.provider.wechat-web.enabled` | 是否启用微信网站登录 |
| `auth.login.oauth2.provider.wechat-web.type` | 微信网站登录类型：`redirect` / `qr` |
| `auth.login.oauth2.provider.alipay.enabled` | 是否启用支付宝登录 |

说明：

- `GET /api/auth/get-auth-config` 返回给前端的初始化配置，主要就是基于这些动态参数拼装出来的
- 如果这些参数缺失，登录初始化或相关登录流程会抛出参数缺失异常

---

## 5. Spring Security 相关固定行为

虽然不是所有安全策略都通过配置项暴露，但当前 `SecurityConfig` 中有一些固定行为需要在文档里明确：

### 5.1 固定白名单路径

框架固定放行的认证接口包括：

- `/api/auth/get-auth-config`
- `/api/auth/login`
- `/api/auth/wechat/mini-program/login`
- `/api/auth/wechat/web/qrcode`
- `/api/auth/wechat/web/status`
- `/api/auth/wechat/web/callback`
- `/api/auth/refresh`
- `/api/auth/register`
- `/api/frontend/init`
- `/api/storage/download-signed`

### 5.2 安全链之外直接忽略的路径

当前直接绕过 Spring Security 的路径包括：

- `/actuator/**`
- `/error`
- `/health`

这意味着这些路径不是“permitAll 后再经过过滤器”，而是根本不进入 Spring Security。

---

## 6. 缓存相关配置语义

`AuthCacheDefinitionConfiguration` 里有两项关键缓存定义：

| 缓存域 | TTL 来源 |
|---|---|
| 用户上下文缓存 | 跟随 `nebula.auth.token.access-token-expire` |
| 微信网站登录状态缓存 | 固定 600 秒 |

说明：

- 用户上下文缓存过期时间与 access token 保持一致
- 微信网站扫码登录状态属于短时流程态缓存，过期较快是合理设计

---

## 7. 独立服务配置示例

对应文件：

- `nebula-auth-service/src/main/resources/application.yml`

当前示例配置如下：

```yaml
server:
  port: 17778

spring:
  data:
    redis:
      host: 192.168.1.28
      port: 6379
      database: 0
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://192.168.1.28:3306/nebula?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: cludix-mysql-pwd
    type: com.alibaba.druid.pool.DruidDataSource

nebula:
  architecture:
    mode: remote
  auth:
    mode: local
  param:
    mode: remote
  web:
    result-advice-enable: true
  cache:
    type: caffeine
    default-ttl: 300

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      table-underline: true
      id-type: assign_uuid
  mapper-locations: classpath*:mapper/*.xml
```

从这个示例可以得到几个结论：

- auth 独立服务默认监听 `17778`
- 独立服务自身仍然运行本地 auth 实现，即 `nebula.auth.mode=local`
- 参数中心模式当前示例为 `nebula.param.mode=remote`
- 认证中心依赖 MySQL 与 Redis

> 注意：这里的 IP、账号和密码属于示例环境信息，不应直接照搬到生产环境。

---

## 8. 推荐配置建议

### 8.1 单体应用

推荐：

```yaml
nebula:
  auth:
    mode: local
```

并引入：

- `nebula-auth-local`

### 8.2 微服务消费者

推荐：

```yaml
nebula:
  auth:
    mode: remote
    remote:
      service-name: nebula-auth-service
      service-url: http://localhost:17778
```

并引入：

- `nebula-auth-remote`

### 8.3 生产环境注意事项

建议重点检查：

- 替换 JWT `secret-key`
- 调整 token 过期时间
- 配好 OAuth2 提供商密钥与回调地址
- 补齐参数中心中的 `auth.login.*` 动态参数
- 不要同时引入 local 与 remote 两套接入层
