---
title: 客户端接口面准入（client scope）
date: 2026-10-02 11:00
tags: [nebula, auth, security]
---

# 客户端接口面准入（client scope）

## 1. 它解决什么问题

同一个 nebula 后端要服务多种客户端：内部管理控制台（`web/`）、移动 App、以及将来给外部客户 / 商家用的**受限账号**。

已有的**按钮权限**（`@NebulaPermission`）回答的是「这个操作需要什么权限」，但它有一个结构性局限：**只对加了注解的方法生效**。没有注解的方法它完全不管。因此在补齐注解之前，一个受限账号只要登录进来，就能调用任何没有注解的接口。

client scope 补的是另一层边界——按**请求来源**判定「这一类客户端能碰到哪些接口」，**默认拒绝白名单之外**，不依赖逐接口维护：

| | 回答的问题 | 粒度 | 来源 | 覆盖 |
| --- | --- | --- | --- | --- |
| 按钮权限 `@NebulaPermission` | 这个**操作**要什么权限 | 细，单接口 | 用户角色/权限码 | 只覆盖有注解的方法 |
| 客户端作用域 | 这类**客户端**能到哪 | 粗，整片路径 | 请求来源/账号类型 | 默认拒绝，覆盖面确定 |

两者**互补，新增接口时都要满足**：作用域先判（能不能进这片区域），再判按钮权限（这个操作有没有权限）。

> 规范依据：`docs/spec/09-security.md` §2.3.3。

## 2. 判定链路

`ClientScopeInterceptor` 挂在 `/api/**`，在鉴权之后、控制器之前执行：

1. 调用 `IClientScopeResolver` 责任链（按 `@Order` 升序），**首个返回非 null 的结果生效**；链上无人命中 → 取 `default-scope`（不再硬编码 `INTERNAL`，由 `AuthProperties` 配置决定）。「这个账号算不算客户」是业务知识，框架不猜，留给业务侧实现。
2. 拿作用域名去 `nebula.auth.client-scope.scopes` 查它的 `allow` 路径白名单。**作用域名大小写不敏感**（配置 `customer` 与 `CUSTOMER` 等价，统一大写比较）。
3. 路径命中白名单 → 放行；否则 → 拒绝（`CLIENT_SCOPE_DENIED`，`18003`）。
4. `INTERNAL`（不限制）直接放行。注意：若 `default-scope` 解析出的作用域**未在 `scopes` 中声明**，直接**拒绝**（18003）而不是放行——缺配置按 fail-closed 处理。

判定顺序由 `InterceptorOrders` 固定：**作用域 0 → 按钮权限 100**。顺序不可调换——作用域更粗且默认拒绝，先判才能让被拦的请求报出正确的原因（`18003` 而不是 `18002`）。

## 3. 配置

```yaml
nebula:
  auth:
    client-scope:
      enabled: true                    # 默认 true；关闭时不查作用域、全部放行（快速回退）
      dry-run: false                   # 观察模式：命中拒绝规则只记 WARN 仍放行
      default-scope: INTERNAL          # 未命中/未声明时的默认作用域，默认不限制
      scopes:
        CUSTOMER:                      # 作用域名由业务自定，不限于 CUSTOMER
          allow:
            - /api/client/**
            - /api/auth/current-user
            - /api/auth/refresh
            - /api/auth/logout
            - /api/frontend/init
            - /api/dict/**
            - /api/notify/announcements/current/**
            - /api/notify/site-messages/**
            - /api/notify/preferences/current
            - /api/storage/download
            - /api/storage/files/*
```

配置项（`ClientScopeProperties`，前缀 `nebula.auth.client-scope`）：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 是否启用准入判定 |
| `dry-run` | `false` | 命中拒绝规则只记 WARN 仍放行（灰度） |
| `default-scope` | `INTERNAL` | Resolver 链无人命中时的兜底作用域；若其值未在 `scopes` 中声明则直接拒绝（18003） |
| `scopes.<SCOPE>.allow` | 空列表 | 路径白名单，**空列表表示该作用域不开放任何接口** |

**路径匹配规则与 MVC 一致**（复用 `PathPatternParser`）：无通配符为精确匹配；`/**` 递归（`/api/client/**` 也命中 `/api/client`）；`/*` 只匹配一层；未命中即拒绝。不自己实现匹配算法，是为了不出现「MVC 认为请求打到 A 接口、白名单以为打到 B 接口」的绕过。

## 4. 默认不改变现有行为

这不是「一开就安全」的总开关：

- 框架默认 `DefaultClientScopeResolver` 恒返回 `INTERNAL`。
- `default-scope` 默认 `INTERNAL`（不限制）；`INTERNAL` 代码内短路放行，**无需**在 `scopes` 中声明。作用域名比较大小写不敏感。

因此**只有业务侧显式提供一个 `IClientScopeResolver`、把某类账号判为受限作用域之后，才真正开始拦截**。升级到带该机制的版本不会改变现有部署的行为。

### 4.1 业务侧提供 Resolver

```java
@Component
@Order(0)   // 必须显式声明且 < Ordered.LOWEST_PRECEDENCE
public class CustomerScopeResolver implements IClientScopeResolver {

    @Override
    public String resolveScope() {
        UserContextDto user = CurrentUserContext.get();
        if (user != null && user.getClientType() == ClientType.API) {
            return ClientScopes.CUSTOMER;
        }
        return null;   // 本实现不判定，交给链上后续实现
    }
}
```

调用发生在鉴权之后，实现内可读 `CurrentUserContext`（当前用户，含 `clientType`）与 `RequestContext`（请求头、User-Agent）。

> 除框架默认实现外，业务 Resolver **必须显式声明 `< Ordered.LOWEST_PRECEDENCE` 的 `@Order`**，否则与默认实现同级、判定顺序不确定，可能把受限账号静默放行——该情形在**启动期直接失败**（`CLIENT_SCOPE_CONFIG_INVALID`，`18004`）。

## 5. 失败取态（两种情形相反，禁止互相套用）

| 情形 | 取态 | 理由 |
| --- | --- | --- |
| Resolver 抛异常 / 拦截器内部异常 | **拒绝**（fail-closed） | 安全边界出问题时宁可挡住 |
| Resolver 返回（或 default-scope 兜底出）的作用域未在配置中声明 | **拒绝**（18003）并记 WARN | 未声明的作用域没有白名单可查，无法判定可到哪——放行等于整类接口裸奔 |

> 注意：**通知订阅偏好的失败取态与此相反**（fail-open）。两者理由不同、方向相反，不要当成同一套规则。见 [Notify · 设计与实现](../notify/design-and-implementation)。

## 6. 启动期校验

`ClientScopeWebConfig` 在 `@PostConstruct` 校验整份配置，非法即**启动失败**（`18004`），而不是等某个请求被莫名放行或拒绝：

- `default-scope` 为空，或指向未声明的作用域；
- 作用域名称为空；
- 作用域缺少 `allow`（null 与空列表不同：null 非法，空列表表示拒绝全部）；
- 白名单条目不以 `/` 开头、`**` 未作为最后一段、或整体无法解析。

`enabled=false` 时整份跳过校验——关闭必须是完整的「不生效」，不因历史配置残留而启动失败。

## 7. 灰度上线建议

1. 先 `dry-run: true`：命中拒绝规则只记 WARN、仍放行，观察日志确认真实流量分布。
2. 确认无误拦后切 `dry-run: false` 开始拒绝。
3. 出问题时 `enabled: false` 一键回退（或把 `default-scope` 调回 `INTERNAL`）。

## 8. 错误码

| 错误码 | 名称 | 说明 |
| --- | --- | --- |
| `18002` | `BUTTON_PERMISSION_DENIED` | 缺少按钮操作权限 |
| `18003` | `CLIENT_SCOPE_DENIED` | 当前客户端作用域不允许访问该接口 |
| `18004` | `CLIENT_SCOPE_CONFIG_INVALID` | 客户端作用域配置非法 |

## 9. 接入检查清单

- [ ] 新增**写/管理**接口必须带 `@NebulaPermission`（用该模块的 `*ButtonCodes` 常量），否则任何已登录账号都能调。
- [ ] 新增**面向受限客户端**的接口必须同步该作用域的 `allow` 白名单，否则默认不可达（表现为 `18003`）。
- [ ] **面向当前用户**的接口不加权限码：`/announcements/current/**`、`/site-messages/**`、`/profile*`、`/frontend/preferences/**` 等靠登录态与 `userId` 过滤，加了反而让普通用户看不到自己的消息。
- [ ] 不调整作用域与按钮权限的判定顺序。
