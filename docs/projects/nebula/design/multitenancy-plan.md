# NEBULA 多租户代码执行计划

> 依据：[`docs/spec/12-multitenancy.md`](https://github.com/yunqilee69/nebula/blob/master/docs/spec/12-multitenancy.md)  
> 范围：平台账号、租户子域名、强制绑定、租户级 OAuth、租户隔离、Web/Control/Mobile  
> 约束：**不做存量数据迁移与回填；不实现跨租户切换接口/SSO；超级管理员不提供代登录。**

> 2026-10 重构：控制平面已独立为 `control/` 工程，默认账号改为 `superadmin`；控制平面与数据平面的平台账号均只支持用户名 + 密码登录，`auth_person` 不再保存邮箱/手机号。以下历史步骤中的“平台管理员 / 账号中心 / 邮箱手机号”描述已过时，以 `docs/spec/12-multitenancy.md` 为准。

---

## 0. 执行约束

1. 严格按本计划顺序执行，每一步完成并跑通该步测试后再进入下一步。
2. 不写 TODO/占位实现；没有闭环的功能不合并。
3. 不改动与多租户无关的既有行为；`nebula.tenant.enabled=false` 时保持单租户模式。
4. 只修改全量初始化 SQL，不创建 `docs/sql/unreleased/**` 增量脚本，不写回填作业。
5. 租户登录必须强制平台账号绑定；未绑定不签发租户令牌。
6. 不提供 `POST /api/auth/tenant/switch`、跨租户令牌交换、SSO 一次性 code、父域 person Cookie。
7. 平台管理员不提供代登录/模拟登录接口；排障由租户提供账号密码，平台人员按普通租户用户登录。
8. 所有新增错误码/i18n 中英成对。
9. 新增表必须登记到 `TenantTableRegistry`；未分类表在 `strict=true` 时启动失败。
10. 每一步都补测试；最后跑全量回归。

---

## 1. 现有代码基线

已确认当前代码没有租户实现：

- 无 `TenantContext`、`TenantProperties`、`TenantBaseEntity`、`TenantLineInnerInterceptor`；
- 无 `auth_tenant` / `auth_person` / `auth_person_user`；
- `LoginCommand` 只有 `username/password/captcha/captchaKey`；
- OAuth 凭据来自 `nebula.auth.oauth2.providers.*` YAML；
- 登录策略来自全局 `sys_param`；
- Web 端只存一套 token（`nebula-web.access-token` / `nebula-web.refresh-token`）；
- 没有租户子域解析。

因此可以按目标模型直接落地，不需要兼容旧租户数据。

---

## 2. 阶段 0：基线与测试夹具

### 2.1 建立多租户测试基类

新建：

```text
nebula-auth/nebula-auth-core/src/test/java/cn/cloudomni/nebula/auth/tenant/AbstractTenantTest.java
```

职责：

- 创建 A/B 两个租户、两个子域名；
- 创建 A/B 各自的 `auth_user`、角色、组织；
- 创建两个 `auth_person` 并建立 ACTIVE 关联；
- 提供 `runAsTenant(tenantId, ...)`、`runAsPerson(personId, ...)` 工具；
- 每个测试结束清理数据。

### 2.2 测试数据约定

```text
TENANT_A: code=acme, domain=acme.app.example.com
TENANT_B: code=beta, domain=beta.app.example.com
USER_A:   tenant=A, username=alice
USER_B:   tenant=B, username=alice
PERSON_A: username=alice
PERSON_B: username=alice-b
```

用于验证“同名账号跨租户独立”和“平台用户名全局唯一”。

---

## 3. 阶段 1：基础层

### 3.1 配置类

新建：

```text
nebula-base/nebula-base-common/src/main/java/cn/cloudomni/nebula/common/config/TenantProperties.java
nebula-base/nebula-base-common/src/main/java/cn/cloudomni/nebula/common/config/PersonProperties.java
```

`TenantProperties`：

```java
@Data
@ConfigurationProperties(prefix = "nebula.tenant")
public class TenantProperties {
    private boolean enabled = false;
    private boolean strict = true;
    private String header = "X-Tenant-Id";
    private String codeHeader = "X-Tenant-Code";
    private String defaultTenantId;
    private String systemTenantId;
    private String authDomain;
    private List<String> baseDomains = new ArrayList<>();
    private List<String> reservedSubdomains = new ArrayList<>();
    private List<String> ignoreTables = new ArrayList<>();
    private List<String> ignoreCaches = new ArrayList<>();
}
```

`PersonProperties`：

```java
@Data
@ConfigurationProperties(prefix = "nebula.person")
public class PersonProperties {
    private int bindingTicketTtlSeconds = 600;
    private int usernameMinLength = 3;
    private int usernameMaxLength = 32;
}
```

注册：

- `NebulaCommonAutoConfiguration` 加 `@EnableConfigurationProperties({TenantProperties.class, PersonProperties.class})`；
- 同时加入 `NebulaMybatisConfig`、`NebulaWebAutoConfiguration`、`NebulaCacheAutoConfiguration` 的 `@EnableConfigurationProperties` 列表，避免切片测试加载不到。

### 3.2 `TenantContext`

新建：

```text
nebula-base/nebula-base-common/src/main/java/cn/cloudomni/nebula/common/context/TenantContext.java
nebula-base/nebula-base-common/src/main/java/cn/cloudomni/nebula/common/model/dto/TenantContextDto.java
```

接口：

```java
public final class TenantContext {
    public static void set(String tenantId);
    public static String get();
    public static String requireTenantId();
    public static boolean isIgnored();
    public static <T> T runAs(String tenantId, Supplier<T> action);
    public static void runAs(String tenantId, Runnable action);
    public static <T> T runAsSystem(Supplier<T> action);
    public static <T> T ignore(Supplier<T> action);
    public static void ignoreRun(Runnable action);
    public static void clear();
}
```

- 普通 `ThreadLocal`；
- `runAs` 保存旧值，`finally` 恢复；
- `ignore` 深度计数；
- 不提供 `executeWith(String, Runnable)` 重载，避免 Lambda 歧义；
- `clear()` 只允许过滤器出口调用。

`TenantContextDto`：

```java
public record TenantContextDto(
        String tenantId,
        String tenantCode,
        String tenantName,
        String personId,
        String userId,
        boolean platformAdmin
) {}
```

### 3.3 错误码与 i18n

新建：

```text
nebula-base/nebula-base-common/src/main/java/cn/cloudomni/nebula/common/exception/TenantContextErrorInfo.java
nebula-base/nebula-base-common/src/main/resources/i18n/tenant/messages_zh_CN.properties
nebula-base/nebula-base-common/src/main/resources/i18n/tenant/messages_en_US.properties
```

- `TENANT_CONTEXT_MISSING` → `01030001`；
- 把 `classpath:i18n/tenant/messages` 加入 `NebulaWebProperties` 默认 basename。

auth 侧错误码放在 `nebula-auth-api`：

```text
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/constant/TenantErrorInfo.java
```

按需求文档 6.6 的 19001–19019 实现；`AuthErrorInfo` 保留现有码，不重复占用。

### 3.4 实体基类

新建：

```text
nebula-base/nebula-base-mybatis/src/main/java/cn/cloudomni/nebula/mybatis/entity/TenantBaseEntity.java
nebula-base/nebula-base-mybatis/src/main/java/cn/cloudomni/nebula/mybatis/entity/TenantTreeEntity.java
```

- `TenantBaseEntity extends BaseEntity`，增加 `tenantId`；
- `TenantTreeEntity extends TreeEntity`，增加 `tenantId`；
- `TreeEntity` 改为继承 `TenantBaseEntity`；
- `MenuEntity` 改为 `extends BaseEntity`，把 `name/parentId/sort` 直接声明回自己；
- `OrgEntity` 保持继承 `TenantTreeEntity`。

### 3.5 字段填充

修改：

```text
nebula-base/nebula-base-mybatis/src/main/java/cn/cloudomni/nebula/mybatis/handler/BaseFieldHandler.java
nebula-base/nebula-base-mybatis/src/main/java/cn/cloudomni/nebula/mybatis/config/NebulaMybatisConfig.java
```

- 构造器注入 `TenantProperties`；
- `insertFill`：启用租户且实体有 `tenantId` setter 且为空时，填 `TenantContext.requireTenantId()`；
- 关闭时不填，保持单租户行为；
- 只保留一个 `MetaObjectHandler`。

### 3.6 租户拦截器与表注册表

新建：

```text
nebula-base/nebula-base-mybatis/src/main/java/cn/cloudomni/nebula/mybatis/tenant/TenantTableRegistry.java
nebula-base/nebula-base-mybatis/src/main/java/cn/cloudomni/nebula/mybatis/tenant/NebulaTenantLineHandler.java
```

`TenantTableRegistry`：

- 维护 GLOBAL / TENANT / INHERITED 三类表；
- `isGlobal`、`isTenant`；
- 启动时遍历 `TableInfoHelper`，未分类且 `strict=true` 抛异常并列出表名；
- `QRTZ_*`、`storage_content` 等非实体表在配置中显式登记。

`NebulaTenantLineHandler`：

- `getTenantId()` → `new StringValue(TenantContext.requireTenantId())`；
- `ignoreTable`：忽略栈 → true；全局表 → true；租户表 → false；未分类 → true（启动已校验）；
- `ignoreInsert`：实体已带 `tenant_id` 时不重复追加。

修改 `NebulaMybatisConfig`：

```java
@Bean
@ConditionalOnProperty(prefix = "nebula.tenant", name = "enabled", havingValue = "true")
public TenantLineHandler tenantLineHandler(...) { ... }

@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor(
        ObjectProvider<TenantLineHandler> provider) {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    provider.ifAvailable(h -> interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(h)));
    interceptor.addInnerInterceptor(paginationInterceptor()); // 必须在租户之后
    return interceptor;
}
```

### 3.7 租户解析过滤器

新建（放在 auth-local，因为需要 `TenantResolver`）：

```text
nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/filter/TenantContextFilter.java
```

职责：

- 只处理匿名路径：`/api/frontend/init`、`/api/auth/get-auth-config`、`/api/auth/login`、`/api/auth/register`、`/api/auth/person/login`、`/api/auth/person/register`、OAuth prepare/callback；
- 从 Host 或 `X-Tenant-Code` 解析 `tenantCode`；
- 调用 `TenantResolver` 得到 `tenantId`，校验状态；
- 设置 `TenantContext`；
- `finally TenantContext.clear()`；
- 已认证路径不设置租户，由令牌过滤器设置；
- 解析失败按错误码返回，不回落默认租户（单租户模式除外）；
- 单体模式由 auth-local 过滤器解析；微服务模式由网关注入或各服务自己的过滤器解析，不能依赖 auth-local 过滤器。 

### 3.8 异步 / Feign / 网关

修改：

```text
nebula-base/nebula-base-web/src/main/java/cn/cloudomni/nebula/web/config/NebulaContextTaskExecutor.java
nebula-base/nebula-base-cloud/src/main/java/cn/cloudomni/nebula/cloud/interceptor/UserContextInterceptor.java
nebula-base/nebula-base-cloud/src/main/java/cn/cloudomni/nebula/cloud/filter/UserContextFilter.java
nebula-base/nebula-base-cloud/src/main/java/cn/cloudomni/nebula/cloud/NebulaCloudProperties.java
nebula-gateway/nebula-gateway-service/src/main/resources/application.yml
```

- 异步捕获/恢复 `TenantContext`；
- Feign 传播 `X-Tenant-Id`、`X-Tenant-Code`；
- 网关 `RemoveRequestHeader` 增加 `X-Tenant-Id`、`X-Tenant-Code`；
- `UserContextFilter.restore-enabled` 默认 false；
- 可信内网开启时才恢复租户头。

### 3.9 缓存隔离

修改/新增：

```text
nebula-base/nebula-base-cache/src/main/java/cn/cloudomni/nebula/cache/tenant/TenantAwareCache.java
nebula-base/nebula-base-cache/src/main/java/cn/cloudomni/nebula/cache/DynamicTtlCacheManager.java
nebula-base/nebula-base-cache/src/main/java/cn/cloudomni/nebula/cache/DefaultDynamicCacheService.java
nebula-base/nebula-base-cache/src/main/java/cn/cloudomni/nebula/cache/RedisDynamicTtlCache.java
nebula-base/nebula-base-cache/src/main/java/cn/cloudomni/nebula/cache/NebulaCacheAutoConfiguration.java
```

- `TenantAwareCache` 在 `createCacheKey` 时加 `tenantId::`；
- `clear()` 只清当前租户；
- `DynamicTtlCacheManager` 对非 `ignore-caches` 的缓存返回包装；
- `DefaultDynamicCacheService` 只传原始 key，避免双前缀；
- `RedisDynamicTtlCache` 的 `buildRedisKey` / TTL 元数据 key / pattern 加租户前缀；
- `listEntries` 剥离前缀；
- 全局缓存清单：`authSessionCache`、`personSessionCache`、`bindingTicketCache`、`oauth2LoginStateCache`、`oauth2BindStateCache`、`loginFailCountCache`、`loginLockCache`、验证码/找回密码缓存、`tenantByDomainCache`；
- 租户缓存：参数、字典、通知模板、`authMenuEnabledListCache`、`authUserPermTsCache`、`onlineUserPageCache`、`wechatAccessTokenCache`。

### 3.10 测试

- 无租户上下文查询租户表 → `01030001`；
- 全局表不受影响；
- `runAs/ignore` 嵌套；
- A/B 同 cacheName 同 key 不串；
- 异步子线程继承租户。

---

## 4. 阶段 2：SQL 与初始化数据

> 不做增量迁移；只改全量初始化脚本。

### 4.1 修改结构脚本

```text
docs/sql/init/mysql/01-init-structure.sql
docs/sql/init/postgresql/01-init-structure.sql
nebula-auth/nebula-auth-core/src/main/resources/db/schema/02-auth-login-record-schema-mysql.sql
nebula-auth/nebula-auth-core/src/main/resources/db/schema/02-auth-login-record-schema-pgsql.sql
```

任务：

1. 新增 `auth_tenant`、`auth_tenant_domain`、`auth_person`、`auth_person_user`、`auth_oauth2_provider`、`auth_tenant_oauth2_provider`、`auth_tenant_invitation`。
2. 按需求文档 9.2 给租户表加 `tenant_id`，列顺序 `id, tenant_id, ...`。
3. 重排唯一键，全部以 `tenant_id` 开头。
4. `auth_user` 增加 `employee_no`。
5. `auth_oauth2_account` 增加 `provider_config_id`，唯一键改为 `(tenant_id, provider_config_id, provider_user_id)`。
6. `auth_login_record` 增加 `tenant_id`、`person_id`。
7. `storage_content` 增加 `tenant_id`，唯一键 `(tenant_id, storage_key)`。
8. MySQL/PG 类型一一对应：`TINYINT(1)` ↔ `BOOLEAN/SMALLINT`，`DATETIME` ↔ `TIMESTAMP`，`JSON` ↔ `JSONB`。
9. 空 `email/phone/domain` 写 `NULL`，不写空串。

### 4.2 修改初始化数据

```text
docs/sql/init/mysql/02-init-data.sql
docs/sql/init/postgresql/02-init-data.sql
```

任务：

1. 插入系统租户 `id=__system__`、`code=system` 和默认租户 `id=0194f3c8b6b77c0d91a7d9af9c7d0100`、`code=default`；系统租户只作为平台继承/模板命名空间，不分配域名，不用于登录；默认租户是第一个真实租户。
2. 插入超级管理员 person：
   - `username=superadmin`；
   - `platform_admin=1`；
   - 密码哈希沿用现有管理员密码；
   - `display_name=Super Administrator`。
3. 插入默认租户的 `auth_user` superadmin、`ADMIN`/`SUPERADMIN` 角色、`ROOT` 组织、user-role、user-org。
4. 插入 `auth_person_user` 关联超级管理员与默认租户 superadmin。
5. 插入 provider 目录：`github`、`wechat`（web/mini）。
6. 新增租户设置/成员邀请/OAuth 配置的菜单、按钮、API 种子；默认租户保留固定 ID，系统租户保存完整模板副本（F 前缀 ID）：`ROOT` 组织、`ADMIN` 角色、`admin / 123456` 管理员、user-role/user-org 关联，以及 ADMIN 对全部模板资源的权限。新建租户由 `TenantResourceProvisioner` 整体复制并按新 ID 映射，根组织改名为租户名称；创建请求显式传入的管理员字段覆盖模板值。
7. 平台租户管理放在账号中心，使用独立按钮码/API 码，不放进租户菜单。
8. 现有 `INSERT ... SELECT` 生成 ADMIN 权限的块，确保包含新增租户管理相关资源，但不包含平台租户管理资源。
9. 中文/英文 i18n 不需要 SQL；由 properties 维护。

### 4.3 校验

- 全新 MySQL/PG 初始化脚本可重复执行；
- `auth_user` 唯一键为 `(tenant_id, username)`；
- 每张租户表都有 `tenant_id` 和租户前缀索引；`auth_menu`、`auth_button`、`auth_api` 也按租户隔离；
- 全局表没有 `tenant_id`；
- `TenantTableRegistry` 分类与实际表一致。

---

## 5. 阶段 3：auth 实体、DAO 与登录

### 5.1 实体

新增到 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/model/entity/`：

```text
TenantEntity.java
TenantDomainEntity.java
PersonEntity.java
PersonUserEntity.java
OAuth2ProviderEntity.java
TenantOAuth2ProviderEntity.java
TenantInvitationEntity.java
```

修改现有实体：

- `UserEntity`、`RoleEntity`、`OrgEntity`、`UserRoleEntity`、`UserOrgEntity`、`PermissionEntity`、`DataScopeEntity`、`LoginRecordEntity`、`OAuth2AccountEntity` 改为 `TenantBaseEntity`；
- `UserEntity` 增加 `employeeNo`；
- `OAuth2AccountEntity` 增加 `providerConfigId`。

### 5.2 DAO

新增：

```text
TenantDao.java
TenantDomainDao.java
PersonDao.java
PersonUserDao.java
OAuth2ProviderDao.java
TenantOAuth2ProviderDao.java
TenantInvitationDao.java
```

修改：

```text
UserDao.java
```

- `getOneByUsername` / `getOneByPhone` / `getOneByEmail` 由租户拦截器约束；
- 删除/不再使用跨租户候选查询；
- 增加 `getByTenantIdAndUsername`、`getByTenantIdAndPhone`、`getByTenantIdAndEmail`；
- `UserMapper.xml` 的 `pageWithRoleOrgFilter` 显式加 `u.tenant_id`，JOIN 表也加租户条件；
- 不再 select `u.password`。

`PersonDao`：

- `getByUsername`（全局唯一）；
- `getByEmail`、`getByPhone`；
- `insert` 等。

`PersonUserDao`：

- `getByTenantAndUser(tenantId, userId)`（返回任意状态，用于绑定判定）；
- `getActiveByTenantAndUser(tenantId, userId)`（仅 ACTIVE，用于会话校验）；
- `getActiveByPersonAndTenant(personId, tenantId)`；
- `listByPerson(personId)`；
- `revoke`、`activate`；
- 所有租户侧查询显式 `tenant_id`，平台侧用 `ignore` 或显式条件。

### 5.3 租户解析

新增：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/TenantResolver.java
```

接口：

```java
TenantEntity resolveByHost(String host);
TenantEntity resolveByCode(String code);
TenantEntity requireActive(String tenantId);
TenantEntity requireActiveByCode(String code);
```

规则：

- Host 归一化、后缀匹配 `baseDomains`；
- 排除 `auth` 等保留子域；
- 查 `auth_tenant_domain`，再查 `auth_tenant`；
- 校验 `status=ACTIVE`；
- 结果缓存 `tenantByDomainCache`，TTL 60s；
- 状态变更时主动淘汰。

### 5.4 平台账号服务

新增：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/PersonAccountService.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/PersonAccountServiceImpl.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/PersonSessionService.java
```

`PersonAccountService`：

```java
PersonLoginResult loginByUsername(String username, String password);
PersonLoginResult loginByEmailCode(String email, String code);
PersonLoginResult loginByPhoneCode(String phone, String code);
void sendLoginCode(String type, String identifier);
String register(RegisterPersonCommand command);
void changePassword(...);
void bindEmail(...);
void bindPhone(...);
List<PersonTenantSummary> listTenants(String personId);
List<PersonLinkDto> listLinks(String personId);
void revokeLink(String personId, String linkId);
void logoutAll(String personId);
```

要点：

- username 写入前 `trim` + `toLowerCase`；
- 唯一冲突抛 `19009`；
- 密码使用现有 `PasswordEncoder`；
- 邮箱/手机验证码 key 加 `person:` 前缀，和租户验证码分开；
- 登录失败计数按 person 维度，采用渐进延迟；
- 平台账号禁用抛 `19012`；
- `listTenants` 只返回关联为 ACTIVE 的租户，字段：tenantId/code/subdomain/name/status/logo。

`PersonSessionService`：

- `issue(personId)`：生成随机会话 ID；
- `get(sessionId)`；
- `renew`；
- `revoke`；
- `revokeAll(personId)`；
- 缓存名 `personSessionCache`（全局）；
- Cookie 设置由 local 层 controller 负责。

### 5.5 绑定服务

新增：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/PersonBindingService.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/PersonBindingServiceImpl.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/model/BindingTicket.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/model/BindingCheckResult.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/model/enums/BindingReason.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/model/enums/BindingAction.java
```

```java
public enum BindingReason {
    NO_LINK, LINK_PENDING, LINK_REVOKED
}

public enum BindingAction {
    CREATE_NEW, BIND_EXISTING
}
```

绑定票据：

```java
@Data
public class BindingTicket {
    private String tenantId;
    private String tenantCode;
    private String userId;
    private String loginType;
    private String linkId;            // REVOKED 时用于定位原关联
    private String linkStatus;        // NONE/REVOKED
    private String proposedUsername;
    private String proposedDisplayName;
    private Long createdAt;
}
```

缓存：`bindingTicketCache`，TTL `person.binding-ticket-ttl-seconds`，一次性。票据 key 使用随机值，value 存完整票据；不要用 `tenantId + userId` 作为 key，避免并发登录互相覆盖。票据里的 `linkId`/`linkStatus` 只用于展示，`complete` 时以 `getByTenantAndUser` 的当前结果为准，不能信任客户端回传或票据快照。

**发送绑定验证码：**

```text
POST /api/auth/login/binding/code/send
```

请求体：`bindingTicket`、`channel`（EMAIL/PHONE）、`target`。

- 校验票据存在且未过期，从票据取 `(tenantId, userId)`；
- 规范化 `target`，按邮箱/手机格式校验；
- 按 `ticket + target + IP` 限流，并与平台账号中心的发码限流分开计数；
- 发码用途为 `PERSON_BIND_EMAIL` / `PERSON_BIND_PHONE`，缓存 key 前缀 `person:bind:`；
- 发送前可做唯一性预检，冲突返回 `19019`；响应不返回其他平台账号信息；
- 验证码与票据绑定，不能跨票据使用。

**判定流程：**

```java
BindingCheckResult check(String tenantId, String userId) {
    PersonUserLink link = personUserDao.getByTenantAndUser(tenantId, userId);
    if (link == null) {
        return challenge(BindingReason.NO_LINK, null, false, true);
    }
    if ("PENDING".equals(link.getLinkStatus())) {
        return challenge(BindingReason.LINK_PENDING, link, true, false); // 不签发令牌，也不签发票据
    }
    if ("REVOKED".equals(link.getLinkStatus())) {
        return challenge(BindingReason.LINK_REVOKED, link, false, true);
    }
    if (!"ACTIVE".equals(link.getLinkStatus())) {
        throw new AuthException(TenantErrorInfo.PERSON_BINDING_REQUIRED);
    }
    Person person = personDao.getById(link.getPersonId());
    if (person == null || !"ACTIVE".equals(person.getStatus())) {
        throw new AuthException(TenantErrorInfo.PERSON_DISABLED);
    }
    return BindingCheckResult.bound(person);
}
```

要点：

- `challenge(reason, link, pendingApproval, issueTicket)` 负责组装 `bindingRequired` 响应；只有 `issueTicket=true` 时才写 `bindingTicketCache`；
- 只在 `LoginServiceImpl` 完成租户认证、拿到可信 `(tenantId, userId)` 后调用，不在登录前按用户名/邮箱/手机号查 `auth_person`；
- `personUserDao.getByTenantAndUser` 必须显式带 `tenant_id`、`user_id`，并覆盖 `(tenant_id, user_id)` 唯一键；
- 出现多行按数据异常拒绝并告警，不能取第一条；
- `PENDING` 只返回挑战，不签发令牌、不签发票据、不创建第二条关联；`pendingApproval=true`；
- 挑战中的建议字段从当前租户 `auth_user` 读取，不能来自请求体；
- `ACTIVE` + person 非 ACTIVE 时抛 `19012`，不能退化成重新绑定；
- 绑定挑战响应包含 `bindingRequired`、`bindingReason`、`linkStatus`、`pendingApproval`、`bindingTicket`（`PENDING` 时为空）、`proposedUsername`、`proposedDisplayName`、`email`、`phone`；
- `email`/`phone` 只是 `auth_user` 的预填值，响应中必须带 `emailVerified=false`/`phoneVerified=false` 语义，不能直接写入 person。

**完成绑定：**

```text
POST /api/auth/login/binding/complete
```

请求体：

```java
private String bindingTicket;
private BindingAction action;      // CREATE_NEW 默认 / BIND_EXISTING
private String username;           // CREATE_NEW
private String displayName;
private String password;           // CREATE_NEW
private String loginType;          // BIND_EXISTING: USERNAME/EMAIL/PHONE
private String account;            // BIND_EXISTING 用户名/邮箱/手机号
private String credential;         // BIND_EXISTING 密码或验证码
private String email;              // 可选预填
private String emailCode;          // 可选
private String phone;              // 可选预填
private String phoneCode;          // 可选
```

服务端步骤：

1. 校验 `bindingTicket`（不提前删除），从票据取 `(tenantId, userId)`，忽略请求体里的租户/用户字段；
2. 在 `TenantContext.runAs(tenantId)` 内重新校验 `auth_user.status`、`auth_tenant.status`；
3. 按 `action` 分支：
   - `CREATE_NEW`：校验用户名格式/保留字/长度、`display_name`、平台密码策略；`auth_person.username` 冲突返回 `19009`；邮箱/手机号按下方规则处理；
   - `BIND_EXISTING`：调用平台凭据校验服务验证 `account + credential`，不能用租户密码或租户验证码；通过后校验 `person.status`，同租户 `uk_person_tenant` 冲突返回 `19018`；
4. 写入关联：
   - 无记录 → `INSERT`，默认 ACTIVE；租户要求审批时 PENDING；
   - `REVOKED` → `UPDATE` 原行（`person_id`、`link_status`、`verified_at`、`revoked_at`），条件带 `link_status='REVOKED'`，受影响行数为 0 时回滚并重新判定，不能 `INSERT`；
   - `PENDING` → 拒绝本次创建/改绑，保持 PENDING，返回 `pendingApproval=true`；
   - `ACTIVE` → 已是有效绑定，不能借绑定接口改绑；
5. 完成创建/关联（包括转为 PENDING）后删除票据；事务回滚时保留票据，重复提交靠 `(tenant_id, user_id)` 唯一键和幂等校验兜底；
6. 重新执行 `check(tenantId, userId)`：只有 `bound` 才调用 `DefaultLoginSessionService.issueLoginSession`；PENDING 返回 `pendingApproval=true`，不签发令牌。

**邮箱/手机号处理：**

- 绑定页发码使用独立用途 `PERSON_BIND_EMAIL` / `PERSON_BIND_PHONE`，缓存 key 加 `person:bind:` 前缀，与租户登录/找回验证码隔离；
- 只有验证码校验通过，才写入 `auth_person.email`/`phone` 并置 `email_verified=1`/`phone_verified=1`；
- 写入前做全局唯一性校验，冲突返回 `19019`；
- 未验证或用户跳过时写 `NULL`，不能把 `auth_user` 的预填值直接落到 `auth_person`，避免未验证联系方式占用全局唯一键；
- OAuth 返回的已验证邮箱同样只做预填，仍需用户确认和唯一性校验，且不能触发自动关联。

**明确禁止：**

- 登录前根据用户名/邮箱/手机号查询 `auth_person` 并据此决定流程；
- 因为 `auth_person` 存在同名/同邮箱/同手机号就自动建立关联；
- 用 `auth_user` 的密码或验证码通过 `BIND_EXISTING` 校验；
- `PENDING` 状态签发租户令牌；
- 用 `INSERT` 处理已存在 `(tenant_id, user_id)` 的 `REVOKED` 记录。

### 5.6 登录服务改造

修改：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/LoginServiceImpl.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/DefaultLoginSessionService.java
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/command/LoginCommand.java
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/command/LoginSessionCommand.java
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/dto/LoginResultDto.java
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/dto/UserContextDto.java
```

`LoginCommand` 增加：

```java
private String tenantCode;       // 子域已解析时可为空
private String loginType;        // USERNAME/PHONE/EMAIL
private String phone;
private String email;
private String code;
```

`LoginServiceImpl`：

- 只做租户内登录，不再跨租户查候选；
- 用户名/手机/邮箱登录都先解析租户、设置 `TenantContext`；
- 认证后调用 `PersonBindingService` 检查/触发绑定；认证前不得查询 `auth_person`，也不得按用户名/邮箱/手机号推断平台账号；
- 未绑定（`NO_LINK`/`LINK_PENDING`/`LINK_REVOKED`）返回 `LoginResultDto` 的绑定挑战，不签发 token；
- `LINK_PENDING` 必须带 `pendingApproval=true`，且不能创建第二条关联；
- 已绑定调用 `DefaultLoginSessionService.issueLoginSession`；
- `refreshToken` 校验租户、用户、person 状态；
- `getCurrentUser` 从 `CurrentUserContext` 取租户/person 字段；
- 单租户模式保留原登录方法体；多租户模式不要保留跨租户候选查询等旧分支。

`LoginSessionCommand` 增加 `tenantId`、`personId`。

`DefaultLoginSessionService`：

- 整个签发过程在 `TenantContext.runAs(tenantId)` 内；
- 校验 `auth_user.tenant_id`、用户状态、person 状态、ACTIVE 关联；
- `UserContextDto` 写 `tenantId/tenantCode/tenantName/personId/platformAdmin`；
- `persistSession` 写租户字段；
- `renew` 重新校验租户/用户/关联状态。

### 5.7 认证过滤器

修改：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/security/OpaqueTokenAuthenticationFilter.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/config/SecurityConfig.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/config/AuthProperties.java
```

过滤器顺序：

1. 读取令牌 → 会话；
2. 会话无 `tenantId` → 401；
3. 设置 `TenantContext`（先设置，再做 DB/缓存查询）；
4. 校验租户状态（缓存 60s）；
5. 校验用户状态；
6. 校验 person 状态和 ACTIVE 关联（缓存可短 TTL，关联变更时主动淘汰）；
7. 请求头 `X-Tenant-Id` 只做一致性断言，不一致 403 `19006`；
8. `finally` 清理 `CurrentUserContext`、`TenantContext`。

`AuthProperties.FIXED_EXCLUDED_PATHS` 增加：

```text
/api/auth/person/login
/api/auth/person/register
/api/auth/person/code/send
/api/auth/login/binding/code/send
/api/auth/login/binding/complete
```

### 5.8 Controller / DTO / Converter

修改：

```text
nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/LoginController.java
```

新增：

```text
nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/PersonAccountController.java
nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/TenantSettingsController.java
nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/PlatformTenantController.java
```

DTO：

```text
nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/model/req/PersonLoginReq.java
.../PersonRegisterReq.java
.../CompleteBindingReq.java
.../SendBindingCodeReq.java
.../SendPersonCodeReq.java
.../UpdatePersonProfileReq.java
.../UpdatePersonPasswordReq.java
.../CreateTenantReq.java
.../UpdateTenantReq.java
.../UpdateTenantStatusReq.java
.../UpdateTenantSettingsReq.java
.../UpsertTenantOAuthProviderReq.java
```

Resp：

```text
.../PersonLoginResp.java
.../PersonCurrentResp.java
.../PersonTenantResp.java
.../BindingRequiredResp.java
.../TenantResp.java
.../TenantOAuthProviderResp.java
```

Converter 用 MapStruct，`unmappedTargetPolicy=ERROR` 时同步补映射。

`LoginController` 新增：

```text
POST /api/auth/login
POST /api/auth/login/binding/code/send
POST /api/auth/login/binding/complete
```

`PersonAccountController` 映射需求文档 11.2。

### 5.9 测试

- 租户登录成功/失败；
- 无关联返回 `NO_LINK` 挑战；
- `PENDING` 返回 `LINK_PENDING`，不签发令牌、不签发票据、不新建关联；
- `REVOKED` 返回 `LINK_REVOKED`，重新绑定更新原行而不是插入；
- ACTIVE 关联但 person 禁用返回 `19012`，不能重新绑定绕过；
- 同名 `auth_person` 存在但无本租户关联时不自动关联；
- 登录前不按用户名/邮箱/手机号查询 `auth_person`（匿名接口无此行为）；
- 绑定创建 person；用户名冲突 `19009`；
- 绑定已有平台账号；同租户已关联返回 `19018`；
- 预填邮箱/手机号未验证不落库；验证码通过后置 verified，冲突返回 `19019`；
- 租户密码/租户验证码不能通过 `BIND_EXISTING` 的平台凭据校验；
- 令牌租户不一致 403；
- 用户/租户/person 禁用；
- 同名 A/B 账号互不影响。

---

## 6. 阶段 4：平台账号中心与平台管理员

### 6.1 平台管理员权限

新增：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/PlatformAccessGuard.java
```

```java
public void requirePlatformAdmin() {
    UserContextDto user = CurrentUserContext.getRequired();
    if (!Boolean.TRUE.equals(user.getPlatformAdmin())) {
        throw new BusinessException(TenantErrorInfo.PLATFORM_ADMIN_REQUIRED);
    }
}
```

### 6.2 租户管理服务

新增：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/PlatformTenantService.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/PlatformTenantServiceImpl.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/TenantOnboardingService.java
```

功能：

- 分页/查询租户；
- 创建租户：`code`、子域名、名称、首个管理员邮箱/手机号；
- 修改名称/到期时间/备注；
- 启停租户；
- 管理子域名（保留字、唯一性）；
- 创建 `ROOT` 组织、`ADMIN` 角色、首个 `auth_user`（待激活）；
- 创建邀请；被邀请人接受时创建/关联 person，并激活账号；
- 不复制全局字典/参数；走继承表；
- 所有跨租户操作 `TenantContext.runAs(targetTenantId)` 并审计。

### 6.3 平台管理员排障

不提供代登录/模拟登录接口：

- 不新增 `ImpersonationService`、只读拦截器或 `POST /api/auth/tenants/{id}/impersonate`；
- 平台管理员需要进入租户排查时，由租户提供该租户内的账号和密码，平台人员按普通租户用户登录；
- 租户会话只携带该租户自己的令牌，不存在跨租户令牌或只读标记；
- 平台管理员不能读取用户密码、OAuth secret、会话令牌。

### 6.4 平台账号中心 Web/API

API 已在 5.8 覆盖；Web 页面在阶段 7 实现。

---

## 7. 阶段 5：OAuth2 租户化

### 7.1 SPI 与 resolver

新增：

```text
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/oauth2/OAuth2ProviderSettings.java
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/oauth2/OAuth2ProviderConfigResolver.java
nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/oauth2/OAuth2ProviderConfigRegistry.java
```

`OAuth2ProviderSettings` 字段：

```text
providerId, channel, enabled, clientId, clientSecret,
redirectUri, frontendCallbackUri, callbackAllowlist,
authorizeUrl, tokenUrl, userinfoUrl, scope, extras
```

`OAuth2ProviderConfigResolver.resolve()` 从 `auth_tenant_oauth2_provider` 读取当前租户配置：

- 只读表，不回退 YAML（多租户模式）；
- 单租户模式可回退 YAML；
- 未配置/未启用返回 null 或 `isComplete=false`。

`DefaultOAuth2ProviderConfigRegistry` 放在 auth-core，`@Component`，注入 `List<OAuth2ProviderConfigResolver>`。

### 7.2 Provider 模块改造

GitHub：

```text
nebula-auth/nebula-auth-oauth2-provider-github/src/main/java/cn/cloudomni/nebula/auth/oauth2/github/provider/GitHubOAuth2ProviderClient.java
.../GitHubOAuth2AutoConfiguration.java
.../GitHubOAuth2Properties.java
```

- 删除启动期 `validate()` 强制校验；
- client 每次调用 `resolver.resolve()`；
- `redirectUri`、`frontendCallbackUri` 按租户；
- controller 不再持有固定凭据。

微信：

```text
nebula-auth/nebula-auth-oauth2-provider-wechat/...
```

- web/mini 渠道按租户配置；
- `wechatAccessTokenCache` key 为 `tenantId:appId`；
- 小程序登录按 `appId` 反查租户；多命中拒绝；
- 小程序请求带 `appId`。

### 7.3 state 与回调

修改：

```text
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/OAuth2LoginStateCacheService.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/OAuth2BindStateCacheService.java
nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/OAuth2LoginServiceImpl.java
```

- `StateValue` 增加 `tenantId`、`providerConfigId`、`channel`、`nonce`；
- `loginId` key 用 `tenantId:loginId`；
- 回调先 `claimCallbackState`，设置租户上下文，再兑换 code；
- 租户 A 的 state 不能在 B 兑换；
- 绑定态同样加租户；
- 复用现有 `loginId`/status 领取机制：回调跳转 URL 只带 `loginId`，不带 token；status/claim 接口返回 token 或 `bindingRequired` + 绑定票据；
- 绑定票据不能放 URL，通过 status/claim 响应交给前端。

### 7.4 租户 OAuth 配置 API

新增：

```text
nebula-auth/nebula-auth-core/.../service/TenantOAuth2ProviderService.java
nebula-auth/nebula-auth-core/.../service/impl/TenantOAuth2ProviderServiceImpl.java
nebula-auth/nebula-auth-local/.../controller/TenantOAuth2ProviderController.java
```

规则：

- 租户管理员只能操作当前租户；
- 平台管理员通过 `runAs(targetTenant)` 操作任意租户；
- secret 加密存储，API 不回显；
- 启用前校验完整性和 URL 格式；
- 每次变更审计。

### 7.5 测试

- 租户 A/B 不同 client_id；
- A 的 state 在 B 回调失败；
- 未配置 provider → 19005；
- 小程序 appId 反查；
- secret 不回显。

---

## 8. 阶段 6：业务模块隔离

按模块顺序执行，每个模块完成后补 A/B 交叉测试。

### 8.1 auth

- 角色、组织、用户角色、用户组织、权限、数据范围；
- 登录记录加 `tenant_id`、`person_id`；
- 在线用户按租户过滤；
- 踢出：当前租户；平台管理员不能跨租户踢人。

### 8.2 dict / param

- `sys_dict_type`、`sys_dict_item`、`sys_param` 为继承表；
- 读取：租户优先 → 系统租户兜底；
- 写：当前租户；
- `@Cacheable` 加 `unless = "#result == null"`；
- 系统租户只允许平台代码 `runAsSystem`。

### 8.3 notify

- 模板/分类继承，记录/公告/站内信/推送设备租户级；
- 模板字段/变体跟随租户覆盖；
- 推送设备唯一键 `(tenant_id, device_token)`。

### 8.4 storage

- 表加 `tenant_id`；
- key 前缀 `t/{tenantId}/`；
- `DatabaseStorageBinaryStore` 四条 SQL 全部带 `tenant_id`；
- 秒传/去重只在租户内；
- 签名下载令牌带 `tenantId + storageKey`；
- `storage_content` 租户级。

### 8.5 scheduler

- `scheduler_job`、`scheduler_job_run` 加 `tenant_id`；
- `JobKey/TriggerKey = tenantId:jobCode`；
- `JobDataMap` 带 `tenantId`；
- `NebulaQuartzJob` 设置 `TenantContext`；
- 启动 sync 按默认租户/各租户 reconcile；
- 停用租户暂停 Trigger。

### 8.6 audit

- `audit_record` 加 `tenant_id`、`person_id`；
- 审计记录 `tenant_id`（写入时同时作为 `targetTenantId`）、`person_id`；不存在跨租户操作人；
- 审计查询默认当前租户；平台管理员可按租户筛选。

### 8.7 event

- `NebulaEvent` 增加 `tenantId()`；
- `SerializedNebulaEvent`、`OutboxEventRecord` 增加 `tenantId`；
- relay `ignore` 扫描，逐条 `runAs`；
- 消费幂等键带 `tenant_id`；
- handler 执行前设置租户上下文。

### 8.8 frontend

- `frontend_user_preference` 加 `tenant_id`；
- `/api/frontend/init` 返回租户品牌（名称/logo/主题/登录方式）；
- 缓存管理只展示当前租户；
- `frontend_app_release` 保持全局。

---

## 9. 阶段 7：Web

### 9.1 启动与路由

修改：

```text
web/src/index.tsx
web/src/main.tsx
web/src/route/create-nebula-router.tsx
web/src/route/menu-component-registry.tsx
```

- 读取 `window.location.hostname`；
- `auth.<base>` → 平台账号中心路由；
- 租户子域 → 现有租户应用；
- 租户子域启动调用 `/api/frontend/init`，带 `tenantCode`（从 host 推导）或依赖 Host；
- 平台账号中心不加载租户菜单/权限。

### 9.2 类型与请求

修改：

```text
web/src/types/auth.ts
web/src/api/auth.ts
web/src/request/types.ts
web/src/request/create-request-client.ts
web/src/request/request.ts
web/src/utils/auth/token-session.ts
web/src/stores/auth-store.ts
```

- `LoginResp` 增加 `bindingRequired`、`bindingTicket`、`proposedUsername` 等；
- 新增 `PersonLoginReq/Resp`、`PersonTenant`、`CompleteBindingReq`；
- `RequestClientOptions` 增加 `getTenantCode?: () => string | undefined`；
- 匿名请求可带 `X-Tenant-Code`；已认证只带 `Authorization`；
- 不发送 `X-Tenant-Id`；
- token 存储增加 `tenantId`；
- `auth-store` 增加 `currentTenant`、`tenantSessions`（或至少当前租户）；
- 保留现有组织状态，不把组织复用为租户状态。

### 9.3 页面

新增：

```text
web/src/pages/account/index.tsx
web/src/pages/account/profile.tsx
web/src/pages/account/security.tsx
web/src/pages/account/tenants.tsx
web/src/pages/account/tenant-management/index.tsx
web/src/pages/account/tenant-management/tenant-table.tsx
web/src/pages/account/tenant-management/tenant-form.tsx
web/src/pages/login/binding.tsx
web/src/pages/tenant/settings/oauth-providers.tsx
```

修改：

```text
web/src/pages/login/index.tsx
web/src/pages/register/index.tsx
web/src/layouts/nebula-layout.tsx
web/src/route/menu-component-registry.tsx
web/src/constants/auth-button-codes.ts
web/src/i18n/locales/zh-CN/**
web/src/i18n/locales/en-US/**
web/src/i18n/types.ts
```

功能：

- 登录页处理 `bindingRequired` → 跳绑定页；
- 绑定页：建议 username、display_name、密码、邮箱/手机验证码；
- 账号中心：资料、安全、我的企业、平台管理员租户管理；
- 租户切换菜单：已关联租户列表 + 输入企业码；
- 租户 OAuth 配置页：provider 列表、启用、client_id/secret、回调；
- 切换后清空权限/字典/参数/菜单，重连 SSE。

### 9.4 测试

```text
web/src/pages/login/index.test.tsx
web/src/pages/login/binding.test.tsx
web/src/pages/account/*.test.tsx
web/src/request/create-request-client.test.ts
web/src/stores/auth-store.test.ts
```

覆盖：

- 登录返回 bindingRequired → 绑定 → 保存 token；
- 用户名冲突提示；
- 切换企业导航；
- 平台账号中心渲染；
- 租户 OAuth 配置 secret 不回显。

---

## 10. 阶段 8：Mobile / client-sdk

### 10.1 client-sdk

修改：

```text
packages/client-sdk/types/api.ts
packages/client-sdk/types/index.ts
packages/client-sdk/endpoints.ts
packages/client-sdk/token-session.ts
```

新增：

```text
PersonLoginReq/Resp
BindingRequiredResp
CompleteBindingReq
PersonTenant
TenantSummary
```

端点：

```text
PERSON_LOGIN, PERSON_REGISTER, PERSON_CODE_SEND, PERSON_LOGOUT, PERSON_CURRENT,
PERSON_TENANTS, PERSON_LINKS, TENANT_BINDING_COMPLETE
```

`AuthTokenSession` 增加 `tenantId`，序列化/反序列化同步。

### 10.2 Mobile

修改：

```text
mobile/src/auth/login-service.ts
mobile/src/screens/LoginScreen.tsx
mobile/src/screens/RegisterScreen.tsx
mobile/src/screens/AccountSecurityScreen.tsx
mobile/src/screens/ProfileScreen.tsx
mobile/src/session/session-manager.ts
mobile/src/session/secure-storage.ts
mobile/src/request/client.ts
mobile/src/request/types.ts
mobile/App.tsx
mobile/src/push/push-service.ts
```

新增：

```text
mobile/src/screens/BindingScreen.tsx
mobile/src/screens/PersonAccountScreen.tsx
mobile/src/screens/TenantSwitchScreen.tsx
```

功能：

- 平台登录三种方式；
- 绑定挑战；
- 我的企业；
- 租户登录；
- 多租户 token 存储；
- 切换企业；
- 推送按租户注册/注销；
- 深链/二维码带 `tenantCode`。

### 10.3 测试

```text
mobile/src/auth/login-service.test.ts
mobile/src/session/session-manager.test.ts
packages/client-sdk/test/token-session.test.ts
```

---

## 11. 阶段 9：验证

### 11.1 编译与测试

```bash
mvn -q -pl nebula-base/nebula-base-common,nebula-base/nebula-base-mybatis,nebula-base/nebula-base-cache,nebula-base/nebula-base-web -am test
mvn -q -pl nebula-base/nebula-base-cloud -am test
mvn -q -pl nebula-auth/nebula-auth-api,nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local -am test
mvn -q -pl nebula-auth/nebula-auth-oauth2-provider-github,nebula-auth/nebula-auth-oauth2-provider-wechat -am test
mvn -q -pl nebula-dict/nebula-dict-core,nebula-param/nebula-param-core,nebula-notify/nebula-notify-core -am test
mvn -q -pl nebula-storage/nebula-storage-core,nebula-scheduler/nebula-scheduler-core,nebula-audit/nebula-audit-core -am test
mvn -q -pl nebula-event/nebula-event-core,nebula-event/nebula-event-remote -am test
mvn -q -pl nebula-frontend/nebula-frontend-core,nebula-frontend/nebula-frontend-local -am test
mvn -q -pl nebula-app/nebula-app-runner -am test
cd web && npm run typecheck && npm test
cd ../mobile && npm run typecheck && npm test
cd ../packages/client-sdk && npm run typecheck && npm test
```

### 11.2 手工验收序列

1. 初始化全新数据库（MySQL/PG）。
2. 启动应用，`nebula.tenant.enabled=false` 验证单租户行为不变。
3. 开启 `tenant=true`、`person=true`。
4. 用默认租户 admin 登录 → 触发绑定 → 设置平台账号 → 进入默认租户。
5. 平台账号中心登录 → 查看我的企业。
6. 创建租户 B → 子域名 `beta.app.example.com` → 邀请管理员。
7. 管理员接受邀请 → 首次登录绑定平台账号 → 进入 B。
8. B 管理员配置租户 OAuth → 用 B 的 OAuth 登录。
9. A/B 同名用户分别登录，数据互不可见。
10. 从 A 切换 B：B 有 token 直接进；清 token 后回登录页。
11. 平台管理员排障：使用租户提供的账号密码登录 B，不提供代登录接口。
12. 租户暂停：子域名显示停用页，令牌失效。

### 11.3 安全验收

- 外部伪造 `X-Tenant-Id` 无效；
- 已认证请求头与令牌租户不一致 403；
- 租户 A 的 state 在 B 回调失败；
- 验证码不能跨租户使用；
- A 租户 XSS 不能读取 B 的 token 或 person Cookie；
- 平台管理员不能读取 secret/密码；
- 绑定用户名冲突不覆盖；
- 未绑定用户不能拿到租户令牌。

---

## 12. 阶段 10：上线与回滚

### 12.1 配置

修改：

```text
nebula-app/nebula-app-runner/src/main/resources/application.yml
backend/src/main/resources/application.yml
.env.example
```

增加：

```yaml
nebula:
  tenant:
    enabled: ${NEBULA_TENANT_ENABLED:false}
    strict: true
    base-domains: ${NEBULA_TENANT_BASE_DOMAINS:app.example.com}
    auth-domain: ${NEBULA_TENANT_AUTH_DOMAIN:auth.app.example.com}
    default-tenant-id: ${NEBULA_TENANT_DEFAULT_ID:...}
    system-tenant-id: ${NEBULA_TENANT_SYSTEM_ID:...}
  person:
    binding-ticket-ttl-seconds: 600
```

- 平台账号层不单独开关：`tenant.enabled=true` 时随租户模式自动启用。
- 单租户模式保持旧登录路径，不注册租户拦截器/过滤器。

### 12.2 灰度

- 先内部默认租户；
- 再新租户；
- 观察登录、绑定、OAuth、缓存、异步、调度、存储；

### 12.3 回滚

- 关闭 `nebula.tenant.enabled`；
- 数据模型已带 `tenant_id`，不回滚列；
- 由于不做存量迁移，回滚只适用于新租户/全新库；
- 已有业务数据需数据库快照恢复。

---

## 13. 文件级改动清单

| 文件/模块 | 改动 |
|---|---|
| `docs/spec/12-multitenancy.md` | 本需求设计文档 |
| `NEBULA_多租户改造_PLAN.md` | 本执行计划 |
| `docs/sql/init/mysql/01-init-structure.sql` | 新表、租户列、唯一键 |
| `docs/sql/init/mysql/02-init-data.sql` | 租户/person/管理员/菜单种子 |
| `docs/sql/init/postgresql/01-init-structure.sql` | 同上 |
| `docs/sql/init/postgresql/02-init-data.sql` | 同上 |
| `nebula-auth/nebula-auth-core/src/main/resources/db/schema/02-auth-login-record-schema-*.sql` | `tenant_id`/`person_id` |
| `nebula-base-common/.../config/TenantProperties.java` | 新增 |
| `nebula-base-common/.../config/PersonProperties.java` | 新增 |
| `nebula-base-common/.../context/TenantContext.java` | 新增 |
| `nebula-base-common/.../exception/TenantContextErrorInfo.java` | 新增 |
| `nebula-base-mybatis/.../entity/TenantBaseEntity.java` | 新增 |
| `nebula-base-mybatis/.../entity/TenantTreeEntity.java` | 新增 |
| `nebula-base-mybatis/.../tenant/TenantTableRegistry.java` | 新增 |
| `nebula-base-mybatis/.../tenant/NebulaTenantLineHandler.java` | 新增 |
| `nebula-base-mybatis/.../config/NebulaMybatisConfig.java` | 条件注册拦截器 |
| `nebula-base-mybatis/.../handler/BaseFieldHandler.java` | 填充 tenantId |
| `nebula-base-web/.../config/NebulaContextTaskExecutor.java` | 传播租户 |
| `nebula-base-cache/...` | 租户缓存 |
| `nebula-base-cloud/...` | Feign 传播 |
| `nebula-gateway/nebula-gateway-service/src/main/resources/application.yml` | 剥离租户头 |
| `nebula-auth-api/.../constant/TenantErrorInfo.java` | 新增 |
| `nebula-auth-api/.../model/command/LoginCommand.java` | 租户/登录方式字段 |
| `nebula-auth-api/.../model/dto/UserContextDto.java` | 租户/person 字段 |
| `nebula-auth-core/.../model/entity/*` | 新增/改造 |
| `nebula-auth-core/.../dao/*` | 新增/改造 |
| `nebula-auth-core/.../service/TenantResolver.java` | 新增 |
| `nebula-auth-core/.../service/PersonAccountService.java` | 新增 |
| `nebula-auth-core/.../service/PersonBindingService.java` | 新增 |
| `nebula-auth-core/.../service/impl/LoginServiceImpl.java` | 重写租户登录 |
| `nebula-auth-core/.../service/impl/DefaultLoginSessionService.java` | 租户/person 会话 |
| `nebula-auth-core/.../security/OpaqueTokenAuthenticationFilter.java` | 设置/校验租户 |
| `nebula-auth-core/.../security/ReadOnlyImpersonationInterceptor.java` | 新增 |
| `nebula-auth-core/.../service/ImpersonationService.java` | 新增 |
| `nebula-auth-local/.../controller/LoginController.java` | 绑定接口 |
| `nebula-auth-local/.../controller/PersonAccountController.java` | 新增 |
| `nebula-auth-local/.../controller/TenantSettingsController.java` | 新增 |
| `nebula-auth-local/.../controller/PlatformTenantController.java` | 新增 |
| `nebula-auth-oauth2-provider-github/...` | 租户级 resolver |
| `nebula-auth-oauth2-provider-wechat/...` | 租户级 resolver/小程序 |
| `nebula-dict` / `nebula-param` | 继承表隔离 |
| `nebula-notify` | 租户表/模板 |
| `nebula-storage` | 表/key/JDBC/签名 |
| `nebula-scheduler` | 表/Quartz key |
| `nebula-audit` | 租户/person |
| `nebula-event` | envelope/outbox/consumer |
| `nebula-frontend` | init 品牌/偏好/缓存 |
| `web/src/pages/account/**` | 平台账号中心 |
| `web/src/pages/login/**` | 绑定/登录 |
| `web/src/pages/tenant/settings/oauth-providers.tsx` | 租户 OAuth 配置 |
| `web/src/layouts/nebula-layout.tsx` | 切换企业 |
| `web/src/request/**` | 租户编码/认证头 |
| `web/src/stores/auth-store.ts` | 当前租户 |
| `web/src/utils/auth/token-session.ts` | 租户 token |
| `mobile/src/**` | 平台登录/绑定/切换/推送 |
| `packages/client-sdk/**` | 类型/端点 |
| `nebula-app/nebula-app-runner/src/main/resources/application.yml` | 配置 |
| `backend/src/main/resources/application.yml` | 配置 |

---

## 14. 执行顺序

1. 阶段 0：测试基线。
2. 阶段 1：基础层（TenantContext、实体、拦截器、缓存、异步、网关）。
3. 阶段 2：SQL 与初始化数据。
4. 阶段 3：auth 实体/DAO/租户解析/平台账号/绑定/登录。
5. 阶段 4：平台账号中心 API、平台管理员（不含代登录）。
6. 阶段 5：OAuth2 租户化。
7. 阶段 6：业务模块隔离（auth → dict/param → notify → storage → scheduler → audit → event → frontend）。
8. 阶段 7：Web。
9. 阶段 8：Mobile / client-sdk。
10. 阶段 9：全量验证与安全验收。
11. 阶段 10：配置、灰度、回滚。

每一步完成后只跑该步涉及模块的测试；最后跑全量回归。禁止在功能未闭环时用 TODO/占位实现。
