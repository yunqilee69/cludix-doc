# Nebula Auth 设计与实现

## 1. 设计目标

`nebula-auth` 解决的不是单一“登录接口怎么写”的问题，而是要同时解决下面几类系统级需求：

- 用户登录后如何在后续请求中恢复身份
- 用户拥有哪些角色、组织和资源权限
- 后台菜单与按钮如何和权限模型打通
- 第三方登录接入后如何绑定到本地用户
- 单体与微服务模式下如何复用同一套契约
- 在线会话如何分页查看、失效和踢出

因此它的设计是“**JWT 无状态认证 + 缓存化用户上下文 + 资源授权模型 + local/remote 可切换接入方式**”的组合。

---

## 2. 分层结构

### 2.1 `nebula-auth-api`

这一层定义稳定契约，主要包括：

- `ILoginService`
- `IUserService` / `IRoleService` / `IPermissionService`
- `IOrgService` / `IMenuService` / `IButtonService`
- `IOAuth2ClientService` / `IOAuth2AccountService`
- `model.command`
- `model.query`
- `model.dto`
- 模块守卫自动配置

它的意义是让业务模块、local 层和 remote 层都围绕同一套领域对象协作。

### 2.2 `nebula-auth-core`

核心实现层主要承载：

- 登录注册、刷新令牌、当前用户构建
- 用户 / 角色 / 权限 / 组织 / 菜单 / 按钮业务实现
- DAO 与 MyBatis-Plus Mapper
- JWT 过滤器与 Spring Security 配置
- 缓存定义与会话缓存服务
- OAuth2 登录与用户自动开通逻辑

### 2.3 `nebula-auth-local`

这一层负责把核心能力暴露成 HTTP 接口。

设计上，Controller 只做三件事：

- 接收请求参数
- 把 req 转成 command / query
- 调用 service 并组装 resp

这使得接口层比较薄，业务逻辑集中在 core 层，便于 local / remote 共用同一套实现语义。

### 2.4 `nebula-auth-remote`

这一层提供远程代理实现，适用于 auth 独立部署时的服务消费方。

它的价值在于：

- 业务系统仍然可以面向 auth 契约编程
- 业务侧不需要自己拼接 HTTP 请求
- 切换本地模式和远程模式时，业务层代码改动较小

### 2.5 `nebula-auth-service`

这一层是独立认证中心服务入口。

它的职责不是新增业务逻辑，而是把 local + core 组合成可独立部署的认证中心服务。

---

## 3. 鉴权链路设计

## 3.1 双过滤链结构

从 `SecurityConfig` 可以确认，模块采用了两条 `SecurityFilterChain`：

### 第一条链：公开接口链

这一条链只处理白名单接口，包括：

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh`
- `/api/auth/get-auth-config`
- 微信登录相关公开接口
- Swagger 文档路径
- 额外配置的开放路径

命中这条链后：

- 请求直接 `permitAll`
- 不触发 JWT 过滤器
- 适合登录、注册、登录初始化配置等无需登录态的接口

### 第二条链：受保护接口链

其余请求统一进入受保护链：

- `anyRequest().authenticated()`
- 在 `UsernamePasswordAuthenticationFilter` 之前挂载 `JwtAuthenticationFilter`
- JWT 解析失败时直接返回 401

这样做的好处是：

- 白名单接口和受保护接口边界清晰
- 不需要在每个接口里手工判定是否验 token
- 配置层即可统一收口鉴权入口

---

## 4. JWT 与用户上下文模型

## 4.1 登录成功后的处理

从 `LoginServiceImpl#login` 可确认，用户名密码登录的核心流程是：

1. 校验登录失败锁定状态
2. 查询用户并校验密码
3. 校验账号状态是否启用
4. 构建 `UserContextDto`
5. 生成随机 `cacheKey`
6. 将用户上下文写入缓存
7. 基于 `cacheKey` 生成 accessToken 与 refreshToken
8. 返回令牌及过期时间

这里的关键点是：

> **JWT 本身不是完整用户资料载体，真正的用户上下文由 token 中的缓存键回查获得。**

这使得系统同时具备：

- JWT 的无状态调用体验
- 缓存可控的在线用户治理能力

## 4.2 当前用户构建

`UserContextDto` 的内容并不只有基础用户信息，还包括：

- 用户 ID、用户名、昵称、头像
- 手机号、邮箱
- 组织编码列表
- 角色编码列表
- 权限编码列表

其中权限、组织、角色是在登录时聚合出来的，因此后续请求恢复上下文时，不必每次都重新回表拼装完整权限信息。

## 4.3 刷新令牌

`POST /api/auth/refresh` 通过 refresh token 重新换取新的登录结果。

设计上它和普通登录一样，最终返回的是一组新的：

- accessToken
- refreshToken
- accessTokenExpiresIn
- refreshTokenExpiresIn

这样前端可以把 refresh 看成“续期入口”，而不是只更新 access token 的半刷新逻辑。

---

## 5. 登录失败锁定与在线会话治理

## 5.1 登录失败锁定

从 `LoginAttemptCacheService` 和 `AuthLoginConfigSupport` 可确认，系统支持按用户名进行失败次数限制：

- 失败次数达到阈值后写入锁定缓存
- 锁定时长按小时配置
- 登录成功后清除失败状态与锁定状态

相关动态参数包括：

- `auth.login.username.login-fail-max-count`
- `auth.login.username.lock-time-hours`

这样做的价值是：

- 防止简单暴力破解
- 把安全策略配置化，而不是硬编码在业务逻辑里

## 5.2 在线用户治理

当前登录成功后，用户上下文会进入 `USER_CONTEXT` 缓存。基于这份缓存，系统可以提供：

- 在线用户分页查询
- 按 cacheKey 强制踢出在线用户
- 按 userId 批量移除会话

这意味着 auth 模块不只是“签个 token 就结束”，而是真正具备后台运维可见、可治理的在线会话模型。

---

## 6. 权限模型设计

## 6.1 资源类型

从表结构和枚举可以确认，当前权限资源主要围绕两类：

- `MENU`
- `BUTTON`

这与后台前端的资源模型直接对应：

- 菜单控制“看不看得见页面入口”
- 按钮控制“有没有资格执行某个动作”

## 6.2 授权主体

权限可以授给多种主体：

- `USER`
- `ROLE`
- `ORG`

这使系统并不是单纯的 RBAC，而是接近“多主体资源授权”模型：

- 用户可以直接被授予某些权限
- 角色可以作为权限聚合容器
- 组织也可以承载资源授权

## 6.3 授权效果

`auth_permission` 表中的 `effect` 字段当前支持：

- `Allow`
- `Deny`

设计上这给后续更复杂的授权策略预留了空间，而不是只支持“有权限 / 没权限”的简单开关。

---

## 7. 组织、菜单、按钮的资源建模

## 7.1 组织树

`auth_org` 通过 `parent_id` 与 `path` 组织出层级结构，当前控制器提供：

- 组织分页查询
- 组织树查询
- 全量组织列表查询

并且组织类型已经从旧数字值迁移为明确语义值：

- `COMPANY`
- `DEPARTMENT`
- `TEAM`

## 7.2 菜单树

`auth_menu` 除了基础名称与编码外，还包含大量前端路由相关属性：

- `path`
- `component`
- `icon`
- `type`
- `hidden`
- `external_flag`
- `external_url`
- `visible_in_breadcrumb`
- `visible_in_tab`
- `active_menu_path`

这说明 auth 模块中的菜单并不是抽象资源，而是直接服务于后台前端路由渲染的结构化菜单模型。

## 7.3 按钮资源

`auth_button` 通过 `menu_id` 归属到菜单，按钮编码和名称则用于定义可授权操作点，例如：

- add
- edit
- delete
- export

因此按钮和菜单一起构成了“页面入口 + 页面动作”的完整资源模型。

---

## 8. OAuth2 设计

## 8.1 多提供商配置树

从 `AuthProperties` 可以确认，模块已经预留以下提供商配置：

- QQ
- 微信小程序
- 微信网站
- 支付宝

其中：

- QQ / 支付宝走通用 OAuth2 client provider 结构
- 微信小程序走 `appId/appSecret/sessionUrl/grantType`
- 微信网站支持 `redirect` 与 `qr` 两种登录类型

## 8.2 微信网站登录

微信网站登录设计得比较完整，当前支持两种模式：

### redirect 模式

典型流程：

1. 前端调用 `/wechat/web/redirect/prepare`
2. 服务端生成 `state` 和微信授权地址
3. 浏览器跳转到微信授权页
4. 回调后调用 `/wechat/web/redirect/callback`
5. 服务端完成登录并返回 token

### qr 模式

典型流程：

1. 前端调用 `/wechat/web/qrcode` 生成二维码登录信息
2. 服务端返回 `loginId`、二维码 URL 和过期时间
3. 前端轮询 `/wechat/web/status`
4. 微信扫码回调进入 `/wechat/web/callback`
5. 服务端标记状态为 `SCANNED / SUCCESS`
6. 前端轮询拿到最终登录结果

## 8.3 OAuth2 用户开通

从核心服务依赖关系可以确认，OAuth2 登录并不是只做 token 交换，还包括：

- 第三方账号与本地用户绑定
- 用户自动开通
- 默认角色 / 默认组织的赋值入口

这使模块具备从“外部身份”落到“内部权限体系”的完整接入能力。

---

## 9. 缓存设计

`AuthCacheDefinitionConfiguration` 中明确了两类缓存定义：

- 用户上下文缓存：TTL 跟随 access token 过期时间
- 微信网站登录状态缓存：固定 600 秒

此外，从缓存服务类还可以确认 auth 模块实际使用的缓存域包括：

- 用户上下文缓存
- 登录失败计数缓存
- 登录锁定缓存
- 微信网站登录状态缓存

这样设计的意义是：

- token 生命周期和会话缓存生命周期一致
- 短时状态型流程（如扫码登录）有独立缓存域
- 安全策略缓存和业务会话缓存分离

---

## 10. 本地 / 远程模式切换设计

从配置和模块守卫可以确认，auth 模块明确支持两类运行方式：

### 10.1 local

- Controller 在当前应用中直接生效
- Service 使用本地实现
- 适合单体应用或认证不拆分部署的场景

### 10.2 remote

- 当前应用只依赖 remote 代理
- 通过 `service-name` 或 `service-url` 访问独立 auth 服务
- 适合多个业务服务共享一套认证中心

这种设计的价值不在于“多一种部署方式”，而在于：

> **业务侧依旧可以围绕同一套 auth 契约编程，而不是随着部署方式切换重写调用逻辑。**
