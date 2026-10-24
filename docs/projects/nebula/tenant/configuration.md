# 多租户配置说明

## 1. 配置总览

多租户相关配置分为两组：

- `nebula.tenant.*`：租户开关、域名解析、表/缓存分类；
- `nebula.person.*`：平台账号绑定票据与用户名校验。

```yaml
nebula:
  tenant:
    enabled: true
    strict: true
    header: X-Tenant-Id
    code-header: X-Tenant-Code
    default-tenant-id: "0194f3c8b6b77c0d91a7d9af9c7d0100"
    system-tenant-id: "__system__"
    auth-domain: auth.app.example.com
    base-domains:
      - app.example.com
    reserved-subdomains:
      - www
      - admin
      - auth
      - login
      - static
      - docs
      - status
      - api
      - gateway
    ignore-tables: []
    ignore-caches:
      - authSessionCache
      - bindingTicketCache
      - oauth2LoginStateCache
      - oauth2BindStateCache
      - tenantByDomainCache
  person:
    binding-ticket-ttl-seconds: 600
    username-min-length: 3
    username-max-length: 32
```

## 2. `nebula.tenant.*`

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `false` | 是否启用多租户；关闭时不注册租户过滤器、拦截器和缓存前缀 |
| `strict` | `true` | 启动时校验所有 MyBatis 实体表已分类；未分类直接启动失败 |
| `header` | `X-Tenant-Id` | 内部请求传播的租户 ID 头，仅用于可信内网 |
| `code-header` | `X-Tenant-Code` | 匿名请求选择租户的编码头 |
| `default-tenant-id` | 无 | 默认租户 ID，也是平台管理员操作的租户；涉及默认租户保护 |
| `system-tenant-id` | `__system__` | 系统租户 ID，仅作为新建租户的模板源 |
| `auth-domain` | 无 | 平台账号中心域名，如 `auth.app.example.com` |
| `base-domains` | 空 | 允许的租户基础域列表，用于 Host 子域名解析 |
| `reserved-subdomains` | 内置 9 个 | 保留子域，不能分配给租户 |
| `ignore-tables` | 空 | 额外按全局表处理的表名 |
| `ignore-caches` | 内置列表 | 额外按全局缓存处理的缓存名，不参与租户前缀 |

### 2.1 `enabled`

- `false`：不注册 `TenantContextFilter`、`TenantLineInnerInterceptor`、租户缓存前缀；登录不要求平台账号绑定；行为和原单租户一致。
- `true`：启用完整链路；平台账号层自动启用，租户登录必须完成绑定。

这是部署级开关，不是运行时热切换开关。数据库结构必须先按多租户版本初始化。

### 2.2 `strict`

- `true`：启动时通过 `TenantTableRegistry.validateStrict()` 检查所有已注册实体表；发现未分类表直接抛异常，阻止启动。
- `false`：未分类表按全局表处理并输出 WARN。

生产环境建议保持 `true`，避免新表漏加租户条件导致数据串租户。临时接入历史表时可以用 `ignore-tables` 显式登记为全局表。

### 2.3 `base-domains`

用于判断 Host 是否是租户子域名：

- 只接受**一层**子域名，例如 `acme.app.example.com`；
- `app.example.com` 本身不是租户；
- `a.b.app.example.com` 不是租户；
- 不在列表中的域名不解析为租户。

通常配置一个基础域，配合通配证书 `*.app.example.com`。

### 2.4 `auth-domain`

平台账号中心域名，Web 端用它判断当前是否在平台域。默认保留子域中包含 `auth`，因此该域名不会被解析为租户。

### 2.5 `default-tenant-id`

- 新建租户的模板来自系统租户，平台级配置和平台管理员归属默认租户；
- `PlatformAdminGuard` 要求当前租户等于该值，否则平台管理接口返回 `19014`；
- 默认租户不能暂停、不能删除（`19021`）。

### 2.6 `system-tenant-id`

系统租户只作为模板命名空间：

- 保存组织、角色、管理员账号、菜单/按钮/API 目录、权限、字典、通知模板等模板数据；
- 不分配域名；
- `TenantResolver` 会拒绝把系统租户解析为登录租户；
- 运行时业务查询不会回退到系统租户。

### 2.7 `ignore-tables`

用于把额外的表按全局表处理，不参与自动租户过滤。适用于：

- 确实没有 `tenant_id` 的全局配置表；
- 第三方/框架表；
- 迁移期间的临时表。

不要把租户表误登记到 `ignore-tables`，否则会绕开自动隔离。

### 2.8 `ignore-caches`

默认全局缓存包括：

```text
authSessionCache
bindingTicketCache
oauth2LoginStateCache
oauth2BindStateCache
loginFailCountCache
loginLockCache
phoneVerificationCodeCache
emailVerificationCodeCache
phoneSendTimestampCache
emailSendTimestampCache
forgotPasswordCodeCache
forgotPasswordSendTimestampCache
forgotPasswordChangeTokenCache
tenantByDomainCache
personBindCodeCache
personBindCodeSendTimestampCache
```

这些缓存的 key 本身是高熵一次性值，且读取发生在租户上下文建立之前，必须保持全局命名空间。新增此类缓存时要登记到这里；普通业务缓存不要登记，否则会失去租户隔离。

## 3. `nebula.person.*`

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `binding-ticket-ttl-seconds` | `600` | 绑定票据有效期，单位秒 |
| `username-min-length` | `3` | 平台用户名最小长度 |
| `username-max-length` | `32` | 平台用户名最大长度 |

平台账号层不单独开关，随 `nebula.tenant.enabled=true` 自动启用。

## 4. 初始化数据

初始化 SQL 中包含两个特殊租户：

| 租户 | ID | 编码 | 说明 |
| --- | --- | --- | --- |
| 默认租户 | `0194f3c8b6b77c0d91a7d9af9c7d0100` | `default` | 第一个真实租户，同时是主租户 |
| 系统租户 | `__system__` | `system` | 模板命名空间，不可登录 |

默认租户包含：

- 管理员账号 `admin`；
- `ADMIN` 角色、`ROOT` 组织；
- user-role、user-org 关联；
- 菜单、按钮、API 目录与 `ADMIN` 授权；
- 平台管理员平台账号 `platform_admin`；
- 平台管理员与默认租户管理员的绑定关系；
- provider 目录（GitHub、微信 web/mini）。

系统租户保存同一套模板数据，供新建租户复制。新建租户的模板管理员默认 `admin / 123456`，创建租户时可以通过 `adminUsername` / `adminPassword` / `adminNickname` / `adminEmail` / `adminPhone` 覆盖。

## 5. SQL 文件

| 文件 | 说明 |
| --- | --- |
| `docs/sql/init/mysql/01-init-structure.sql` | MySQL 表结构（含租户字段与新增表） |
| `docs/sql/init/mysql/02-init-data.sql` | MySQL 初始化数据（默认租户、系统租户、平台管理员等） |
| `docs/sql/init/postgresql/01-init-structure.sql` | PostgreSQL 表结构 |
| `docs/sql/init/postgresql/02-init-data.sql` | PostgreSQL 初始化数据 |

多租户改造只修改全量初始化 SQL，不提供 `unreleased` 增量迁移脚本，也不做存量数据回填。已有单租户数据库需要自行导出、清洗、重建。

## 6. 配置与部署建议

- **域名与证书**：准备 `*.app.example.com` 通配证书，`auth` 保留子域同时覆盖；
- **默认租户**：`default-tenant-id` 必须与初始化 SQL 一致，否则平台管理员无法通过校验；
- **网关**：外部请求不要透传 `X-Tenant-Id`；匿名请求只允许 `X-Tenant-Code`；
- **反向代理**：确保 Host 正确传递，且只信任可信代理的 `Host` / `X-Forwarded-Host`；
- **监控**：关注 `TENANT_CONTEXT_MISSING`、租户解析失败、未分类表 WARN、绑定失败率；
- **备份**：删除租户是软删除，但域名会禁用、关联会撤销；恢复需要单独处理。

## 7. 相关文档

- [模块总览](./overview.md)
- [设计与实现](./design-and-implementation.md)
- [使用方式](./usage-guide.md)
- [建表与数据模型](./ddl.md)
