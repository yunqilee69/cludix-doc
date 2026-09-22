---
title: 快速开始
date: 2026-09-20
---

# 快速开始

用 `nebula-template` 模板工程起一套完整可用的 Nebula 应用：后端中台能力 + 开箱即用的管理端。

## nebula-template 是什么

`nebula-template` 是 [nebula](https://github.com/yunqilee69/nebula) 主仓 CI 从 `web/` 与 `backend/` 目录自动同步生成的前后端完整模板，fork 后即可开始写业务：

| 目录 | 内容 |
| --- | --- |
| `backend/` | 基于 `cn.cloudomni:nebula-app-starter` 的最小可运行 Spring Boot 工程，一个依赖即获得认证（用户/角色/组织/菜单/权限/OAuth2）、数据字典、系统参数、通知、文件存储、审计、任务调度、前端配置能力 |
| `web/` | React 18 + Ant Design 6 + React Router 7 + Vite + Tailwind CSS 4 的管理端 |
| `docs/spec/` | 开发规范：架构、分层、命名、数据库、接口、异常、日志、安全、配置 |
| `docs/sql/` | 数据库全量初始化与版本增量升级脚本（MySQL / PostgreSQL） |
| `.agents/skills/` | AI 辅助开发技能：模块指引、特性分析、特性规格、规范约束 |

模板仓走 **fork + 合并上游** 的工作流：业务代码写在应用层，框架骨架保持整洁，升级时合并上游即可持续吸收改动。

> 模板仓由主仓自动同步生成，**不要直接向模板仓提交 PR**——改动提到 nebula 主仓，同步会带过来。

## 前置要求

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| JDK | 21 | 后端运行 |
| Maven | 3.9+ | 后端构建 |
| Node.js / pnpm | 22 / 10 | 前端构建与开发 |
| Docker | 较新版本即可 | 本机拉起 MySQL 8 + Redis 7 |

## 第一步：Fork 并克隆

1. 打开 `https://github.com/yunqilee69/nebula-template`，点击 **Fork**，得到自己的仓库；
2. 克隆到本地：

```bash
git clone git@github.com:<your-account>/nebula-template.git
cd nebula-template
```

## 第二步：启动后端

```bash
cd backend

# 1. 启动依赖：MySQL 8 + Redis 7，首次启动自动建库并导入 docs/sql/init/ 初始化脚本
docker compose up -d

# 2. 启动应用（默认 http://localhost:8080）
mvn spring-boot:run
```

启动后可访问：

- 接口文档：`http://localhost:8080/doc.html`（Swagger UI 为 `http://localhost:8080/swagger-ui.html`），由 `nebula-base-web` 的 knife4j + springdoc 提供，与代码实时一致；
- 健康检查：`http://localhost:8080/actuator/health`；
- 默认管理员账号：`admin / 123456`（**部署后请立即修改**）。

后端所有可变项已环境变量化，默认值与 `backend/docker-compose.yml` 对齐，本地零配置即可启动。若你的 shell 里导出过指向远程环境的变量，它们会覆盖 `application.yml` 的本地默认值（Spring 既定优先级），本地联调前先取消：

```bash
unset NEBULA_APP_DATASOURCE_URL NEBULA_APP_DATASOURCE_USERNAME NEBULA_APP_DATASOURCE_PASSWORD \
      NEBULA_APP_REDIS_HOST NEBULA_APP_REDIS_PORT NEBULA_APP_REDIS_USERNAME NEBULA_APP_REDIS_PASSWORD \
      NEBULA_STORAGE_TEMPORARY_TYPE NEBULA_STORAGE_FORMAL_TYPE
```

> `backend/docker-compose.yml` 的本机依赖栈只读取 `NEBULA_LOCAL_*` 变量（`NEBULA_LOCAL_MYSQL_ROOT_PASSWORD` / `_MYSQL_DATABASE` / `_MYSQL_USER` / `_MYSQL_PASSWORD` / `_MYSQL_PORT` / `_REDIS_PORT`），与应用侧的 `NEBULA_APP_*` 隔离，不受上述导出影响。

## 第三步：启动前端

```bash
cd web
pnpm install
pnpm dev        # 开发服务器默认 http://localhost:5173，/api 代理到 http://localhost:8080
```

其他常用命令：

```bash
pnpm test       # 单元测试
pnpm typecheck  # 类型检查
pnpm build      # 生产构建
```

后端地址可用 `VITE_API_BASE_URL` 覆盖，配置放 `web/.env` / `web/.env.local`（后者 git 忽略）。

## 第四步：验证

1. 浏览器打开 `http://localhost:5173`，用 `admin / 123456` 登录；
2. 进入用户、角色、字典、系统参数等页面，确认管理端与后端联通；
3. 打开 `http://localhost:8080/doc.html` 确认接口文档可访问。

## 接自己的业务

- **后端**：`backend/` 就是一个普通 Spring Boot 工程，直接加自己的 Controller / Service / Entity；把 `pom.xml` 的 `groupId` 改成自己的。启动类已声明 `@MapperScan("cn.cloudomni.nebula.template.**.mapper")`，业务 Mapper 放在 `<业务包>.**.mapper` 下即可（XML 放 `src/main/resources/mapper/**/*.xml`）；实体继承 `BaseEntity` / `BaseIdEntity` 自动填充 `create_time` / `update_time`；Controller 方法标注 `@NebulaAudit` 即落操作审计；定时任务实现 `INebulaJobHandler` 并标注 `@NebulaScheduledJob`；短信/邮件验证码实现 `VerificationCodeSender` 接口并注册为 Bean。
- **前端**：应用层 `src/pages/`、`src/services/`、`src/components/` 自由修改；框架层 `src/request/`、`src/route/`、`src/stores/`、`src/providers/`、`src/i18n/` 尽量少动，升级冲突更少；品牌信息通过 `NebulaProvider` 注入（`name` / `title` / `logo` / `faviconHref`）。
- **AI 辅助开发**：`.agents/skills/` 自带 nebula 技能（模块指引、特性分析、特性规格、规范约束），配合 AI 编码工具使用。

## 升级

```bash
git remote add upstream https://github.com/yunqilee69/nebula-template.git
git fetch upstream
git merge upstream/main
```

- **前端升级** = 合并上游；按约定冲突应只落在你改过的应用层文件，框架层冲突时优先采用上游版本；
- **后端升级** = 改 `backend/pom.xml` 中的 `<nebula.version>`；前后端模板同 tag 发布，版本一一配对。

## 上线前必改配置

| 配置 | 说明 |
| --- | --- |
| `NEBULA_AUTH_JWT_SECRET` | JWT 签名密钥，至少 32 字节随机串，**必须**覆盖 |
| `NEBULA_APP_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | 生产数据库连接 |
| `NEBULA_APP_REDIS_HOST` / `_PORT` / `_PASSWORD` | 生产 Redis 连接 |

常用能力开关：

- 任务调度 `nebula.scheduler.engine`（默认 quartz，可选 xxl；引擎脚本选型见 `docs/sql/README.md`）
- 文件存储 `nebula.storage.*.type`（filesystem / db / minio）
- GitHub 登录 `NEBULA_AUTH_GITHUB_ENABLED=true` + client-id / secret
- 验证码与限流 `nebula.auth.security.captcha` / `rate-limit`
- 跨域 `nebula.web.cors.allowed-origins`（默认关闭）

## 下一步

- 了解整体架构与分层动机：[设计说明](./design/index.md)
- 按模块查看能力边界与接入方式：[Auth 模块](./auth/index.md)、[Dict 模块](./dict/index.md)、[Param 模块](./param/index.md)、[Storage 模块](./storage/index.md)、[Frontend 模块](./frontend/index.md)
- 开发规范与详细配置：模板仓 `docs/spec/`、`backend/README.md`、`web/README.md`
- 数据库脚本组织与升级方式：模板仓 `docs/sql/README.md`
