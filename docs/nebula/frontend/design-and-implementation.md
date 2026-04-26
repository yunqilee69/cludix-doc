# Nebula Frontend 设计与实现

## 1. 设计目标

`nebula-frontend` 解决的不是单一“给前端返回一份配置”这么简单的问题，而是要同时解决下面几类系统级需求：

- 前端启动时需要哪些平台配置
- 登录页初始化配置如何与认证模块对齐
- 用户切换语言、主题和布局后如何持久化偏好
- 平台级默认值如何与用户个性化偏好区分
- 动态缓存如何可视化展示并支持精确删除
- 单体与微服务模式下如何复用同一套前端契约

因此它的设计是“**参数中心承载平台默认配置 + 独立表承载用户偏好 + 动态缓存治理视图 + local/remote 可切换接入方式**”的组合。

---

## 2. 分层结构

### 2.1 `nebula-frontend-api`

这一层定义稳定契约，主要包括：

- `IFrontendService`
- `FrontendInitDto`
- `FrontendConfigDto`
- `FrontendPreferenceDto`
- `FrontendThemeCatalogDto`
- `FrontendCacheDto` / `FrontendCacheEntryDto`
- `SaveFrontendConfigCommand`
- `SwitchFrontendLocaleCommand` / `SwitchFrontendThemeCommand` / `SwitchFrontendLayoutCommand`
- `FrontendErrorInfo`

它的意义是让前端页面、local 层和 remote 层围绕同一套初始化与设置契约协作。

### 2.2 `nebula-frontend-core`

核心实现层主要承载：

- 前端初始化配置拼装
- 平台级前端配置读取与保存
- 用户偏好读写
- 主题、语言、布局合法性校验
- 动态缓存查询与删除

### 2.3 `nebula-frontend-local`

这一层负责把前端支撑能力暴露成 HTTP 接口。

设计上，Controller 只做三件事：

- 接收请求参数
- 把 req 转成 command
- 调用 service 并返回 dto

这样接口层比较薄，核心逻辑集中在 service 中，便于 local / remote 共用同一套语义。

### 2.4 `nebula-frontend-remote`

这一层提供远程代理实现，适用于 frontend 独立部署时的服务消费方。

它的价值在于：

- 业务系统仍然可以面向 `IFrontendService` 编程
- 调用方不需要自己拼接 HTTP 请求
- 切换本地和远程部署时，前端支撑逻辑的调用方式保持稳定

### 2.5 `nebula-frontend-service`

这一层是独立前端支撑服务入口。

它的职责不是新增业务逻辑，而是把 local + core 组合成可独立部署的 frontend 服务。

---

## 3. 平台配置与用户偏好的双层模型

frontend 模块当前最核心的设计，不是把所有前端配置都塞到一张表，而是区分成两层。

### 3.1 平台级默认配置

这类配置通过参数中心维护，当前主要包括：

- `frontend.project-name`
- `frontend.layout-mode`
- `frontend.default-theme-code`
- `frontend.default-locale`
- `frontend.locale-options`

其特点是：

- 面向整个平台生效
- 属于“默认值”或“平台级设置”
- 由 `ISystemParamService` 统一读取和写入

### 3.2 用户级个性化偏好

这类配置存储在 `frontend_user_preference` 表中，当前主要包括：

- `localeTag`
- `themeCode`
- `navigationLayoutCode`
- `sidebarLayoutCode`

其特点是：

- 面向当前登录用户生效
- 是对平台默认值的个性化覆盖
- 当用户未设置时，会回退到平台默认值

因此 frontend 模块的核心设计可以概括为：

> **平台配置决定默认长什么样，用户偏好决定“我自己现在想怎么用”。**

---

## 4. 初始化配置拼装设计

`FrontendServiceImpl#getInit` 是模块的核心入口之一。

### 4.1 当前拼装内容

返回的 `FrontendInitDto` 当前至少包含：

- `frontendConfig`：平台级前端配置
- `loginConfig`：认证模块返回的登录初始化配置
- `defaultPreference`：系统默认偏好
- `defaultTheme`：默认主题的完整定义

### 4.2 拼装流程

核心流程可以概括为：

1. 先调用 `getFrontendConfig()` 读取平台配置
2. 调用 `loginService.getAuthConfig()` 读取登录页配置
3. 构建默认偏好 DTO
4. 根据默认主题编码，从内置主题列表中查找默认主题
5. 返回组合后的初始化对象

这说明 frontend 模块不是只维护自己的配置，还承担了“把前端启动所需多源信息一次性聚合给前端”的职责。

### 4.3 设计价值

这样设计的好处是：

- 前端启动时减少多次请求拼装成本
- 平台配置和登录配置在同一个初始化对象里统一返回
- 前端页面对默认主题和默认偏好不需要自己再额外推导

---

## 5. 主题、语言和布局设计

### 5.1 主题设计

当前主题不是用户自定义任意结构，而是围绕受控内置主题构建：

- `nebula-light`
- `nebula-graphite`

每套主题当前都包含这些配置项：

- `primaryColor`
- `sidebarColor`
- `headerColor`
- `backgroundColor`
- `textColor`

服务层通过 `requireTheme(themeCode)` 校验主题编码是否存在，因此主题切换不是任意字符串写入，而是严格限定在已知主题集合内。

### 5.2 语言设计

语言相关当前包括：

- 默认语言 `defaultLocale`
- 可选语言集合 `localeOptions`
- 用户当前语言偏好 `localeTag`

其中有几个关键点：

- 语言标签会通过 `Locale.forLanguageTag(...)` 做规范化
- 默认语言必须包含在可选语言集合内
- 如果读取到的默认语言不在可选集合中，系统会自动补进集合

这保证了平台配置不会出现“默认值不在候选项里”的不一致状态。

### 5.3 布局设计

当前布局分为两层：

1. 平台布局模式：`side / top / mix`
2. 用户个性化布局偏好：
   - 导航布局：`side-nav / top-nav / mix-nav`
   - 侧边栏布局：`classic-sidebar / double-sidebar / collapsed-sidebar`

这种拆分说明：

- 平台可以定义整体布局模式边界
- 用户可以在允许范围内切换自己的导航和侧边栏展示风格

---

## 6. 用户偏好保存设计

### 6.1 获取或创建偏好实体

当前切换语言、主题、布局时，都会先调用：

- `getOrCreatePreference(CurrentUserContext.requireUserId())`

它的含义是：

- 如果当前用户已有偏好记录，就直接更新
- 如果没有，则创建一条新的偏好记录

### 6.2 持久化策略

偏好保存时，当前采用：

- 有 `id` 就 `updateById`
- 无 `id` 就 `save`

这样既支持首次设置，也支持后续反复修改。

### 6.3 回退逻辑

`toPreferenceDto(...)` 在返回偏好时会进行默认值回退：

- 用户没设置语言 -> 回退到平台默认语言
- 用户没设置主题 -> 回退到平台默认主题
- 用户没设置导航布局 -> 回退到默认导航布局
- 用户没设置侧边栏布局 -> 回退到默认侧边栏布局

这使前端即使在“用户从未设置过偏好”的情况下，也能得到完整可用的偏好对象。

---

## 7. 平台配置保存设计

### 7.1 保存入口

`saveFrontendConfig(SaveFrontendConfigCommand command)` 当前负责维护平台级配置。

### 7.2 保存流程

核心流程可以概括为：

1. 规范化并校验 `localeOptions`
2. 规范化并校验 `defaultLocale`
3. 校验 `defaultLocale` 必须出现在 `localeOptions` 中
4. 校验 `layoutMode`
5. 校验 `defaultThemeCode`
6. 调用 `saveStringParam(...)` 分别写入参数中心

也就是说，frontend 模块并没有自己维护一张平台配置表，而是把这些平台默认项拆成多个稳定参数键写入 `nebula-param`。

### 7.3 设计价值

这样设计的好处是：

- 平台级配置统一纳入参数中心治理
- 不需要再额外设计一张 frontend 配置主表
- 其他模块如果需要，也可以直接按参数键读取这些前端平台配置

---

## 8. 动态缓存治理设计

frontend 模块当前还承担了一项很实用的后台治理能力：

- 动态缓存查看与删除

### 8.1 缓存列表

`listCaches()` 当前会：

1. 从 `DynamicCacheService` 获取所有缓存名称
2. 读取每个缓存的默认 TTL
3. 读取每个缓存下的所有 entry
4. 把缓存值序列化为 JSON
5. 返回 `FrontendCacheDto`

因此前端拿到的不只是“有哪些缓存”，还包括：

- 每个缓存组当前有多少条数据
- 每条缓存键的值长什么样
- 原始 TTL 是多少
- 剩余 TTL 还剩多少
- 缓存值对应的 Java 类型是什么

### 8.2 缓存删除

`deleteCache(cacheName, cacheKey)` 当前会先校验：

- `cacheName` 不能为空
- `cacheKey` 不能为空
- `cacheName` 必须存在于已注册缓存列表中

通过校验后才调用：

- `dynamicCacheService.evict(cacheName, cacheKey)`

这种设计避免了：

- 用户误传缓存名称时误删未知数据
- 用空 key 或空 cacheName 触发不明确行为

### 8.3 设计价值

这样设计的价值在于：

- 把动态缓存治理入口放到后台可视化页面
- 管理员不需要直接连 Redis 或本地缓存调试
- 可以更安全地做精确缓存失效，而不是粗暴清库

---

## 9. 错误码与治理策略

从 `FrontendErrorInfo` 可确认，当前主要错误包括：

- 主题不存在
- 语言配置不合法
- 布局模式不合法
- 缓存名称不合法
- 缓存键不合法
- 导航布局编码不合法
- 侧边菜单布局编码不合法

这类错误设计反映出 frontend 模块最关心的两个问题：

1. **前端配置值必须落在受控集合内**
2. **缓存治理动作必须精确且安全**

因此它的重点不是复杂权限编排，而是让前端平台配置和后台缓存治理保持稳定、一致、可控。

---

## 10. 本地 / 远程模式切换设计

从配置和模块守卫可以确认，frontend 模块明确支持两类运行方式。

### 10.1 local

- Controller 在当前应用中直接生效
- Service 使用本地实现
- 适合单体应用或前端支撑能力不拆分的场景

### 10.2 remote

- 当前应用只依赖 remote 代理
- 通过 `service-name` 或 `service-url` 访问独立 frontend 服务
- 适合多个业务系统共享一套前端支撑中心

这种设计的价值在于：

> **业务侧依旧围绕同一套 frontend service 和 DTO 契约编程，而不是随着部署方式切换重写前端配置调用逻辑。**

---

## 11. 小结

Nebula Frontend 的实现可以概括为下面几条：

1. **平台级配置由参数中心维护，用户级偏好由独立偏好表维护**
2. **初始化接口会把平台配置、登录配置、默认偏好和默认主题一次性拼装给前端**
3. **主题、语言和布局都围绕受控枚举进行校验，而不是自由输入**
4. **用户偏好保存采用“有则更新、无则创建”的轻量模型**
5. **动态缓存查看和精确删除能力被直接收口到 frontend 模块中**
6. **与 auth、param、cache 三个模块协作后，frontend 成为真正的前端支撑中心，而不只是一个配置壳子**

这套设计使 frontend 模块既能服务于后台前端启动初始化，也能覆盖设置页、主题切换、语言切换和缓存治理等更完整的业务场景。
