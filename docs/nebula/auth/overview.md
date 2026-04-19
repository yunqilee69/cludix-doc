# Nebula Auth 模块总览

## 1. 模块定位

`nebula-auth` 是 Nebula 中台里的认证与权限中心，负责把“用户是谁、当前能做什么、菜单该看到什么、第三方登录如何接入”这几个核心问题统一收口。

从当前代码可确认，它主要提供以下能力：

- 用户注册、登录、刷新令牌、登出
- 当前登录用户上下文查询
- 在线用户分页查询与强制踢出
- 用户、角色、权限管理
- 组织架构管理与组织树查询
- 菜单、按钮资源管理与菜单树查询
- OAuth2 客户端管理与第三方账号绑定管理
- 微信小程序登录、微信网站登录（跳转 / 扫码）

换句话说，`nebula-auth` 不只是一个登录模块，它同时承载了后台权限中心的核心元数据与鉴权入口。

---

## 2. 模块结构

当前 `nebula-auth` 按照 Nebula 标准拆成 5 个子模块：

```text
nebula-auth/
├── nebula-auth-api      # 契约层：接口、DTO、Command、Query、常量、模块守卫
├── nebula-auth-core     # 核心实现：service、dao、entity、安全配置、缓存定义
├── nebula-auth-local    # 本地接入层：Controller + 请求/响应模型
├── nebula-auth-remote   # 远程接入层：Feign Client + 远程代理实现
└── nebula-auth-service  # 独立服务启动模块
```

### 2.1 `nebula-auth-api`

这一层负责提供稳定契约，供业务模块、remote 层和独立服务共同依赖，当前可以确认包括：

- 认证与权限相关 Service 接口，如 `ILoginService`、`IUserService`、`IRoleService`
- `model.command`、`model.query`、`model.dto` 等领域对象
- 权限、缓存、错误码等常量
- local / remote 依赖冲突的模块守卫配置

### 2.2 `nebula-auth-core`

这一层是模块真正的核心实现，当前可确认包括：

- 业务实现：`LoginServiceImpl`、`UserServiceImpl` 等
- DAO / Mapper：基于 MyBatis-Plus 的数据访问层
- 实体：`UserEntity`、`RoleEntity`、`OrgEntity`、`PermissionEntity` 等
- 安全配置：`SecurityConfig`、`JwtAuthenticationFilter`
- 配置类：`AuthProperties`、缓存定义等
- OAuth2 登录能力与用户自动开通逻辑

### 2.3 `nebula-auth-local`

这一层对外暴露 REST 接口，适合单体应用直接引入。当前控制器入口包括：

- `LoginController`
- `UserController`
- `RoleController`
- `PermissionController`
- `OrgController`
- `MenuController`
- `ButtonController`
- `OAuth2ClientController`
- `OAuth2AccountController`

### 2.4 `nebula-auth-remote`

这一层为微服务消费者提供远程代理能力。业务服务只依赖 `nebula-auth-remote` 时，可以继续面向认证契约编程，而不需要自己实现一套 auth 逻辑。

当前可确认它提供：

- `nebula.auth.remote.*` 配置
- 多个 Feign Client
- 远程代理实现，转调独立部署的 auth 服务

### 2.5 `nebula-auth-service`

这一层是独立认证中心的启动模块，用于把 auth 作为服务单独部署。

从 `nebula-auth-service/src/main/resources/application.yml` 可确认：

- 默认端口：`17778`
- 独立服务运行时自身使用 `nebula.auth.mode=local`
- 架构模式为 `nebula.architecture.mode=remote`

---

## 3. 业务能力分组

## 3.1 登录与会话

对外提供：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/current-user`
- `GET /api/auth/get-auth-config`
- `POST /api/auth/online-users/page`
- `POST /api/auth/online-users/{cacheKey}/kick-out`

这组接口负责登录态建立、刷新、销毁，以及在线会话治理。

## 3.2 用户、角色、权限

对外提供：

- 用户 CRUD 与分页查询
- 角色 CRUD、分页查询、启用角色列表
- 授权记录 CRUD 与分页查询

这组接口是后台权限中心最核心的数据入口。

## 3.3 组织、菜单、按钮

对外提供：

- 组织 CRUD、组织树、组织列表
- 菜单 CRUD、菜单树、菜单分页
- 按钮 CRUD、按钮分页

这组接口对应“组织结构 + 前端可见资源 + 可授权操作”的资源模型。

## 3.4 OAuth2 能力

当前代码可确认支持：

- OAuth2 客户端管理
- OAuth2 账户绑定管理
- 微信小程序登录
- 微信网站登录（redirect 与 qr 两种形态）

配置类中还预留了：

- QQ OAuth2
- 支付宝 OAuth2

因此模块设计已经具备多提供商扩展能力，即使当前公开控制器里最完整的是微信相关登录流程。

---

## 4. 数据模型概览

从初始化 SQL 可以确认，`nebula-auth` 当前涉及以下 10 张核心表：

- `auth_user`：用户表
- `auth_role`：角色表
- `auth_org`：组织表
- `auth_user_org`：用户组织关联表
- `auth_user_role`：用户角色关联表
- `auth_menu`：菜单表
- `auth_button`：按钮表
- `auth_permission`：权限表
- `auth_oauth2_account`：OAuth2 账号绑定表
- `auth_oauth2_client`：OAuth2 客户端表

这些表一起组成了完整的认证中心元数据模型：

- 用户通过角色、组织获得权限
- 权限作用到菜单、按钮资源
- 第三方账号可与用户绑定
- OAuth2 客户端可用于外部授权接入

---

## 5. 本地模式与远程模式

`nebula-auth` 支持两种主要接入模式。

### 5.1 单体模式

业务应用直接引入：

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-auth-local</artifactId>
</dependency>
```

此时：

- Controller 直接在当前应用中暴露
- `ILoginService`、`IUserService` 等接口由本地实现提供
- 适合单体后台系统或认证能力和业务服务一起部署的场景

### 5.2 微服务模式

独立部署认证中心，然后业务服务只依赖 remote：

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-auth-remote</artifactId>
</dependency>
```

示例配置：

```yaml
nebula:
  auth:
    mode: remote
    remote:
      service-name: nebula-auth-service
      service-url: http://localhost:17778
```

此时：

- `nebula-auth-service` 统一对外提供 auth HTTP 接口
- 业务服务通过 remote 层转调
- 适合多个业务系统共用一套认证中心的场景

### 5.3 启动约束

当前模块存在明确的依赖守卫：

- 不应在同一个应用里同时引入 `nebula-auth-local` 和 `nebula-auth-remote`
- 否则会导致同一认证契约出现双实现冲突，启动期直接失败

---

## 6. 推荐阅读入口

如果需要进一步对照源码，建议优先阅读以下文件：

- `nebula-auth/README.md`
- `nebula-auth/nebula-auth-local/src/main/java/com/cludix/nebula/auth/controller/`
- `nebula-auth/nebula-auth-core/src/main/java/com/cludix/nebula/auth/config/AuthProperties.java`
- `nebula-auth/nebula-auth-core/src/main/java/com/cludix/nebula/auth/config/SecurityConfig.java`
- `nebula-auth/nebula-auth-core/src/main/resources/db/schema/01-auth-schema-mysql.sql`
- `nebula-auth/nebula-auth-service/src/main/resources/application.yml`
