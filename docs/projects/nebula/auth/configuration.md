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
      providers:
        github:
          enabled: false
          client-id:
          client-secret:
          authorize-url:
          token-url:
          redirect-uri:
          scope:
          frontend-callback-uri:
        wechat:
          enabled: false
          mini:
            app-id:
            app-secret:
            js-code2-session-url:
            access-token-url:
            phone-number-url:
          web:
            app-id:
            app-secret:
            authorize-url:
            access-token-url:
            redirect-uri:
            scope:
            frontend-callback-uri:
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

自动建号用户的**默认角色 / 默认组织不是静态配置项**，而是参数中心的系统参数 `login.oauth2.default-role-id` / `login.oauth2.default-org-id`（见 §4.4）；未设置（空值）时不绑定。绑定逻辑在 `UserDefaultRoleOrgBinder`，由**所有自助注册建号路径**在建号事务内调用（OAuth2 首登、用户名注册、手机号 / 邮箱验证码首次登录）。

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

### 3.3 微信登录配置（`nebula.auth.oauth2.providers.wechat.*`）

微信统一为一个 provider（providerId `wechat`），凭据按接入渠道分两级：

- `mini` —— 小程序渠道：`wx.login()` 直连式登录，无浏览器重定向
- `web` —— 开放平台「网站应用」渠道（网页应用）：`connect/qrconnect` 扫码授权，可用于 Web 登录与「已登录用户绑定」

顶层：

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.auth.oauth2.providers.wechat.enabled` | 启动期配置完整性自检开关，**不影响装配，也不影响运行时可用性**（详见 §3.4） | `false` |
| `nebula.auth.oauth2.providers.wechat.access-token-safety-margin-seconds` | access_token 缓存提前失效余量（秒） | `300` |

小程序渠道（`mini`）：

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `mini.app-id` | 小程序 AppID | 无 |
| `mini.app-secret` | 小程序 AppSecret，必须环境变量注入 | 无 |
| `mini.js-code2-session-url` | 授权码换会话接口 | `https://api.weixin.qq.com/sns/jscode2session` |
| `mini.access-token-url` | 接口调用凭证接口（手机号能力依赖） | `https://api.weixin.qq.com/cgi-bin/token` |
| `mini.phone-number-url` | 手机号获取接口 | `https://api.weixin.qq.com/wxa/business/getuserphonenumber` |

网页应用渠道（`web`）：

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `web.app-id` | 网站应用 AppID | 无 |
| `web.app-secret` | 网站应用 AppSecret，必须环境变量注入 | 无 |
| `web.authorize-url` | 扫码授权页地址 | `https://open.weixin.qq.com/connect/qrconnect` |
| `web.access-token-url` | 授权码换 token 接口 | `https://api.weixin.qq.com/sns/oauth2/access_token` |
| `web.redirect-uri` | 微信侧回调地址，须与开放平台后台授权回调域一致 | 无（启用网页应用渠道时必填） |
| `web.scope` | 授权作用域 | `snsapi_login` |
| `web.frontend-callback-uri` | 扫码登录完成后前端承接页地址；企业配置侧只接受站内相对路径，本项作为默认值不做相对强校验 | `/login/wechat-callback` |

校验规则：

- `enabled=true` 时 `mini` 与 `web` 至少一个渠道配置完整，否则启动失败
- 渠道配置完整即参与装配：仅配 `mini` 时绑定能力不可用，配齐 `web` 后个人信息页出现微信绑定入口
- `web.frontend-callback-uri` 是部署级默认承接页，本项不做相对路径强校验（仓库默认值便于本地联调）；企业配置里的承接页由 `OAuth2FrontendCallbackUri` 强制站内相对路径，详见 §3.5

环境变量参考（推荐注入方式）：

```yaml
nebula:
  auth:
    oauth2:
      providers:
        wechat:
          enabled: ${NEBULA_AUTH_WECHAT_ENABLED:false}
          mini:
            app-id: ${NEBULA_AUTH_WECHAT_MINI_APP_ID:}
            app-secret: ${NEBULA_AUTH_WECHAT_MINI_APP_SECRET:}
          web:
            app-id: ${NEBULA_AUTH_WECHAT_WEB_APP_ID:}
            app-secret: ${NEBULA_AUTH_WECHAT_WEB_APP_SECRET:}
            redirect-uri: ${NEBULA_AUTH_WECHAT_WEB_REDIRECT_URI:}
            frontend-callback-uri: ${NEBULA_AUTH_WECHAT_WEB_FRONTEND_CALLBACK_URI:/login/wechat-callback}
```

### 3.4 微信登录运行时开关（系统参数）

用户能否用微信登录，**只**由参数中心的系统参数决定，静态 `nebula.auth.oauth2.providers.wechat.enabled` 不参与运行时判定：

| 参数键 | 说明 |
|---|---|
| `login.oauth2.enabled` | OAuth2 总开关，微信登录要求同时为 true |
| `login.oauth2.provider.wechat.enabled` | 微信登录开关（小程序 + 扫码共用），默认 `false`（`SystemParamDefinitions.java:55-56`） |

该开关可在管理端「高级配置 → 通用配置 → 第三方登录（OAuth2）」运行时切换。

关于静态 `nebula.auth.oauth2.providers.wechat.enabled`（默认 `false`）的真实作用，需要明确三点：

- 它**不控制装配**：`wechatOAuth2ProviderClient` 在 `WechatOAuth2AutoConfiguration.java:68-76` 无条件注册，没有 `@ConditionalOnProperty` 之类的条件；
- 它**只用于启动期的配置完整性自检**：该字段仅被 `WechatOAuth2Properties.validate()`（`WechatOAuth2Properties.java:56-70`）读取，`enabled=false` 时该方法直接返回。设为 `true` 时要求 `mini` / `web` 至少一个渠道配置完整，否则启动失败；已配置完整的渠道还会继续校验其剩余必填项（`mini.access-token-url`、`mini.phone-number-url`、`web.scope`）。设为 `false` 则跳过全部校验，配置错误只会在实际登录时才暴露；
- 它对运行时可用性**没有任何影响**：`isChannelAvailable` / `resolveMini` / `resolveWeb`（`WechatOAuth2ProviderClient.java:99-107`、`:373-391`、`:401-420`）全链路都不读该字段。

因此排查口径要改过来：YAML 的 `providers.wechat.enabled` 不是微信登录可用的前提条件，「必须打开 YAML 开关才能启用微信登录」的说法不成立。回归测试 `WechatOAuth2YamlConfigIndependenceTest` 锁定了这一事实；三层配置的完整关系与判定顺序见 §3.6。

### 3.5 YAML 是「无企业记录时」的默认配置

上面的 `providers.github.*` / `providers.wechat.*` 现在承担**默认配置**的角色：登录凭据的权威来源是企业配置表 `auth_tenant_oauth2_provider`，YAML 在解析不到企业记录时兜底。解析由 `TenantOAuth2ProviderConfigResolver` 完成，Provider Client 再用解析结果覆盖 YAML：

| 场景 | 生效配置 |
|---|---|
| 单租户（`nebula.tenant.enabled=false`）存在默认租户记录且 `enabled=true` | 企业配置（凭据、回调、端点、前端承接页） |
| 单租户存在默认租户记录且 `enabled=false` | 停用，**不回退 YAML**（后果与排查要点见 §3.6） |
| 单租户没有任何记录 | YAML 默认配置，升级行为不变 |
| 多租户当前租户有记录 | 该租户配置，不继承系统租户或其他租户凭据 |
| 多租户当前租户无记录 | 视为未配置即不可用（不回退 YAML） |
| 没有租户上下文（例如多租户下的早期流程） | YAML 默认配置 |

细则：

- 企业记录里留空的授权地址、Token 地址、用户信息地址，运行时回退本文件的 YAML 默认端点；`frontend-callback-uri` 留空时回退 YAML 默认承接页；
- 企业配置的 `frontendCallbackUri` 只接受**站内相对路径**：以 `/` 开头且不是 `//`；`http/https` 绝对地址、`//host/xxx`、`javascript:` 等一律拒绝，这是防开放重定向的唯一防线；
- 判定由 `OAuth2FrontendCallbackUri` 统一裁决（纯计算），保存期与 GitHub / 微信回调 Controller 共用同一规则与同一句消息措辞，避免「保存成功、登录 302 才失败」；
- 运行期解析：企业启用且承接页非空则用企业值；企业未配置或未启用回退 YAML 的 `frontend-callback-uri`；企业值非法**不回退**，直接以 GitHub `19107` / 微信 `19213` 的 Provider 配置缺失码报错，保存期非法值则返回 `19005`；
- YAML 默认承接页不做相对路径强校验：`github.frontend-callback-uri` 类默认值为 `/login/github-callback`，仓库 `application.yml` 为方便本地联调覆盖成 `http://localhost:5173/login/github-callback`，强校验只作用于企业配置值；
- 账号绑定流程的 `frontendRedirect` 优先级最高，不受上述承接页影响；
- 只支持 `github + WEB`、`wechat + WEB`、`wechat + MINI` 三种组合，其他组合保存时返回 `19005`；启用时还会校验凭据完整性，规则见 `docs/spec/12-multitenancy.md` §7.1.3。

相关源码：

- `nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/TenantOAuth2ProviderConfigResolver.java`
- `nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/oauth2/OAuth2FrontendCallbackUri.java`

### 3.6 三层配置的关系与判定顺序

微信登录能否真正生效，由**三层配置共同决定**。三层各自的默认值不同、覆盖关系也不同，很容易得出「配了却没生效」或「没配却生效」的错误判断，因此必须按下面的顺序与兜底规则来读。

| 层级 | 载体 | 关键字段 | 作用 | 默认值 |
|---|---|---|---|---|
| ① 系统参数 | 数据库 `sys_param`（参数中心） | `login.oauth2.enabled`、`login.oauth2.provider.wechat.enabled` | 运行时总门：两者**同时**为 `true` 才继续往下判定，任一为 `false` 直接短路，后面两层配得再全也无效 | `true` / `false`（`SystemParamDefinitions.java:55-56`） |
| ② 企业配置 | 数据库 `auth_tenant_oauth2_provider` | `enabled`、`client_id`、`client_secret_cipher`，以及 `redirect_uri` / `userinfo_url` / `token_url` / `config_json` / `scope` / `authorize_url` / `frontend_callback_uri` | **整渠道覆盖**：命中记录即由该记录接管凭据，不再回退 YAML | 无记录 |
| ③ 应用配置 | `application.yml` 的 `nebula.auth.oauth2.providers.wechat.*` | `mini.app-id` / `mini.app-secret`、`web.app-id` / `web.app-secret`、各端点 URL、`enabled` | 第 ② 层无记录时的凭据兜底；3 个微信端点 URL（jscode2session / access_token / 手机号）**始终**作为默认值，企业记录对应字段为空时逐字段兜底。`wechat.enabled` 只做启动期自检，见 §3.4 | 凭据默认空串；端点有内置默认值；`enabled=false` |

判定顺序（对应 `LoginServiceImpl#getAuthConfig`，`LoginServiceImpl.java:826-844`）：

```text
# 门1、门2：系统参数，永远最先判定
oauth2Enabled = 系统参数("login.oauth2.enabled")
wechatEnabled = 系统参数("login.oauth2.provider.wechat.enabled")

# 门3：provider 装配，恒为 true（无条件注册，见 WechatOAuth2AutoConfiguration.java:68-76）
hasWechatProvider = providerRegistrar.hasProvider("wechat")

if not (oauth2Enabled and wechatEnabled and hasWechatProvider):
    wechatWebEnabled = wechatMiniEnabled = false        # 到此结束，不看第②③层
else:
    for channel in ("web", "mini"):
        # 门4：企业配置解析（TenantOAuth2ProviderConfigResolver.java:36-69）
        settings = TenantOAuth2ProviderConfigResolver.resolve("wechat", channel)
        if settings == null:                            # 仅「单租户无记录」或「无租户上下文」
            settings = 由YAML构造(channel)               # 第③层兜底：凭据与端点都取 YAML
        if settings == null or not settings.isComplete():
            该渠道不可用
        else:                                           # WEB 渠道另要求 redirectUri 非空
            该渠道可用                                  # 企业记录命中的端点空值逐字段回退 YAML
```

`resolve` 的返回值决定走第 ② 层还是第 ③ 层（`TenantOAuth2ProviderConfigResolver.java:48-54`）：

1. 无租户上下文（多租户下的早期流程）→ 返回 `null`，回退 YAML；
2. 单租户无记录 → 返回 `null`，回退 YAML；
3. 多租户当前租户无记录 → 返回停用配置，**不回退** YAML；
4. 有记录但 `enabled != true` → 返回停用配置，**不回退** YAML；
5. 有记录且 `enabled=true`、`client_id` 与 `client_secret_cipher` 齐全 → 用企业记录接管，端点与承接页的空值逐字段回退 YAML。

**运维要点：不要把未启用或不完整的记录留在库里。** 上面列表的第 4 条就是 §3.5 矩阵中「单租户存在记录但 `enabled=false`」的实际后果：该渠道**彻底不可用**，而且**不会回退 YAML**——即使 `application.yml` 里配了完整的 `mini.app-id` / `mini.app-secret`，也不会被使用。一条残缺或未启用的记录会静默覆盖 YAML 配置，症状与「什么都没配」不同（后者在单租户下反而能正常回退）。排查时先确认记录是否存在、是否启用、凭据是否完整，再怀疑 YAML。

两个容易混淆的开关必须区分开：

| 开关 | 载体 | 是否影响运行时 |
|---|---|---|
| `nebula.auth.oauth2.providers.wechat.enabled` | `application.yml` | **不影响**。仅被启动期 `WechatOAuth2Properties.validate()` 读取，`false` 时连自检都跳过 |
| `login.oauth2.provider.wechat.enabled` | 参数中心 `sys_param` | **影响**。必须与 `login.oauth2.enabled` 同时为 `true`，否则微信登录整体关闭 |

最后，企业记录与 YAML 的关系是**整渠道覆盖凭据 + 字段级兜底端点**：

- 一旦命中企业记录，`app-id` / `app-secret`（即 `client_id` / `client_secret_cipher`）**只取企业记录**，不存在「记录里 AppSecret 为空就回退 YAML 的 AppSecret」这种逐字段凭据兜底；凭据不全即该渠道不可用（`OAuth2ProviderSettings.isComplete()`，`OAuth2ProviderSettings.java:22-25`）；
- 端点类字段（`userinfo_url` / `token_url` / `config_json` / `authorize_url` / `scope` / `frontend_callback_uri`）留空时才逐字段回退 YAML 默认值（`WechatOAuth2ProviderClient.java:384-390`、`:412-419`）。

### 3.7 企业配置记录接口的凭据完整性字段

`GET /api/auth/tenant/oauth2-providers` 的响应项新增两个只读字段（`TenantOAuth2ProviderDto.java:26-36`），供「登录与安全」页直接展示「这条记录自己是否可用」：

| 字段 | 类型 | 含义 |
|---|---|---|
| `credentialComplete` | `boolean` | 记录自身是否完整。`false` 表示该记录**凭据不完整或未启用**，在当前配置下该渠道不可用 |
| `missingFields` | `string[]` | 缺失项的中文标签，与保存期校验的报错文案同源（如 `["AppSecret", "授权码换会话地址（jscode2session）"]`）；记录已停用时为 `["未启用"]`；`credentialComplete=true` 时为空数组，不返回 `null` |

判定规则（`TenantOAuth2ProviderServiceImpl.java:178-210`、`:347-349`）：

- 公共前提：`enabled=true` 且 `clientId`、`clientSecretCipher` 均非空；
- `wechat + MINI` 额外要求 `userinfoUrl`（jscode2session）、`tokenUrl`（access_token）、`configJson`（手机号接口）均非空；
- `wechat + WEB` 额外要求 `redirectUri`、`scope` 非空；
- `github + WEB` 额外要求 `redirectUri` 非空。

**它表达的是「记录自身是否完整」，不代表运行时可用性。** 运行时可用性还要叠加 §3.6 的两道系统参数门：记录完整但 `login.oauth2.enabled` 或 `login.oauth2.provider.wechat.enabled` 为 `false` 时，渠道依然不可用。反过来，`credentialComplete=false` 时渠道一定不可用（单租户有记录即不回退 YAML，多租户本就不回退）。因此「登录与安全」页的「凭据状态」列反映的只是记录侧问题：显示「完整」不代表渠道一定可用（还要看两道系统参数门），显示「不可用」则渠道一定不可用。

---

## 4. 动态登录参数（参数中心 `login.*` / `auth.login.*`）

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
| `login.oauth2.enabled` | 是否启用 OAuth2 登录 |
| `login.oauth2.allow-register` | 是否允许 OAuth2 自动注册 |
| `login.oauth2.default-role-id` | **自助注册建号**绑定的默认角色 ID（角色须已存在，否则建号失败）；留空则不绑定角色。键名保留历史前缀 `login.oauth2.`，但作用域是全部自助注册建号，不是只给 OAuth2 用 |
| `login.oauth2.default-org-id` | 自助注册建号绑定的默认组织 ID（组织须已存在，否则建号失败，并以「主组织」写入）；留空则不绑定组织。键名说明同上 |
| `login.oauth2.provider.github.enabled` | 是否启用 GitHub 登录 |
| `login.oauth2.provider.wechat.enabled` | 是否启用微信登录（小程序 + 扫码共用） |

说明：

- 默认角色 / 组织在**同一个创建事务内**同步绑定（不是靠监听建号事件），因为登录在创建用户后会紧接着签发会话，事件却在提交后才派发，届时不绑定就没机会了。绑定收敛在 `UserDefaultRoleOrgBinder`，四个自助注册建号点（OAuth2 自动开通、用户名注册、手机号首次登录建号、邮箱首次登录建号）都会调用；后台「用户管理」建号不受影响（由管理员显式选择角色）。
- 参数是**单一开关**：接上一条，它同时作用于全部自助注册入口。只想给其中一类入口绑角色时用入口开关收窄（`login.username.allow-register` / `login.phone.allow-register` / `login.email.allow-register` / `login.oauth2.allow-register`），本版没有按来源分开的默认角色参数。
- 配了但角色 / 组织不存在时**快速失败**（`ROLE_NOT_FOUND` / `ORG_NOT_FOUND`）并回滚建号，不静默建出无角色账号。

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
- `/api/auth/wechat/mini-login`
- `/api/auth/wechat/web/redirect/prepare`
- `/api/auth/wechat/web/redirect/callback`
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
- 前端承接页只支持站内相对路径：企业侧在「高级配置 → 登录与安全」填写 `/xxx`，绝对地址会被拒绝；YAML `frontend-callback-uri` 仅作为企业未配置时的默认值
- 补齐参数中心中的 `auth.login.*` 动态参数
- 不要同时引入 local 与 remote 两套接入层
