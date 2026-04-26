# Nebula Frontend 使用方式

## 1. 接入方式总览

`nebula-frontend` 支持两种主要接入方式：

- 单体模式：业务应用直接引入 `nebula-frontend-local`
- 微服务模式：独立部署 `nebula-frontend-service`，业务应用引入 `nebula-frontend-remote`

无论哪种方式，业务代码最好都面向 `IFrontendService` 及其 command/dto 契约编程。

---

## 2. 单体应用接入

### 2.1 Maven 依赖

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-frontend-local</artifactId>
</dependency>
```

### 2.2 适合场景

适用于：

- 单体后台系统
- 已经使用 `nebula-app-starter` 的场景
- 前端初始化与缓存治理能力直接随主应用一起运行

### 2.3 运行方式

此时：

- `FrontendController` 直接对外提供接口
- `IFrontendService` 由 `FrontendServiceImpl` 本地实现
- 前端配置、用户偏好和缓存治理都在当前应用中处理

---

## 3. 独立前端支撑服务接入

### 3.1 启动独立服务

```bash
mvn spring-boot:run -pl nebula-frontend/nebula-frontend-service
```

### 3.2 当前服务配置

从 `nebula-frontend-service/src/main/resources/application.yml` 可确认：

- 默认端口：`17785`
- `nebula.frontend.mode=local`
- `nebula.architecture.mode=remote`
- `nebula.auth.mode=remote`
- `nebula.param.mode=remote`

这说明独立 frontend 服务本身虽然暴露本地实现接口，但它对 auth 和 param 的依赖采用远程消费方式。

### 3.3 消费方依赖

业务服务作为消费者时，应引入：

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-frontend-remote</artifactId>
</dependency>
```

### 3.4 remote 配置示例

```yaml
nebula:
  frontend:
    mode: remote
    remote:
      service-name: nebula-frontend-service
      service-url: http://localhost:17785
```

### 3.5 适合场景

适用于：

- 多个业务系统共享同一套前端配置中心
- 平台希望把初始化配置、主题和缓存治理能力集中治理
- 前端配置和用户偏好希望独立收口成专项服务

---

## 4. 模块依赖说明

frontend 模块当前不是孤立模块，而是依赖多个基础模块和业务模块协作。

### 4.1 依赖 auth 模块

当前用于：

- 获取登录页初始化配置

这意味着：

- `/api/frontend/init` 并不是只返回 frontend 自己的配置
- 它还会把认证模块中的登录配置一起拼装给前端

### 4.2 依赖 param 模块

当前用于：

- 读取平台级前端配置
- 保存项目名称、默认主题、默认语言等默认配置

这意味着平台级前端配置并不落在 frontend 自己的表里，而是统一进入参数中心治理。

### 4.3 依赖 cache 模块

当前用于：

- 获取动态缓存名称
- 获取缓存项详情
- 删除缓存项

这意味着 frontend 模块还承担了后台缓存治理入口的职责。

---

## 5. 业务侧如何使用

## 5.1 前端启动初始化

推荐流程：

1. 前端应用启动时调用 `/api/frontend/init`
2. 把返回的 `frontendConfig` 初始化到全局配置
3. 把 `loginConfig` 用于登录页渲染
4. 把 `defaultPreference` 初始化到用户界面状态
5. 把 `defaultTheme` 应用到样式系统

适合场景：

- 管理后台首次加载
- 登录成功后重新初始化前端状态
- SPA 应用刷新页面后恢复平台默认配置

### 5.2 平台设置页

推荐流程：

1. 页面进入时调用 `GET /api/frontend/config`
2. 回显项目名称、默认布局、默认主题、默认语言和语言集合
3. 用户修改后调用 `PUT /api/frontend/config`
4. 保存成功后刷新配置回显或通知前端状态同步更新

适合场景：

- 平台管理员维护默认配置
- 多环境之间统一前端默认行为

### 5.3 用户偏好设置页

推荐流程：

1. 用户在页面中选择语言、主题或布局
2. 前端分别调用 `/preferences/locale`、`/preferences/theme`、`/preferences/layout`
3. 使用返回的偏好 DTO 更新本地状态
4. 下次登录后由后端继续返回已保存的偏好信息

适合场景：

- 用户个性化工作台体验
- 多语言界面切换
- 主题切换和布局切换

### 5.4 缓存治理页

推荐流程：

1. 页面进入时调用 `GET /api/frontend/caches`
2. 按 `cacheName` 展示缓存分组
3. 列表页展示每条 `cacheKey`、`cacheValueJson` 和 `remainingTtlSeconds`
4. 删除按钮调用 `DELETE /api/frontend/caches/entries`
5. 删除成功后重新加载缓存列表

适合场景：

- 后台调试和运维排查
- 精确删除某条缓存后触发重新生成

---

## 6. 前端页面落地建议

### 6.1 初始化层

建议把 `/api/frontend/init` 的结果拆成几个前端状态块：

- 平台配置 store
- 登录配置 store
- 默认偏好 store
- 当前主题 store

这样更容易让页面、登录模块和布局模块各自消费对应的数据。

### 6.2 设置层

建议把平台设置和个人设置区分成两类页面：

1. **平台前端配置页**
   - 面向管理员
   - 维护平台默认值
2. **个人偏好设置页**
   - 面向当前登录用户
   - 维护个人语言、主题和布局偏好

这样可以避免：

- 用户误以为修改的是全局配置
- 管理员配置和个人偏好混在一起导致理解混乱

### 6.3 缓存治理层

建议页面分成两层：

1. 缓存分组列表
   - 显示 `cacheName`、默认 TTL、条目数
2. 缓存条目表格
   - 显示 `cacheKey`、`cacheValueJson`、TTL 和剩余 TTL

这样既能快速扫视全局缓存，又能深入查看单条 entry。

---

## 7. 主题与布局落地建议

### 7.1 前端侧编码要与后端保持一致

当前后端认可的编码包括：

- 主题：`nebula-light`、`nebula-graphite`
- 布局模式：`side`、`top`、`mix`
- 导航布局：`side-nav`、`top-nav`、`mix-nav`
- 侧边栏布局：`classic-sidebar`、`double-sidebar`、`collapsed-sidebar`

前端实现时，建议直接使用这些稳定编码，避免多做一层不必要的映射。

### 7.2 默认值与用户值分开处理

建议：

- 页面初始渲染先使用 `defaultPreference`
- 用户一旦切换偏好，就使用 `/preferences/*` 返回值覆盖

这样用户体验更稳定，也更符合当前后端设计。

---

## 8. 常见落地建议

### 8.1 不要把 frontend 模块当成纯静态配置接口

因为它当前已经承担：

- 启动初始化聚合
- 用户偏好持久化
- 动态缓存治理

所以更准确的理解应该是“前端支撑中心”，而不是“给前端吐几个常量的接口”。

### 8.2 平台默认配置适合沉淀到参数中心

如果后续还要新增更多平台级前端设置，建议继续沿用当前模式：

- 用稳定参数键定义配置项
- 通过 frontend 模块统一维护和暴露给前端

这样可以避免重复造一张配置总表。

### 8.3 缓存治理动作应当精确化

当前接口更适合：

- 定位问题后精确删某条缓存
- 让下一次访问重新生成目标缓存

不建议把它设计成“后台一键清空全部缓存”的工具，以免治理动作过重。

---

## 9. 小结

frontend 模块的最佳使用方式可以概括为：

1. **前端启动时优先使用 `/api/frontend/init` 一次拿齐初始化配置**
2. **平台级默认配置通过 `/config` 系列接口统一维护**
3. **用户个性化体验通过 `/preferences/*` 系列接口持续保存**
4. **动态缓存治理通过 `/caches` 系列接口构建后台可视化工具**

这样既能降低前端初始化复杂度，也能让平台配置、用户偏好和后台缓存治理逐步统一到一套稳定模块中。
