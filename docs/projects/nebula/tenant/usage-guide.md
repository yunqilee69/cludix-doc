# 多租户使用方式

本文说明如何开启多租户、后端与前端如何接入，以及常用接口和错误码。

## 1. 开启步骤

多租户不是运行时热开关，开启前需要先确认数据库结构已经是多租户版本。

1. 使用包含多租户字段的初始化 SQL 重建数据库（见 [建表与数据模型](./ddl.md)）；
2. 配置 `nebula.tenant.enabled=true`；
3. 配置 `nebula.tenant.base-domains`、`auth-domain`、默认租户 ID 与系统租户 ID；
4. 启动应用，确认 `TenantTableRegistry` 启动校验通过；
5. 通过平台管理员账号在默认租户内创建第一个业务租户；
6. Web 端按子域名部署，移动端配置企业代码入口。

最小配置示例：

```yaml
nebula:
  tenant:
    enabled: true
    strict: true
    base-domains:
      - app.example.com
    auth-domain: auth.app.example.com
    default-tenant-id: "0194f3c8b6b77c0d91a7d9af9c7d0100"
    system-tenant-id: "__system__"
  person:
    binding-ticket-ttl-seconds: 600
    username-min-length: 3
    username-max-length: 32
```

完整配置项见 [配置说明](./configuration.md)。

## 2. 后端接入

### 2.1 租户表实体

租户表实体继承 `TenantBaseEntity`：

```java
@TableName("biz_order")
public class OrderEntity extends TenantBaseEntity {
    private String orderNo;
    // ...
}
```

- 查询、更新、删除由 MyBatis 拦截器自动追加 `tenant_id = ?`；
- 插入时 `tenant_id` 自动填充；
- 全局表继续继承 `BaseEntity`。

### 2.2 手写 SQL

拦截器不会改写手写 SQL、注解 SQL 和原生 JDBC，必须显式带租户条件：

```java
@Select("SELECT * FROM biz_order WHERE tenant_id = #{tenantId} AND id = #{id}")
OrderEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
```

### 2.3 跨租户与忽略租户

```java
// 以指定租户身份执行，结束后恢复原上下文
TenantContext.runAs(tenantId, () -> orderDao.list());

// 以系统租户身份执行，仅用于读取模板或平台级数据
TenantContext.runAsSystem(() -> menuDao.list());

// 忽略租户过滤，仅用于全局扫描/运维任务，使用后务必恢复
TenantContext.ignore(() -> outboxDao.listPending());
```

规则：

- `runAs` 会保存并恢复旧值，可以嵌套；
- `ignore` 使用深度计数，适合全局表扫描；
- 无租户上下文访问租户表会抛 `01030001 TENANT_CONTEXT_MISSING`；
- 不要直接把客户端传入的租户 ID 写入 `TenantContext`。

### 2.4 异步、事件与调度

- 使用框架提供的 `NebulaContextTaskExecutor`，它会传播租户、用户和请求上下文；
- 发布领域事件时确保 envelope 带 `tenantId`；消费端由框架恢复租户；
- 定时任务执行前校验租户状态，租户不可用时跳过本次执行；
- 新模块需要在新建租户时初始化模板数据，实现 `TenantDataProvisioner`；
- 租户停用/恢复需要联动资源时，实现 `TenantStatusListener`。

```java
@Component
public class OrderTenantDataProvisioner implements TenantDataProvisioner {

    @Override
    public String module() {
        return "order";
    }

    @Override
    public void provision(String tenantId) {
        // 在目标租户上下文中补齐默认数据，必须幂等
    }
}
```

### 2.5 缓存

- 业务缓存默认按租户隔离，key 自动带 `{tenantId}::` 前缀；
- 会话、票据、OAuth state 等必须在租户上下文建立前读取的缓存，登记到 `nebula.tenant.ignore-caches`；
- 新增全局缓存前先确认其 key 是否已经包含租户信息，避免误隔离或跨租户串数据。

## 3. Web 端接入

### 3.1 识别租户

Web 端按 `window.location.hostname` 判断：

- `auth.<base>`：平台账号相关页面；
- `<tenant>.<base>`：租户应用；
- 非子域名环境可通过 `VITE_TENANT_CODE` 指定企业代码。

请求拦截器在需要时发送 `X-Tenant-Code`：

```ts
headers.set('X-Tenant-Code', tenantCode);
```

已登录请求不要发送 `X-Tenant-Id`；租户由令牌决定。

### 3.2 存储令牌

- 每个租户子域使用自己的 `localStorage` 存令牌；
- 不把令牌写到父域 Cookie，避免跨子域读取；
- 切换企业时导航到目标子域，由目标子域决定是否重新登录。

### 3.3 处理绑定挑战

登录响应满足 `bindingRequired && bindingReason` 时，跳转绑定页并保存挑战信息（建议放 `sessionStorage`，只保存票据与预填资料，不保存密码）：

```ts
if (result.bindingRequired && result.bindingReason) {
  saveBindingChallenge(result);
  navigate('/login/binding');
}
```

绑定页调用：

- `POST /api/auth/login/binding/code/send` 发送平台验证码；
- `POST /api/auth/login/binding/complete` 完成绑定并换取租户令牌。

`pendingApproval=true` 时只展示等待审批，不跳转业务页。

### 3.4 切换企业

使用 `buildTenantUrl` 一类工具拼接目标地址：

```ts
const url = buildTenantUrl({ code: tenant.code });
window.location.assign(url);
```

不调用切换接口，不传令牌。

## 4. 移动端接入

移动端没有子域名，租户来源优先级：

1. 启动参数 / 深链 / 二维码中的 `tenantCode`；
2. 用户上次选择的企业；
3. 构建配置中的默认企业；
4. 登录页手动输入企业代码。

约定：

- 深链只接受显式 `?tenantCode=`，统一转小写；
- 请求头发送 `X-Tenant-Code`；
- 同一时刻只保留一个租户会话；
- 切换企业时先注销当前租户推送，再清理会话并以新企业代码登录；
- 推送设备按租户注册，切换/退出时重注册或注销。

## 5. 常用接口

### 5.1 租户公开接口

```text
GET  /api/frontend/init                    当前租户品牌与启动配置
GET  /api/auth/get-auth-config             当前租户登录方式开关
POST /api/auth/login                       租户登录
POST /api/auth/login/binding/code/send     绑定页发送平台验证码
POST /api/auth/login/binding/complete      完成绑定并签发租户令牌
POST /api/auth/register                    租户内自助注册
POST /api/auth/refresh                     续期当前租户会话
GET  /api/auth/current-user                当前租户用户与权限
POST /api/auth/logout                      退出当前租户
POST /api/auth/invitations/accept          接受成员邀请
```

### 5.2 平台账号自助

```text
GET    /api/auth/account/person                    当前平台账号
PUT    /api/auth/account/person/profile            修改平台资料
PUT    /api/auth/account/person/password           修改平台密码
POST   /api/auth/account/person/code/send          发送联系方式验证码
POST   /api/auth/account/person/email/bind         绑定平台邮箱
POST   /api/auth/account/person/phone/bind         绑定平台手机号
GET    /api/auth/account/person/tenants            我的企业
GET    /api/auth/account/person/links              我的绑定关系
DELETE /api/auth/account/person/links/{id}         解绑
POST   /api/auth/account/person/logout-all         退出所有企业
GET    /api/auth/my/tenants                        当前租户内可切换企业
```

### 5.3 租户设置与 OAuth

```text
GET    /api/auth/tenant/settings                   读取当前租户设置
PUT    /api/auth/tenant/settings                   更新当前租户设置
GET    /api/auth/tenant/oauth2-providers           租户 OAuth 配置列表
POST   /api/auth/tenant/oauth2-providers           新增或更新配置
DELETE /api/auth/tenant/oauth2-providers/{id}      删除配置
```

### 5.4 平台管理

```text
GET    /api/auth/tenants                           分页查询租户
POST   /api/auth/tenants                           创建租户
PUT    /api/auth/tenants/{id}                      更新租户
PUT    /api/auth/tenants/{id}/status               更新租户状态
DELETE /api/auth/tenants/{id}                      删除租户
GET    /api/auth/tenants/{id}/domains              租户域名列表
POST   /api/auth/tenants/{id}/domains              新增租户域名
POST   /api/auth/tenants/{id}/invitations          创建成员邀请
GET    /api/auth/tenants/{id}/invitations          邀请列表
GET    /api/auth/persons                           分页查询平台账号
```

平台管理接口要求当前会话绑定的平台账号是平台管理员，且当前租户是默认租户。

## 6. 错误码

| 码 | 常量 | 含义 |
| --- | --- | --- |
| 01030001 | `TENANT_CONTEXT_MISSING` | 租户上下文未设置 |
| 19001 | `TENANT_REQUIRED` | 未指定租户 |
| 19002 | `TENANT_NOT_FOUND` | 租户不存在 |
| 19003 | `TENANT_DISABLED` | 租户已暂停或过期 |
| 19004 | `TENANT_LOGIN_METHOD_DISABLED` | 当前租户未启用该登录方式 |
| 19005 | `TENANT_OAUTH2_PROVIDER_NOT_CONFIGURED` | 当前租户未配置该 OAuth provider |
| 19006 | `TENANT_MISMATCH` | 令牌租户与请求租户不一致 |
| 19007 | `PERSON_BINDING_REQUIRED` | 需要完成平台账号绑定 |
| 19008 | `BINDING_TICKET_INVALID` | 绑定票据无效或已过期 |
| 19009 | `PERSON_USERNAME_TAKEN` | 平台用户名已存在 |
| 19010 | `PERSON_USERNAME_INVALID` | 平台用户名格式不合法 |
| 19011 | `TENANT_USER_DISABLED` | 租户用户已禁用 |
| 19012 | `PERSON_DISABLED` | 平台账号已禁用 |
| 19013 | `TENANT_INVITATION_INVALID` | 邀请无效或已过期 |
| 19014 | `PLATFORM_ADMIN_REQUIRED` | 仅平台管理员或租户管理员可操作 |
| 19016 | `TENANT_SUBDOMAIN_RESERVED` | 租户子域名保留或不可用 |
| 19018 | `PERSON_ALREADY_BOUND` | 该平台账号已关联本租户的其他用户 |
| 19019 | `PERSON_CONTACT_TAKEN` | 平台账号邮箱或手机号已被占用 |
| 19021 | `DEFAULT_TENANT_PROTECTED` | 默认租户是平台管理入口，不能暂停或删除 |

## 7. 上线检查清单

- [ ] 数据库已按多租户结构初始化，`auth_tenant`、`auth_person`、`auth_person_user` 等表存在
- [ ] 默认租户与系统租户初始化数据正确，默认租户 ID 与配置一致
- [ ] `nebula.tenant.enabled=true` 且 `base-domains` 与证书域名匹配
- [ ] 启动日志中没有未分类表告警，`strict=true` 时启动成功
- [ ] 平台管理员平台账号已绑定默认租户管理员，并且 `platform_admin=1`
- [ ] Web 端 `auth.<base>` 与租户子域都能正确解析
- [ ] 新租户创建后，管理员可以登录并完成平台账号绑定
- [ ] 租户停用后调度任务暂停，恢复后按配置恢复
- [ ] 文件上传、下载、秒传在租户之间不串数据
- [ ] 移动端企业码深链、切换企业、推送注销流程验证通过

## 8. 相关文档

- [模块总览](./overview.md)
- [设计与实现](./design-and-implementation.md)
- [业务功能](./business-capabilities.md)
- [配置说明](./configuration.md)
- [建表与数据模型](./ddl.md)
