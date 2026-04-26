# Nebula Auth 使用方式

## 1. 接入方式总览

`nebula-auth` 支持两种主要接入方式：

- 单体模式：业务应用直接引入 `nebula-auth-local`
- 微服务模式：独立部署 `nebula-auth-service`，业务应用引入 `nebula-auth-remote`

无论哪种方式，业务代码最好都面向 `ILoginService`、`IUserService`、`IRoleService` 等契约编程。

---

## 2. 单体应用接入

### 2.1 Maven 依赖

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-auth-local</artifactId>
</dependency>
```

### 2.2 适合场景

适用于：

- 单体后台系统
- 已经使用 `nebula-app-starter` 的场景
- 认证、权限和业务模块一起部署的场景

### 2.3 运行方式

此时：

- `LoginController`、`UserController` 等直接对外提供接口
- `ILoginService`、`IUserService` 等由本地实现提供
- JWT 过滤、权限聚合和会话缓存都在当前应用中执行

---

## 3. 独立认证服务接入

### 3.1 启动独立服务

```bash
mvn spring-boot:run -pl nebula-auth/nebula-auth-service
```

### 3.2 当前服务配置

从 `nebula-auth-service/src/main/resources/application.yml` 可确认：

- 默认端口：`17778`
- `nebula.auth.mode=local`
- `nebula.architecture.mode=remote`

即独立服务本身暴露的是本地实现接口，对外作为认证中心服务运行。

### 3.3 消费方依赖

业务服务作为消费者时，应引入：

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-auth-remote</artifactId>
</dependency>
```

### 3.4 remote 配置示例

```yaml
nebula:
  auth:
    mode: remote
    remote:
      service-name: nebula-auth-service
      service-url: http://localhost:17778
```

### 3.5 适合场景

适用于：

- 多个业务系统共用同一套认证中心
- 希望统一治理用户、角色、菜单和权限
- 希望登录体系与业务系统解耦部署

---

## 4. 前端对接建议

### 4.1 登录流程

推荐流程：

1. 前端先调用 `/api/auth/get-auth-config`
2. 根据返回值决定展示用户名登录、微信登录或其他第三方登录入口
3. 用户登录成功后拿到 `accessToken` 和 `refreshToken`
4. 使用 `accessToken` 调用 `/api/auth/current-user`
5. 用返回的菜单、角色和权限编码初始化前端权限状态

### 4.2 续期流程

推荐做法：

- access token 即将过期时调用 `/api/auth/refresh`
- 用新的 token 对替换本地登录状态

### 4.3 退出流程

推荐做法：

- 点击退出按钮时调用 `/api/auth/logout`
- 前端同时清除本地 token 和用户状态

---

## 5. 后台权限体系落地建议

### 5.1 菜单和按钮分开建模

建议：

- 菜单用于页面入口与路由展示
- 按钮用于动作级权限控制

这样能更清楚地表达：

- 页面能不能进入
- 进入页面后哪些动作可以执行

### 5.2 权限主体优先围绕角色治理

虽然 auth 模块支持：

- USER
- ROLE
- ORG

三类授权主体，但大多数项目建议优先以角色为主，再补充特殊用户或组织授权。这样更容易维护和理解。

### 5.3 当前用户接口适合作为前端权限初始化入口

因为它已经返回：

- 角色编码列表
- 权限编码列表
- 菜单列表

所以前端无需自己再拼多次请求获取权限上下文。
