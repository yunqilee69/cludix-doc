# Nebula Frontend 模块总览

## 1. 模块定位

`nebula-frontend` 是 Nebula 中台里的前端支撑模块，负责把“前端启动需要哪些平台配置、用户当前使用什么语言和主题、导航布局如何切换、动态缓存怎么可视化治理”统一收口到一个标准模块中。

它适合承载的场景包括：

- 后台前端启动时拉取初始化配置
- 平台级默认主题、默认语言、默认布局配置
- 当前登录用户的主题 / 语言 / 导航布局偏好保存
- 管理后台查看和删除动态缓存项
- 为前端页面提供一套稳定的初始化 DTO 与设置接口

从当前代码可以确认，`nebula-frontend` 不是一个纯静态配置模块，而是一个同时依赖 `auth`、`param` 和 `cache` 的组合型模块：

- 通过 `auth` 模块拿登录页初始化信息
- 通过 `param` 模块读取和持久化平台级前端配置
- 通过 `cache` 模块查看和删除动态缓存项

---

## 2. 模块结构

当前 `nebula-frontend` 按照 Nebula 标准拆成 5 个子模块：

```text
nebula-frontend/
├── nebula-frontend-api      # 契约层：接口、DTO、Command、错误码
├── nebula-frontend-core     # 核心实现：service、dao、entity、配置键
├── nebula-frontend-local    # 本地接入层：Controller + 请求模型
├── nebula-frontend-remote   # 远程接入层：Feign Client + 远程代理实现
└── nebula-frontend-service  # 独立服务启动模块
```

各子模块职责如下：

- `nebula-frontend-api`
  - 放 `IFrontendService`
  - 放前端配置、偏好、主题、缓存视图相关 DTO 和 command
  - 放错误码等稳定契约
- `nebula-frontend-core`
  - 放真正的业务实现，如 `FrontendServiceImpl`
  - 放用户偏好 DAO / Entity
  - 放前端参数键定义与主题、布局校验逻辑
- `nebula-frontend-local`
  - 放 REST Controller
  - 适合单体应用直接接入
- `nebula-frontend-remote`
  - 放 Feign Client 与远程代理实现
  - 适合 frontend 模块独立部署后由其他服务远程消费
- `nebula-frontend-service`
  - 放独立服务启动入口
  - 默认端口 `17785`

---

## 3. 当前已确认的核心能力

根据 `IFrontendService`、`FrontendController` 与 `FrontendServiceImpl`，当前模块对外提供的能力包括：

### 3.1 初始化配置能力

- 获取前端初始化配置 `GET /api/frontend/init`
- 获取前端平台配置 `GET /api/frontend/config`
- 保存前端平台配置 `PUT /api/frontend/config`
- 获取主题目录 `GET /api/frontend/themes`

### 3.2 用户偏好能力

- 切换语言偏好
- 切换主题偏好
- 切换导航布局与侧边栏布局偏好

### 3.3 动态缓存治理能力

- 查看所有动态缓存
- 查看缓存组下每个缓存键的值、类型、TTL 与剩余 TTL
- 删除指定缓存项

因此 `nebula-frontend` 同时承担了两类职责：

1. **给前端页面提供启动配置和偏好设置接口**
2. **给后台管理员提供动态缓存可视化治理入口**

---

## 4. 当前核心数据对象

当前模块围绕两类核心数据组织业务：

### 4.1 平台级前端配置

这部分配置不直接落在 frontend 独立表里，而是通过参数中心读取和维护，当前主要包括：

- `frontend.project-name`
- `frontend.layout-mode`
- `frontend.default-theme-code`
- `frontend.default-locale`
- `frontend.locale-options`

也就是说：

> **前端平台配置的持久化依赖 `nebula-param`，而不是 frontend 模块自己再单独维护一张平台配置表。**

### 4.2 用户级前端偏好

这部分配置落在 `frontend_user_preference` 表中，当前字段包括：

- `userId`
- `localeTag`
- `themeCode`
- `navigationLayoutCode`
- `sidebarLayoutCode`

因此 frontend 模块在设计上明确区分了：

- **平台默认值**：由参数中心维护
- **用户个性化偏好**：由 frontend 自己维护

---

## 5. 当前接口边界

当前本地控制器入口统一挂在：

```text
/api/frontend
```

主要包括以下接口分组：

### 5.1 初始化与配置

- `GET /api/frontend/init`
- `GET /api/frontend/config`
- `PUT /api/frontend/config`
- `GET /api/frontend/themes`

### 5.2 用户偏好

- `PUT /api/frontend/preferences/locale`
- `PUT /api/frontend/preferences/theme`
- `PUT /api/frontend/preferences/layout`

### 5.3 动态缓存管理

- `GET /api/frontend/caches`
- `DELETE /api/frontend/caches/entries`

其中：

- `/init` 负责把前端启动所需的配置一次性拼装好
- `/config` 负责平台级配置读取与保存
- `/preferences/*` 负责当前登录用户个性化设置
- `/caches` 负责后台缓存治理视图

---

## 6. 当前主题与布局边界

从 `FrontendServiceImpl` 可以确认，当前主题和布局的边界是明确收敛的。

### 6.1 当前内置主题

当前内置了两套主题：

- `nebula-light`
- `nebula-graphite`

每套主题当前都带有这些配置项：

- `primaryColor`
- `sidebarColor`
- `headerColor`
- `backgroundColor`
- `textColor`

### 6.2 当前支持的导航布局

- `side-nav`
- `top-nav`
- `mix-nav`

### 6.3 当前支持的侧边栏布局

- `classic-sidebar`
- `double-sidebar`
- `collapsed-sidebar`

### 6.4 当前支持的平台布局模式

- `side`
- `top`
- `mix`

因此当前模块并不是开放任意字符串配置，而是围绕一组受控枚举进行校验，避免前端和后端对主题 / 布局编码理解不一致。

---

## 7. 本地模式与远程模式

`nebula-frontend` 支持两种主要接入方式。

### 7.1 单体 / 本地模式

直接引入 `nebula-frontend-local` 时：

- 当前应用直接暴露 `/api/frontend/*`
- `IFrontendService` 由本地实现提供
- 适合单体项目或 app-starter 直接集成

### 7.2 远程模式

独立部署 `nebula-frontend-service` 后，业务服务只依赖 `nebula-frontend-remote`：

- 当前服务不直接实现 frontend 逻辑
- 通过 remote 层转调远程 frontend 服务
- 适合多个业务系统共享统一前端配置中心的场景

---

## 8. 文档阅读建议

建议按下面顺序阅读：

1. [设计与实现](./design-and-implementation.md)
   - 先理解初始化配置拼装、偏好保存与缓存治理机制
2. [业务功能](./business-capabilities.md)
   - 再理解初始化、主题切换、缓存治理分别解决什么问题
3. [接口信息](./api-reference.md)
   - 然后查看具体 API 形态
4. [使用方式](./usage-guide.md)
   - 最后看如何在单体、独立服务和前端页面中接入
5. [建表语句](./ddl.md)
   - 若要真正落库，再查看偏好表结构

---

## 9. 推荐阅读源码入口

如果你要继续深入源码，建议优先阅读这些文件：

- `nebula-frontend/nebula-frontend-api/src/main/java/com/cludix/nebula/frontend/service/IFrontendService.java`
- `nebula-frontend/nebula-frontend-local/src/main/java/com/cludix/nebula/frontend/controller/FrontendController.java`
- `nebula-frontend/nebula-frontend-core/src/main/java/com/cludix/nebula/frontend/service/impl/FrontendServiceImpl.java`
- `nebula-frontend/nebula-frontend-core/src/main/java/com/cludix/nebula/frontend/model/entity/FrontendUserPreferenceEntity.java`
- `nebula-frontend/nebula-frontend-core/src/main/java/com/cludix/nebula/frontend/config/FrontendParamKeys.java`
- `nebula-frontend/nebula-frontend-service/src/main/resources/application.yml`
- `nebula-frontend/nebula-frontend-service/src/test/resources/db/test/frontend-schema-h2.sql`
