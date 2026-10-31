---
title: Changelog
format: md
---

# Changelog

所有项目的重要变更都会记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [Unreleased]

### Added

- `nebula-base` / `nebula-auth` / `nebula-notify` / `web` / `docs/sql`：**邮件与通知模板统一模板化，并支持 HTML 邮件**。此前事务邮件正文写死在 Java 里，通知模板只支持 `${key}` 字符串替换，控制平面邮件无法调整文案。本次统一改用 Thymeleaf core 渲染：纯文本 `TemplateMode.TEXT`、HTML `TemplateMode.HTML`，只引 core 不引 starter，避免把 Web 依赖带进 gateway。
  - 新增 `nebula-base-common` 模板基础设施：`TemplateProperties`（`nebula.template.*`）、`TextTemplateRenderer` / `ThymeleafTextTemplateRenderer`、`TemplateContentType`、`EmailMessage`、错误码 `common/template 01040001–01040003`。模板按 `locations` 顺序查找 `location + name + .txt/.html`，业务方把自己的目录放在 `classpath:/templates/` 前面即可覆盖内置模板；`cacheable` 按文件 `lastModified` 自动失效，`validate-on-startup` 在启动阶段校验模板。
  - 事务邮件模板移入 resources：验证码、管理员重置密码、成员邀请、加入企业欢迎，共 4 组 subject/body，每组带 `.txt` 与 `.html`。控制平面邮件**统一发送 HTML 正文**（纯文本作为不支持 HTML 客户端的兜底），HTML 模板缺失视为配置错误，不静默降级成纯文本；邀请链接、临时密码等变量只进入模板上下文，不写日志。
  - 通知中心模板仍存 `sys_notify_template_variant`，但改用同一渲染器：删掉 `${key}` 字符串替换，新增可选 `html_content_template` 列（仅 EMAIL 渠道），配置后发送 `multipart/alternative`，同时带纯文本和 HTML；非 EMAIL 渠道配置 HTML 返回 `22046`。
  - **破坏性变更**：数据库通知模板不再兼容 `${key}`，必须迁移为 `[(${key})]` / `[(${notify.xxx})]`；字段编码收敛为 `^[A-Za-z_][A-Za-z0-9_]*$` 且不得使用保留变量 `notify`；`AuthEmailSender` / `ControlPlaneEmailSender` 的 `send` 改为接收 `EmailMessage`。未迁移的模板会把 `${key}` 当普通文本原样发出。
  - 升级脚本 `docs/sql/unreleased/{mysql,postgresql}/05-notify-template-thymeleaf-html.sql`：加列 + 字段编码检查 + `${key}` → `[(${key})]` 转换 + 残留复核；`init/` 两套脚本同步新列，`PASSWORD_RESET` 种子模板改为新语法并补 EMAIL HTML 示例。Web 模板管理页新增 EMAIL HTML 内容模板输入与详情展示，变量提取覆盖 HTML 模板，字段编码校验同步收紧。
  - 数据平面模板配置弹窗增加常驻「模板使用说明」，覆盖自定义参数、内置变量、条件语法、渠道差异和字段编码规则；「查看内置变量」改为弹窗，按「时间相关 / 发送上下文」分组列出 15 个自动注入变量的说明与纯文本/HTML 写法，各渠道内容模板补充真实占位示例。

- `nebula-auth` / `web` / `control` / `mobile` / `docs/sql`：**租户管理员可自助维护企业资料与登录页品牌**。数据平面新增「系统管理 → 企业设置」(`/system/settings/tenant`)，包含基础信息、品牌与登录页、登录与安全、企业标识四个页签；租户可维护名称、简称、Logo、对外联系邮箱/电话、官网、地址、行业、简介、默认语言/时区，以及登录页 Logo、标题、欢迎语、主题色、favicon、背景图。企业代码、域名、状态由平台持有，租户只读。新增 `GET/PUT /api/auth/tenant/profile`，写接口由 `TENANT_PROFILE_QUERY` / `TENANT_PROFILE_UPDATE` 权限码控制并默认授予 `ADMIN`，平台会话调用直接拒绝；保存后清理租户解析缓存。`auth_tenant` 新增 `short_name`、`contact_phone`、`website`、`address`、`industry`、`description`、`locale`、`timezone`、`branding_json`，`/api/frontend/init` 的 `tenant` 节点下发资料与品牌，Web 登录页/布局和移动端「我的」页据此渲染；控制平面保留编辑同样字段的能力，但不写租户审计、不通知租户。移动端只读展示企业信息，不提供编辑入口。

- `control` / `docs/sql` / `web`：**多租户控制平面独立为 `control/` 工程，控制面与数据面解耦**。新增独立 Vite + React + Ant Design SPA，部署在独立域名或端口，只面向超级管理员：登录走独立入口 `/api/auth/platform-login`，直接认证 `auth_person` 中的平台管理员，**只支持账号 + 密码**，不携带租户头、不绑定任何租户；令牌复用同一套不透明令牌缓存，但会话类型为 `PLATFORM`，邮箱/手机号仅作为全局用户信息字段展示，不提供验证码或 OAuth 登录。登录后强制校验 `/api/auth/current-user` 的 `sessionType=PLATFORM` 且 `platformAdmin=true`，非超级管理员立即退出并拒绝进入。控制平面使用独立的 `nebula-control.*` 令牌键，不与数据平面 `nebula-web.*` 混用；页面包含控制台概览、企业管理（创建/编辑/启停/删除/域名/成员邀请）和全局用户查询。后端 `PlatformAdminGuard` 改为只校验平台会话与 `platform_admin` 标记，不再要求默认租户；数据平面不提供平台管理入口。
  - 初始化数据把默认 `platform_admin` 账号改回纯全局身份：只保留 `auth_person` 的 `superadmin`，删除默认租户内同名 `auth_user`、`SUPERADMIN` 角色、关联与「租户配置」菜单；后端能力标记 `auth_person.platform_admin`、`PlatformAdminGuard` 与 `PLATFORM_ADMIN_REQUIRED` 错误码保持不变。
  - `docs/spec/12-multitenancy.md` 同步为「控制平面 + 数据平面」双平面模型，补充控制平面登录限制、独立令牌、API 表面与验收矩阵；`README.md`、模板仓 `AGENTS.md`、`rename-project.sh` 与同步工作流 `TEMPLATE_DIRS` 均加入 `control/`。

- `nebula-base` / `nebula-param` / `web`：**敏感字段落库加密（`nebula-base-crypto`）**——数据库里的机密值（SMTP 授权码、初始化密码等）此前只能靠环境变量解决，落库、备份、Binlog、只读副本、缓存里全是明文。本次加一层按行声明的落库加密：`sys_param.is_encrypted = 1` 的行自动加解密，业务代码零改动（`getParamValueByKey` 拿到明文，写接口收明文）。算法只做 AES-256-GCM、**零第三方依赖**（只用 JDK `javax.crypto`），密钥走 `nebula.crypto.keys` 配置（推荐环境变量注入，也可直接写值——框架不校验来源）。
  - 落库格式 `enc:v1:aes-gcm:<keyId>:<base64url(iv‖ciphertext‖tag)>`，AAD 绑定 `nebula ␟ v1 ␟ 算法 ␟ keyId ␟ 表.列 ␟ 自然键`——把密文挪到另一行或另一列会解密失败，而不是静默解出错误的值。GCM 用 12 字节 IV + 16 字节 tag，`Cipher` 实例按 ThreadLocal 复用：实测 0.43µs/op 对 3.24µs/op，且只有复用实例才拿得到 JDK「同密钥内 IV 不可重复」的防护（每次 new 的 `Cipher` 内部没有历史 IV 可比）。
  - **加密范围用数据声明、不做配置开关**：`is_encrypted` 是写意图、`enc:` 前缀是存储事实，读取端永远以事实为准；标记为 1 但值仍是明文（迁移窗口内）时返回明文并记 ERROR，下次写入自动加密。**不引入非对称加密、不引入国密**；密钥直接作 AES 密钥、不做 HKDF 派生（AAD 已把「表.列 + 自然键」绑进密文，派生密钥想解决的功能与它重叠）。信封解析按首/末冒号切分（`split(":", 3)` 在 keyId 含冒号时会错位），AAD 用 ASCII US（U+001F）分隔（用 `|` 会被 `keyId="x|sys_param.param_value"` 构造出字段注入碰撞）。
  - **刻意不用 MyBatis `TypeHandler` / 拦截器做透明加解密**：全局 String 注册会加密一切；`Wrapper` 条件绑定不经字段 typeHandler；`UpdateWrapper.set()` 绕过实体直接写库、会静默写明文。改由参数模块在 Service 层收口（读经 `getParamValueByKey`、写经 `saveOrUpdateSystemParamByKey`），既有约 10 处消费点零改动。
  - 新增配置 `nebula.crypto.*`（`algorithm` / `active-key-id` / `keys[].{id,secret}`）。`keys` 为空允许启动（打 WARN）但写非空加密值必报 `01030001`——**绝不静默落明文**；密钥配置非法（id 为空或重复、secret 长度不符、`active-key-id` 指向不存在的密钥）则**启动失败**（`01030006`），避免「以为加密了其实没有」。新增错误码段 `01030001`–`01030007`（写路径无密钥 / 信封损坏 / 完整性校验失败 / 算法未装配 / 密钥不可用 / 配置非法 / 重复加密），中英文 i18n 齐备。
  - 接口契约：详情接口在 `is_encrypted=1` 时**不回传值**（只回 `configured` 布尔），列表接口维持不返回值的事实；创建接口可带 `encrypted`（仅创建生效），**更新接口不接受该字段**（标记属数据变更）；提交值等于库中现值即视为未修改，避免前端回填值导致二次加密（不可逆）。`SystemParamDetailDto` / `SystemParamDto` / `CreateSystemParamCommand` 及 local 层请求响应同步加字段，新增参数错误码 `21009`（加密存储只支持 STRING 类型）。
  - 前端新增 `web/src/components/encrypted-value-field/`：只呈现「是否已配置」，密文永不进入输入框（占位恒为 `****`，不泄露密文长度）；编辑态是三态意图（`keep` 省略字段 / `set` 提交新明文 / `clear` 提交空串），清除走二次确认；参数中心的「查看」按钮对加密行不再渲染（那是既有的明文回显通道），加密行改用「加密存储」标记。创建参数时新增「加密存储」复选框，勾选后 `data_type` 联动锁为 STRING。
  - 运维：`docs/sql/unreleased/{mysql,postgresql}/03-sys-param-encrypted-flag.sql` 加列并标记存量机密行（`notify.email.password`、`login.username.reset-default-password`），`init/` 两套初始化脚本同步；回填作业 `param.encrypt.backfill`（幂等，跑完人工停用）与重加密作业 `param.encrypt.rekey`；密钥轮换、回填、回滚与已知边界写在 `nebula-base/nebula-base-crypto/README.md`。规范落地见 `docs/spec/09-security.md` §3.4（保护边界、加密列禁进 `WHERE`/`ORDER BY`/`GROUP BY`/唯一索引、密钥不得进配置/DB/日志/审计、缺密钥行为、`is_encrypted` ↔ `enc:` 一致性）。

- `nebula-storage` / `web`：**服务端代理下载补 HTTP 缓存语义，并修复 Web 端缩略图一直在拉原图的问题**。此前 `GET /api/storage/download` 只设 `Content-Type` 与 `Content-Disposition`，没有任何缓存语义，客户端刷新页面必然重新拉一遍全量字节——即使前端已经存在「预览地址复用」的 hook。
  - **预览与下载按语义分流**（见 `docs/spec/10-config.md` §5.5）：未传 `filename` 即预览，响应改为 `Content-Disposition: inline` + `Cache-Control: private, max-age=300, must-revalidate`；传了 `filename` 即下载，保持 `attachment` 并改为 `no-store`——带附件名的下载语义是「拿最新的一份」，可缓存会让替换后的同名文件取不到。**预览一律 `private` 不用 `public`**：文件受 `STORAGE_FILE_QUERY` 权限保护，进共享缓存等于把受控内容暴露给中间代理。
  - 预览响应带强 `ETag`（`fileId` + `variant`）与 `Last-Modified`，命中 `If-None-Match` / `If-Modified-Since` 时返回 304。ETag **必须把 variant 拼进去**，否则缩略图与原图共用标识会互相串内容。304 的判定放在打开内容流**之前**，且内容流以 `Supplier` 惰性传入——否则条件命中时白白打开（并泄漏）一个文件流。这是 ETag 成立的**前提约束**：正式文件一经绑定即视为不可变，替换内容必须换新 `fileId`，复用旧 `fileId` 覆盖会让客户端拿着旧 ETag 取到过期内容。
  - 签名分享下载 `/api/storage/download-signed` 恒 `no-store`：它带次数与时效限制，任何缓存都会让下载计数失真或让过期凭据继续可用。`download-location` 给 `private, max-age=60` 的短缓存，必须显著短于直链有效期（默认 300 秒），否则客户端会反复拿到已过期的直链。
  - **修掉一个此前空转的 bug**：`mapStorageFileToUploadFile` 构造缩略图 URL 时用 `buildStorageDownloadUrl(file.id, file.fileName)`，**没带 `variant=thumb`**，而 `useStoragePreviewUrl` 的注释却写着「variant 保留，缩略图仍取派生版本」——上游压根没传下来。结果是每个缩略图位都在下载原图，后端 `variant=thumb` 的派生机制整条链路在 Web 端从未生效。现在按 `variants` 里确有 `thumb` 才带 variant：派生不存在时若仍传，服务端每次都会回退原图并打一条 WARN 日志。
  - 直链模式下 HTTP 缓存不生效（每次签发的 URL 都不同，缓存键必然变化），这是结构性问题，重复下载的治理交由对象存储侧 CDN 与客户端缓存策略，本次不覆盖。

- `nebula-notify` / `web`：**站内信面板化——铃铛由「Dropdown + 5 条预览」改为 Popover 通知面板，订阅管理从个人信息页迁入面板**。看消息与配订阅收敛到同一入口，对标腾讯云控制台的站内信形态。
  - 面板内三视图（列表 / 消息详情 / 订阅管理）在同一容器内切换、不跳路由。列表常驻挂载、靠 CSS 隐藏，往返详情不丢筛选与分页状态；每次打开自增 `openToken`，面板回到列表视图并重新拉取。原本挂在个人信息页的消息设置卡迁入面板（`NotifyPreferenceCard` 由 `pages/profile/info/` 移到 `components/`），`ProfileInfoPage` 不再渲染它。
  - **为此给站内信补上「类别」这一维**：`sys_site_message` 此前只有 `record_id`，取类别得经 `sys_notify_record.category_code` 关联，而该表属管理端权限可见，用户端列表不该依赖它。做法是落库时把类别冗余一份到站内信（`resolvedNotify.categoryCode()` 本就非空，空值已兜到 `DEFAULT`），`ALTER TABLE` 加 `category_code VARCHAR(32) NOT NULL DEFAULT 'DEFAULT'`，存量用 `UPDATE ... JOIN`（PostgreSQL 用 `UPDATE ... FROM`）回填，并建 `(receiver_user_id, category_code)` 索引，让「按类别筛选」退化成一次等值匹配。升级脚本见 `docs/sql/unreleased/{mysql,postgresql}/01-site-message-category.sql`，`init/` 两套初始化脚本同步。
  - 新端点 `GET /api/notify/site-messages/categories`（当前用户实际有消息的类别 + 总数 / 未读数，按未读数降序）、`PUT /api/notify/site-messages/read-all`（可选 `categoryCode`，返回受影响条数）。两个端点的归属一律取 `CurrentUserContext`，**连 `receiverUserId` 字段都不收**；不复用既有 `/categories/list` 是因为它带 `NOTIFY_CATEGORY_QUERY` 管理端权限。一键已读入口带 Popconfirm 二次确认，前端按服务端返回条数修正未读数（`useNotifyStore` 新增 `decrementUnreadBy`），不再走「先拉全部未读 id 再批量」的放大路径。
  - 聚合 SQL 刻意拆成两条 `@Select`：`read_status` 在 MySQL 是 `TINYINT(1)`、PostgreSQL 是 `BOOLEAN`，`SUM(CASE WHEN read_status = 0)` 在 PG 上会类型不匹配；`readStatus` 作为绑定参数交给驱动转换，并以带类型的 DTO 映射避开 `listMaps` 在 H2 / PG 上返回列名大小写不一致的坑。
  - 列表抽到 `web/src/components/site-message-list/`，面板（`layouts/`）与全文页（`pages/notify/inbox`）复用同一份实现。全文页的 ProTable 换成自研列表后补了 `selectable` / `renderBatchActions`——多选与批量已读未读本是 ProTable 的能力，不做就是功能回退，列表只管勾选状态、具体动作由全文页注入；随之删掉失效的 `site-message-table.tsx`、`inbox.styles.ts` 与死代码 `use-notification-inbox.ts`。`/notify/inbox` 的公告 Tab、删除、标记未读、多选全部保留。
  - `packages/client-sdk`：补端点常量 `NOTIFY_ENDPOINTS.siteMessagesCategories` / `siteMessagesReadAll`，类型补 `SiteMessageCategoryResp`、`MarkAllSiteMessagesReadReq` 与 `SiteMessageResp.categoryCode` / `categoryName`。
  - i18n 命名空间定名 `siteMessage`（zh-CN / en-US）而非原设计的 `notify`：`NebulaNotifyMessages` 已被管理端 `system.config.notify` 占用，同名 interface 会被 TypeScript 声明合并成一个形状，导致两处文案互相补齐报错。
- **模板仓根新增 `AGENTS.md`**，源码在主仓 `.github/template/AGENTS.md`，由同步工作流拷入模板仓根。此前模板仓根只有手工维护的 `README.md` / `.gitignore`，fork 用户的 AI 协作入口是缺的：`web/AGENTS.md` 只讲前端分层、`backend/README.md` 只讲后端启动，没有一份东西回答「这个仓库是什么、以后怎么跟上上游」。文档按两章写：一、这个仓库是什么、提供什么（`backend` / `web` / `mobile` / `packages` / `docs` / `.agents` / `scripts` 逐目录说明）；二、如何与上游同步——把 `nebula-template` 始终留在 remote 当上游，起步是 clone 后 `git remote rename origin upstream` 再挂自己的 `origin`（保留模板提交历史，这是后面能直接 merge 的前提），升级是 `git fetch upstream && git merge upstream/main`，冲突只落在自己改过的文件上；并写明用 merge 不用 rebase、后端 `<nebula.version>` 随上游一起来、要锁版本就 merge tag。
  - 源码放主仓而不是直接写在模板仓：模板仓顶层整体是生成物（每次同步清空重建），放主仓才能被版本管理、评审，并与同步规则一起演进。主仓 `AGENTS.md` 的同步说明里也点名了这层来源，避免下次又有人直接去模板仓里写。

### Fixed

- `nebula-scheduler` / `nebula-auth` / `web`：**租户停用后其 Cron 任务仍会继续触发执行**。此前 `updateStatus()` 只改 `auth_tenant.status`，而 Quartz 线程不经过 HTTP 鉴权链，`TenantResolver` / 令牌过滤器对 ACTIVE 的校验拦不到定时任务：租户被置为 `SUSPENDED` / `EXPIRED` / `DELETED` 后，`tenantId:jobCode` 触发器的 Cron 照常到期，分发器也照常拉取 handler 执行。现分两层收口：
  - **状态变更联动**：新增 `TenantStatusListener`，`updateStatus()` / `delete()` 在事务提交后通知调度模块，暂停该租户全部 Trigger；恢复 `ACTIVE` 时只恢复仍 `enabled` 且配置了 Cron 的任务。系统租户与 `nebula.tenant.enabled=false` 的单租户模式不参与联动。停用时同时清除 `tenantByDomainCache` 的 `code:` / `host:` 键，避免匿名请求继续按缓存解析到已停用租户。
  - **执行前兜底**：`SchedulerDispatchService.execute()` 与手动触发 `triggerNow()` 再次校验租户状态（`TenantActiveChecker`，多租户应用由 auth 实现为 `TenantResolver.requireActive`）。不可用时手动触发返回 `27014 TENANT_INACTIVE`，自动触发把本次运行记为新增的 `SKIPPED` 状态而非静默不执行；停用期间同步任务定义也会立即重新暂停 Trigger。状态查询异常按可用处理，避免一次查询故障冻结所有租户的调度。
  - 调度引擎 SPI 新增 `suspend` / `resume`（Quartz 对应 `pauseTrigger` / `resumeTrigger`，XXL 对应 `stopJob` / `startJob`），前端运行状态枚举、标签颜色与中英文文案同步补 `SKIPPED`。

- `docs/sql/init/postgresql/01-init-structure.sql`：`frontend_app_release` 是全局表，但两个索引错误地带上了不存在的 `tenant_id` 列，导致 PostgreSQL 全量初始化在建索引处直接失败。现与 MySQL 和表分类保持一致，索引改为 `(platform, channel, version_code)` 与 `(platform, channel, release_status, version_code)`。

- `.github/workflows/sync-template.yml` / `scripts/sync-template.sh`：**模板仓 `scripts/` 只同步 `rename-project.sh`**。整个 `scripts/` 目录此前随 `TEMPLATE_DIRS` 原样同步，于是主仓自用的三个脚本也进了模板仓，而它们对下游全是坏的：`set-version.sh` 与 `sync-template.sh` 都读主仓根 `pom.xml` 的 `<revision>`（模板仓没有根 pom，也没有 `.github/`，前者会直接 `die`），`javadoc-audit.sh` 汇总的是主仓各模块的公共类型 Javadoc 覆盖（模板仓只有 `backend/` 一个模块）。用户看到这些脚本只会以为能用。做法是在同步步骤里校验模板仓 `scripts/` 恰好含 `rename-project.sh`：将来往 `scripts/` 加脚本时同步会当场失败（与「静默缺目录」相反的失效方向——这次要防的是悄悄多带一个下去），加之前先确认它面向 fork 用户。
- `scripts/sync-template.sh`：同步目录清单缺 `mobile/` 与 `packages/`（脚本自称与 CI 等价，实际产出的模板是残缺的），补齐后两份清单已断言一致。同时把拷贝从「先 `cp -r` 再删依赖目录」改为 `rsync` 带排除清单：本地是开发工作区，`mobile/node_modules`（1.1G）与 `mobile/harmony/oh_modules`（454M）真实存在，老写法会白拷近 2G 再删掉（CI 无此问题，它的工作区是干净 checkout），并加了一条「依赖目录残留即失败」的自检。脚本因此依赖 rsync。
- `.github/workflows/sync-template.yml`：排除鸿蒙构建产物写的是 `mobile/ohos/...`，而工程目录实际叫 `mobile/harmony/`，这行等于没生效（真正兜住这些产物的是同步过去的 `mobile/.gitignore`）；头部「主仓不含三端工程目录」的注释也已过时（主仓就有 `ios/` `android/` `harmony/`）。

### Changed

- `docs/sql` / `backend` / `.github/workflows`：**明确模板工程的数据库升级边界**。模板仓只同步 `docs/sql/init/` 与已发布的 `<版本号>/` 目录，`docs/sql/unreleased/` 不再进入模板仓（它是主仓开发期脚本，升级时不应执行）。`backend/README.md` 与文档站「升级」章节补齐数据库增量脚本步骤：`init/` 只用于全新库，存量环境必须按 `docs/sql/<目标版本>/{mysql,postgresql}/` 从当前版本的下一个版本目录按序执行到目标版本。升级 SQL 以仓库中的版本目录为准，文档站只提供索引与说明。
- `nebula-auth` / `web` / `control` / `mobile` / `packages/client-sdk` / `docs/sql` / `docs/spec`：**平台账号（`auth_person`）移除邮箱、手机号与找回方式，只保留用户名 + 密码登录**。后端删除 `email`、`email_verified`、`phone`、`phone_verified`、`recovery_mode` 字段及对应 DTO/实体映射，删除平台绑定的邮箱/手机号验证码接口（`/api/auth/login/binding/code/send`、`/api/auth/account/person/code/send`、`/api/auth/account/person/email/bind`、`/api/auth/account/person/phone/bind`）与 `19019 PERSON_CONTACT_TAKEN` 错误码，`BIND_EXISTING` 只校验已有平台账号的用户名 + 密码；绑定挑战不再下发租户邮箱/手机号预填值，平台会话也不再填充联系字段。数据平面「平台个人信息」移除邮箱/手机号展示与绑定弹窗，「账号安全」只保留修改密码；控制平面全局用户列表/详情移除联系方式；移动端平台账号页与绑定页同步收缩。初始化 SQL（MySQL/PostgreSQL）删除相关列、唯一键与种子值。**保留** `auth_tenant_invitation.email`：控制平面邀请成员时仍可填可选邮箱用于发送邀请邮件；租户账号 `auth_user` 的邮箱/手机号及其登录方式不受影响。`docs/spec/12-multitenancy.md` 同步为平台账号只有用户名 + 密码，并删除 19019 与 5.5 联系方式预填/验证章节。
- `web`：**个人详情页的平台账号页改为纵向分块布局**。多租户模式下首个页签由「租户个人信息」更名为「企业个人信息」；「平台个人信息」去掉「平台资料 / 账号安全 / 我的企业」二级页签，改为顶部单卡直接展示完整平台资料（用户名、显示名称、账号 ID、状态）并提供内联编辑，下方依次渲染「账号安全」与「我的企业」两个区块。账号安全区块只保留修改密码；「退出所有企业」移到「我的企业」卡片标题栏最右侧，减少一屏内的卡片堆叠与空白。
- `nebula-auth` / `nebula-base` / `docs/sql`：**菜单、按钮、接口权限改为租户隔离**。`auth_menu`、`auth_button`、`auth_api` 此前按全局表处理，导致租户 A 删除或调整菜单会直接影响租户 B，且菜单缓存 `authMenuEnabledListCache` 也未加租户前缀。现三表补 `tenant_id`，唯一键改为 `(tenant_id, code)`，实体继承 `TenantBaseEntity`，`TenantTableRegistry` 改归 T 类，菜单缓存退出全局缓存清单；ADMIN 权限种子只按当前租户资源生成，初始化脚本里按 code 清理菜单的语句也补上 `tenant_id` 条件。系统租户保存菜单/按钮/API 模板副本，新建租户由 `TenantResourceProvisioner` 复制并授予 ADMIN，复制后各租户可独立排序、隐藏和删除。
- `docs/sql` / `nebula-auth`：**系统租户升级为完整的新租户模板**。系统租户 `__system__` 除菜单/按钮/API 外，新增 `ROOT` 组织、`ADMIN` 角色、`admin / 123456` 管理员账号、user-role/user-org 关联，以及 ADMIN 对全部模板资源的权限。`TenantResourceProvisioner` 改为整体克隆组织、角色、账号、关联、资源和权限并按新 ID 重映射，根组织名称替换为新租户名称；创建租户时默认得到 `admin / 123456`，请求显式传入的 `adminUsername` 等字段覆盖模板值，不再默认生成初始管理员邀请令牌。前端创建租户表单同步改为提示默认账号，并删掉无用的邀请令牌回显。`TenantResolver` 同时拒绝把系统租户解析为登录租户，避免模板管理员账号成为可登录入口。
- `docs/sql`：平台管理员 person 用户名由 `admin` 改为 `platform_admin`；默认租户内新增 `auth_user` `platform_admin / 123456`，授予 `ADMIN` + `PLATFORM_ADMIN` 并绑定该 person。内置 `admin` 账号保留但不再绑定平台账号、不授予 `PLATFORM_ADMIN`，首次登录仍需完成绑定。同时明确系统租户 `id=__system__`、`code=system` 只是平台继承/模板命名空间，不是可登录租户。
- `docs/sql` / `nebula-auth` / `web`：**收紧平台管理入口与租户域名配置**。ADMIN 角色的菜单授权排除「租户配置」三项菜单，只有 `PLATFORM_ADMIN` 角色可见，避免内置 `admin` 绑定后仍看到平台菜单；平台管理员在默认租户的租户详情中统一维护域名，抽屉增加归属说明、按 `<code>.<base-domain>` 预填，并把域名状态显示为中文。启动期 `StorageUploadCeilingGuard` 与权限登记对账显式切到默认租户执行，消除多租户开启时的上下文缺失告警；裸基域上的 `/api/*` 匿名请求在无法定位租户时返回 `19001 未指定租户`，不再落到「系统异常」。个人中心/平台管理的旧路径（`/account*`、`/platform*`）保留到新路由的跳转，账号状态改为中文。

- `scripts/set-version.sh`：**新增 `--release` 发版模式，把「必须与版本号同一步完成」的动作固化进发版提交**。此前脚本按文档把 `backend/pom.xml` 的 `<nebula.version>` 当作「发版后回填」的事，于是发版提交（也就是 tag）里 backend 引用停在上一个版本，而同步工作流按 tag 把模板仓写成新版本——两者从发版那一刻起就漂移（`v0.2.5` 的 tag 内 backend 仍是 `0.2.4`，主干由补提交 `00cc36b3` 才对上）。现 `--release` 一次做完全部机械动作，全部并入同一个发版提交：升 `revision` 与 docker 默认版本、把 `backend/pom.xml` 的 `<nebula.version>` 指到本版本、`docs/sql/unreleased/` 非空时整体更名为 `docs/sql/<版本号>/`（并重建空的方言子目录）、更新 `docs/sql/README.md` 的「当前版本为」一行、把 CHANGELOG 的 `[Unreleased]` 定为 `[<版本号>] - <今天>` 并留出新的空 `[Unreleased]`。各版本目录的脚本说明仍需人工补写，脚本会在结束提示里点名。
  - **刻意与开发期升版区分**：不带 `--release` 的升版行为不变，仍**不动** `backend/pom.xml`——开发版本尚未上架 Maven Central 时，模板引用必须停在最近一个已发布版本，否则模板工程无法构建。
  - `--release` 拒绝 `-SNAPSHOT`（发布版本不会是快照）；重复执行幂等（版本已就位时只补作未完成的收口，已存在的版本目录与已写好的 `[X.Y.Z]` 段落都跳过）。
  - 顺手修掉一处新写入的 `unbound variable`：提示语里的 `$today` 紧跟全角逗号，bash 会去找名为 `today，` 的变量——与历史上 `$NEW_VERSION` 紧跟中文括号那次是同一类问题，现统一改用 `${...}`。

### Security

- 全仓：**敏感数据暴露面治理（与落库加密同批次，五项）**——加密列如果还能从别的通道读到，等于没加密。
  - `GET /api/frontend/caches` 此前**没有任何权限码**，且把缓存条目值序列化回传：其中 `systemParamByKey` 是系统参数实体、`authSessionCache` 是含原始访问令牌的会话。现登记 API 权限码 `FRONTEND_CACHE_QUERY`（`auth_api` 种子行 + `docs/sql/unreleased/{mysql,postgresql}/04-exposure-hardening.sql`，并为 ADMIN 补授权），并加**缓存名拒绝清单**：系统参数、会话/令牌、验证码、找回密码、在线用户、第三方登录态等命名空间不再出现在列表结果里，`deleteCache` 同样拒绝这些命名空间（避免绕过列表直接操作认证态缓存）。**两层缺一不可**：权限注解受 `nebula.auth.permission.enforce-enabled`（默认 `false`）门控，默认部署下真正兜底的是拒绝清单。
  - 密码重置事件 `UserPasswordResetEvent` 的载荷此前带**重置后的默认密码明文**，而该事件会落 `event_outbox.payload_json`（该列不做任何脱敏）——等于把密码长期写进数据库。现载荷去掉 `defaultPassword`，通知模板同步不再渲染该占位符：删掉 `sys_notify_template_field` 的该字段行（它「必填且无默认值」，留着会让新的发送逻辑抛「模板字段必填」），并把正文里的「重置后密码：`${defaultPassword}`。」整句换成「向管理员索取 / 忘记密码」文案。
  - 审计默认脱敏字段补入 `email`、`receiver`、`loginAccount`（原清单只有 `phone` 等）。
  - 生产环境（`--spring.profiles.active=prod` / `SPRING_PROFILES_ACTIVE=prod`）启动期强制关闭验证码日志开关 `nebula.auth.code.log-enabled`：开着它等于把验证码交给日志采集链路，守卫让启动直接失败，而不是等第一次发码才发现。非 prod 环境（本地、CI）不受影响。
  - `NotifyEmailConfigSupportTest` 中疑似**真实 SMTP 授权码与邮箱**已替换为占位符。**替换不等于轮换**：该凭据曾随提交进入仓库历史，对应邮箱的 SMTP 授权码必须由运维重新生成并作废旧值（本次未改动线上凭据，也无法验证其是否已更换）。

## [0.2.5] - 2026-10-09

### Added

- `nebula-notify` / `web`：**新建通知模板时即可配置渠道变体**。此前渠道变体只能在「编辑」里逐个修改（且创建后服务端按固定渠道集合自动补占位行），创建与配置割裂。现 `POST /api/notify/templates` 的请求体新增可选 `variants`（渠道 / 启用开关 / 主题模板 / 内容模板），未传时仍按 `NotifyChannelTypes.ALL`（现为 6 个渠道，含 `PUSH`）自动生成禁用占位变体，保持向后兼容。
  - **内容模板改为「启用才必填」**：`content_template` 不再强制非空，仅当该变体 `enabled = true` 时校验非空（新增错误码 `22045 TEMPLATE_VARIANT_CONTENT_REQUIRED`，zh_CN / en_US 同步）。这同时修掉一个老问题——旧编辑流程因 `@NotBlank` 拒绝空占位内容，导致「只想启用一个渠道」也得把其余渠道全填满才能保存。
  - 前端模板表单的渠道变体区由 `Form.List` 重构为对全部渠道固定渲染的 `Tabs`，每个页签 `forceRender`。**这是一处真实缺陷的修复**：antd 页签懒挂载，未激活页签里的 `Form.Item` 不注册，`validateFields()` 只返回已注册字段——旧实现新建模板时 6 个渠道里只有当前激活的那个被提交，其余静默丢失。
- `docs/sql`：`NOTIFY_CHANNEL_TYPE` 字典补 `PUSH`（移动推送）项，`init/{mysql,postgresql}/02-init-data.sql` 与新增的 `unreleased/{mysql,postgresql}/03-notify-channel-dict.sql` 一并登记（升级脚本按 id upsert，幂等可重放）。此前该渠道在代码里已存在（`NotifyChannelTypes.PUSH`、模板变体自动生成），字典缺项导致渠道下拉与变体页签渲染不出名称。
- `nebula-notify` / `web`：**站内信实时推送（SSE）**——在线用户的新站内信从「最长 60 秒轮询延迟」变为秒级可见。采用「落库为唯一事实源 + 实时通道只推信号」的双层设计：站内信仍照旧落 `sys_site_message`（离线/历史消息行为完全不变），落库提交后经 `nebula-event` 发一条事件，向在线连接推一个**只含 `messageId` 的信号**；客户端收到信号后回拉既有的未读数与列表接口。**刻意不推标题/正文**：断线丢信号无影响（下次拉取自然补齐），偏好过滤与内容权限语义不必在推流侧重复实现一遍。
  - 后端：新增事件 `SiteMessageCreatedEvent`（`notify-siteMessageCreated`，`nebula-notify-api`）；`NotifyServiceImpl.sendNotifyDelivery()` 的 SITE 分支落库后发布该事件，**发布失败只记 WARN 不回滚业务事务**（与既有 PUSH 渠道「推送异常绝不冒泡」一致）；事务提交后才分发由 `LocalNebulaEventPublisher` 的 `publish-after-commit` 保证。
  - 新端点 `GET /api/notify/site-messages/subscribe`（`text/event-stream`，返回 `SseEmitter`）。**选 SSE 不选 WebSocket**：本项目鉴权是不透明 token + `Authorization: Bearer` 头，SSE 用 `fetch` + `ReadableStream` 能原样携带该头并复用既有刷新逻辑，而浏览器 WebSocket 无法自定义握手头（只能 query 传 token，会漏进网关/访问日志），且要额外引入 `spring-websocket`、网关 ws 路由、Vite `ws: true`、Nginx `Upgrade` 配置；站内信是单向推送，双向能力用不上。`SseEmitter` 返回值走专用 ReturnValueHandler，**不经过 `ApiResultAdvice`**，无需加 `@ApiResultIgnoreAdvice`。
  - 连接管理：`SiteMessageSseConnectionRegistry` 维护 `userId → 连接队列`，经 `onCompletion/onTimeout/onError` 自动摘除（容器 async 完成必然触发 `onCompletion`），单用户连接数超上限逐出最旧（`nebula.notify.realtime.max-connections-per-user`，默认 8）；`SiteMessageHeartbeatKeeper` 每 30 秒写一行 SSE 注释帧保活并探活死连接。发送失败只摘除该连接，不影响同事件的其它接收人。
  - 前端：`services/realtime-client.ts` 增量 SSE 帧解析器 + fetch 流客户端（断线/非 2xx/流结束按指数退避重连，1s 起、上限 60s，重连成功重置退避；401 先走 `refreshAccessToken` 再重试一次；**环境无 `fetch` 时只报一次错并降级为轮询，不进重试循环**）。`request.ts` 抽出 `refreshAccessToken` 供普通请求与长连接共用，避免长连接另起一套并发刷新。
  - 前端接入与降级：`RealtimeProvider` 以登录用户 id 为生命周期建连/断连（挂在 `main.tsx`，随登出、切用户、会话过期统一断开），收到信号写 `useNotifyStore` 的 `signalVersion` 并回拉未读数。铃铛原本 60 秒的 `setInterval` **降频为 5 分钟兜底轮询**，并在 `visibilitychange` 恢复可见时补拉一次（后台标签页漏信号由此补齐）；弹窗公告改为信号驱动（仅在当前无公告展示时补拉，不打断正在阅读的公告）。
  - 依赖：`nebula-notify-api` 增 `nebula-event-api`（事件基类），`nebula-notify-core` 增 `spring-webmvc`（`SseEmitter`），`nebula-notify-service` 增 `nebula-event-local`（此前该服务没有事件基础设施，注入发布器会启动失败）。
  - 已知边界：移动端不接入本通道（RN/Hermes 无可靠 SSE，既定路线仍是厂商推送 + 轮询）；SSE 连接表是进程内的，多实例部署需启用 `nebula-event` 的 REMOTE 模式（outbox + RocketMQ）广播事件，或由网关鉴权/反代配置补齐（当前仓库无 nginx 配置，生产反代需 `proxy_buffering off`）。
- `nebula-auth`：**接口权限（API 资源类型）**——给"没有对应界面控件、只做服务端准入"的权限码一条正规通路。此前这类码只能借 `auth_button` 登记（例如 `AuditButtonCodes.AUDIT_RECORD_VIEW`、`StorageButtonCodes.STORAGE_FILE_QUERY`），语义错了：它们在管理端"按钮管理"页里、被当成前端控件权限、且部分码**压根没有种子行**——后果是静默的：管理端看不到、授不出去，而该端点对非 `ADMIN` / `SUPER_ADMIN` 一律拒绝。
  - 新资源类型：`PermissionConstants.RESOURCE_TYPE_API`，权限编码 `API:<code>:Allow`（如 `API:STORAGE_FILE_QUERY:Allow`），解析链路（`PermissionResolverServiceImpl` / `RoleServiceImpl` / `PermissionResourceResolver`）新增 API 分支。
  - 新注解 `@NebulaApiPermission`（`nebula-auth-api`，与 `@NebulaPermission` 同语义、不同资源类型）。**刻意做成独立注解而不是给 `@NebulaPermission` 加 `type` 属性**：后者要动 111 处既有标注，收益只是少一个注解；独立注解把"这个码要不要有界面归属"变成一眼可见的选择。两者共用 `PermissionAnnotations.declaredCode(method)`，覆盖测试与对账读到的是同一份结果。
  - 新登记表 `auth_api`（`code` 唯一、`module` 取自字典 `param_module`、`sort` / `remark` / `status`）。**没有 `menu_id`**——这正是它与 `auth_button` 的本质差别：接口权限不挂界面。**所属模块复用已有字典 `param_module`，不另建字典**。
  - 管理端：`POST /api/auth/apis`、`PUT|DELETE|GET /api/auth/apis/{id}`、`POST /api/auth/apis/page`、`GET /api/auth/apis/list`（授权树按模块分组取值），写操作记审计并带 `AUTH_API_CREATE` / `AUTH_API_EDIT` / `AUTH_API_DELETE`；新增权限码常量 `*ApiCodes`（`AuditApiCodes` / `ParamApiCodes` / `FrontendApiCodes` / `StorageApiCodes`），并把 4 个纯接口权限码从 `*ButtonCodes` 迁到 `*ApiCodes` 且改标 `@NebulaApiPermission`：`AUDIT_RECORD_VIEW`、`PARAM_GENERAL_CONFIG_QUERY`、`FRONTEND_APP_RELEASE_QUERY`、`STORAGE_FILE_QUERY`（含 storage 的 7 个只读端点：详情 / 分页 / 按来源列举 / 下载 / 下载地址 / 签名下载 / 上传任务详情）。迁移前已确认前端无一处用这些码做控件显隐，因此不影响界面。`notify` 的 `NOTIFY_CATEGORY_QUERY` **保持 BUTTON 不变**（它已有种子行与授权，迁移只有一致性收益却要动真实授权数据）。
  - **登记是数据、不是代码**：`auth_api` 的行由初始化脚本或管理端决定，框架不做注解扫描自动补行——后续业务模块自己给接口上权限码再配权限，才不会被框架的写库时机绑住。
  - 登记对账（只读）：`ApiRegistryReconciliationService` 从 MVC 的 `RequestMappingHandlerMapping` 取真实映射，报两类精确结论——**未登记**（代码声明了码、登记表里没有行，附端点与处理者）与**未使用**（`auth_api` 有行、代码没引用）。管理端「接口管理 → 权限登记对账」页可见。`nebula.auth.permission.strict-registry=true` 时启动期发现未登记即失败（`18006`），默认只打 WARN。**不自动补行**（见 §6.3 新增禁止项）。已知范围限制：remote 模式下只能看到本服务的 controller，对账不完整。
  - 变更编码或删除登记行会踢出持旧权限快照的会话（`kickOutUsersByResource`，`api-code-updated` / `api-removed`），与按钮资源一致。
  - 新增错误码 `16004 API_CODE_EXISTS`、`16005 API_NOT_FOUND`、`18005 API_PERMISSION_DENIED`、`18006 PERMISSION_REGISTRY_INCOMPLETE`，zh_CN / en_US 文案同步。
  - `docs/sql`：`init/{mysql,postgresql}/01-init-structure.sql` 增 `auth_api` 表（`auth_permission.resource_type` 注释同步为 `MENU/BUTTON/API`），`02-init-data.sql` 补「接口管理」菜单（`ApiManagementPage`，运营管理下）、「接口权限」菜单（`ApiPermissionPage`，权限管理下）、3 个按钮与 4 行 `auth_api` 种子，并为 `ADMIN` 角色生成 API 类型权限；新增 `unreleased/{mysql,postgresql}/01-api-permission.sql` 升级脚本，**先按 code 把 `auth_button` 上已授出的旧授权迁到 `auth_permission.resource_type=API` 再删旧行**，顺序不可颠倒，幂等可重放（按 `docs/sql/README.md` 约定，未发版脚本放 `unreleased/`，发版时整体更名为版本号目录）。
- `web`：**接口管理页与接口权限授权页**。`/system/operation/api`（`ApiManagementPage`：增删改查 + 「权限登记对账」标签页，模块字段用 `DictSelect dictCode="param_module"`）+ `/system/permission/api-permission`（`ApiPermissionPage`：授权树按模块分组，三态勾选与按钮权限页一致）。`PermissionResourceType` 增 `'API'`，`permissionService` 增 `listApis()`；抽出共享组件 `PermissionEffectCheckbox` 与 `utils/permission-effect.ts`，按钮权限页改为复用（行为与无障碍标签不变，原测试原样通过）。

- `docs/sql`：**补登记各模块内置按钮权限码**。`auth_button` 的种子行一直是手工维护的，只覆盖 `auth` 模块自身的 29 个按钮加通知模块的 7 个；`param` / `scheduler` / `frontend` 以及通知模块后续新增的按钮码只在代码里加了 `@NebulaPermission`，从未登记——后果与接口权限那段一样是静默的：管理端「按钮权限」页看不到、授不出去，端点对非 `ADMIN` / `SUPER_ADMIN` 一律拒绝，而启动期对账会持续把它们报成「未登记」。`init/{mysql,postgresql}/02-init-data.sql` 与新增的 `unreleased/{mysql,postgresql}/02-button-permission-backfill.sql` 一并补登记 12 个码：`NOTIFY_TEMPLATE_MANAGE` / `NOTIFY_SEND` / `NOTIFY_ANNOUNCEMENT_MANAGE` / `NOTIFY_RECORD_VIEW` / `NOTIFY_CHANNEL_TARGET_QUERY` / `PARAM_CREATE` / `PARAM_UPDATE` / `PARAM_DELETE` / `PARAM_GENERAL_CONFIG_EDIT` / `SCHEDULER_JOB_MANAGE` / `SCHEDULER_JOB_TRIGGER` / `FRONTEND_CACHE_DELETE`，并为 `ADMIN` 补齐授权行（升级脚本按 `code` upsert，幂等可重放）。**只补有真实归属菜单的码**：按钮权限页按菜单树逐个菜单拉取按钮，`menu_id` 指向不存在的菜单会让按钮在授权页不可见，等于没登记。剩下 8 个码（`STORAGE_UPLOAD`、`STORAGE_FILE_DELETE`、`FRONTEND_CONFIG_SAVE`、`FRONTEND_APP_RELEASE_CREATE/EDIT/DELETE`、`NOTIFY_PUSH_DEVICE_QUERY`、`NOTIFY_PUSH_TEST`）在框架内没有管理端页面、或由共享组件跨页调用，没有可挂的菜单，**不在本次范围**——按 `docs/spec/09-security.md` §2.3.3 它们应改判为接口权限（`@NebulaApiPermission` + `auth_api`），沿用上个版本迁移 `STORAGE_FILE_QUERY` 的做法。
- `web`：**通知模块的前端权限码与后端声明对齐**。`<Access permission="...">` 里的码是手写字符串，与 Java 常量没有任何编译期关联，于是通知模块的前端一路漂移在后端从未声明过的码上：模板页与发送面板用 `NOTIFY_SEND_EXECUTE`（后端是 `NOTIFY_SEND`），模板页的增删改用 `NOTIFY_TEMPLATE_CREATE/EDIT/DELETE`（后端已收敛为 `NOTIFY_TEMPLATE_MANAGE`），公告页的新建/编辑用 `NOTIFY_ANNOUNCEMENT_CREATE/EDIT`（后端已收敛为 `NOTIFY_ANNOUNCEMENT_MANAGE`）。这些码在 `auth_button` / `auth_api` 里都不存在，不会被任何角色授出——相关按钮对非 `ADMIN` / `SUPER_ADMIN` 恒不显示，包括本次刚补登记的那些码。现按后端声明改写 7 处字面量并同步 3 个测试的权限夹具；`NOTIFY_TEMPLATE_MANAGE` / `NOTIFY_ANNOUNCEMENT_MANAGE` / `NOTIFY_SEND` 的登记与授权已在上一段补齐，改完即可授权、可见。另同步全量核对了前端所有 `permission="..."` 字面量与后端 `*ButtonCodes` / `*ApiCodes` 的差集，现已为空。

### Fixed

- `nebula-notify` / `web`：**通知模块管理端三处显示与交互缺陷**（均由前端页面暴露，实际根因在渠道可用性与字段回填）。
  - **渠道目标的下拉里出现了邮件 / 站内信**：渠道目标是「非用户型投递端点」，用户型渠道（`SITE` / `EMAIL` / `PUSH`）按收件人投递，本就不该作为投递目标。服务端 `validateChannelTargetChannelType` 现直接拒绝用户型渠道（`NotifyChannelTypes.isUserChannel`，报既有错误码 `22039 CHANNEL_TARGET_CHANNEL_UNSUPPORTED`）；前端 `DictSelect` 新增 `optionFilter` 能力，渠道目标表单只展示三类群机器人渠道，从源头不给选。
  - **编辑模板时出现「变体 6」这种按序号猜出来的页签名**：旧实现用下标推断渠道，渠道集合一变（本次新增 `PUSH`）就错位。现页签标签直接由变体自身的 `channelType` 经 `DictLabel` 渲染，与顺序解耦——「变体 6」实际就是移动推送（`PUSH`）。
  - **通知记录「接收人」列显示 ID 而非姓名**：记录表只存 `receiverUserId`。现分页与详情响应在读取时回填 `receiverUserName`（按 id 查用户，取昵称优先）与 `targetName`（非用户型渠道查渠道目标名称），**查询失败仅留空并记 WARN，绝不影响记录读取**。（未做写时冗余，存量记录因此也能立刻显示姓名。）
- `docs/sql`：**PostgreSQL 全量初始化脚本因菜单 id 冲突而整段失效**。`init/postgresql/02-init-data.sql` 的 `auth_menu` 插入里 `0196dbe0a6f17000a000000000000025` 出现了两次——一次是历史遗留的「站内消息」菜单（`/system/notify/site-message`，`SiteMessagePage` 早已不在前端菜单组件注册表里，`init/mysql` 侧没有这一行），一次是上个版本新增的「接口管理」。PostgreSQL 的 `ON CONFLICT (id)` 遇到同一条语句内的重复键会直接报 `cannot affect row a second time`，整条 `INSERT` 失败：带 `ON_ERROR_STOP` 时后续种子全部不执行，按 `docs/sql/README.md` 的 `psql -f` 用法则静默跳过，**新环境的菜单、按钮、授权种子一个都不落**。现移除这一行陈旧菜单（与 `init/mysql` 的菜单集合对齐），并在 `init/` 的清理段与 `unreleased/postgresql/01-api-permission.sql` 里按 `code` 精确删除存量行及其 `MENU` 授权——否则升级脚本的 `ON CONFLICT (id) DO UPDATE` 会把旧行改写成「接口管理」，而它原有的授权行会顺势变成「接口管理」的授权，让角色凭空多出一个菜单权限。

### Changed

- `nebula-storage`：**临时上传任务过期清理由 Spring `@Scheduled` 迁移为调度模块任务**（`storage.upload.task.cleanup`，`StorageUploadTaskCleanupJobHandler`，默认 cron `0 0 */6 * * ?` 保持不变）。此前该清理任务是进程内 `@Scheduled`，在定时任务管理页看不到、无法手动触发；现经 `@NebulaScheduledJob` 注册到 `nebula-scheduler`，可在页面查看执行记录、启停调频，并支持「立即执行」临时文件清理——手动触发时可传参数 `{"taskId":"..."}` 只清理指定任务。绑定成功后的实时清理仍走 `storage-upload-task-bound` 事件，行为不变。升级注意：依赖 `NebulaStorageAutoConfiguration` 的 `@EnableScheduling` 仍为其他内置 `@Scheduled` 任务保留，无需额外配置；`nebula-scheduler-api` 成为 `nebula-storage-core` 的新增依赖。
- `web`：**NebulaProvider 按 app locale 同步 dayjs 全局语言包**。antd `ConfigProvider` 的 locale 只管组件内置文案，DatePicker/Calendar 日历面板的月份、星期文案来自 dayjs 自身 locale，而项目从未注册 `dayjs/locale/zh-cn`，导致中文界面下日期面板月份/星期恒为英文。现于 `AntdProviderBridge` 中随 locale 切换执行 `dayjs.locale('zh-cn' | 'en')`；`dayjs` 由传递依赖提升为显式依赖。
- `docs/spec/09-security.md`：§2.1 资源类型表增 `API` 与"资源登记表"对照（含 BUTTON / API 选型规则），§2.2 `resolveResourceCode` 示例补 API 分支，§2.3.3 由"两条独立要求"扩为三条（新增"权限码必须有登记行"，并说明注解与登记行不会自动同步）、补"登记对账"小节，§6.3 增 3 条禁止项（只在代码加注解不登记 / 把接口权限码写成 `*ButtonCodes` / 在对账服务里自动补写登记行），§7.2 与 §7.3 速查表补 API 编码与 `@NebulaApiPermission`。
- `docs/spec/04-database.md`：auth 模块表清单增 `auth_api`，索引示例补 `uk_api_code` / `idx_api_module`。
- `.github/workflows/release.yml`：**发布流程固定 Maven 3.9.12，不再用 runner 自带的 Maven**。`ubuntu-latest` 镜像已升到 Maven 3.10.0，其 Resolver 2 会往 central-publishing 的 staging 目录写入 `maven-metadata-local.xml` / `_remote.repositories` / `.locks` 等残留文件（apache/maven#13388），而 `central-publishing-maven-plugin`（含最新 0.11.0）只清理 `maven-metadata-central-staging.xml`——残留文件被打进 bundle 后被 Central Portal 校验拒绝（`Bundle has content that does NOT have a .pom file`，逐模块列出，实际各模块 `.pom` 均已正确 staged）。工作流改为从 Maven Central 下载固定 3.9.12 并置于 PATH 首位，发布前打印 `mvn -v` 便于回溯；**后续若要改动该版本，需确认新版本不再写这些残留文件**。

## [0.2.4] - 2026-10-07

> 说明：`0.2.3` 打标签时漏把 `docs/sql/unreleased/` 更名成 `0.2.3/`，本版把两版的落库变更合并进
> `docs/sql/0.2.4/`；所以下述条目里包含 `0.2.3` 已发布的功能（通知类别与订阅偏好、应用版本发布、
> 移动推送、对象存储与图片处理）。从任何低于 `0.2.4` 的版本升级，执行 `0.2.4/` 下的脚本一遍即可。

### Added

- `nebula-notify`：**通知类别与订阅偏好**（服务端 A/B/C 段）。
  - 类别体系：通知类别落库为 `sys_notify_category`（`code` 唯一且创建后不可改，另有 `name` / `description` / `mandatory` / `defaultEnabled` / `allowedChannels` / `sort` / `builtin` / `enabled`），种子 5 行内置类别 `SECURITY` / `TODO` / `BUSINESS` / `ANNOUNCEMENT` / `DEFAULT`。管理员可在「系统管理 → 通知管理 → 通知类别」自助增删改：内置类别不可删除、编码不可修改，被模板引用的类别禁删（只能先改模板或改为「停用」），停用后不出现在消息设置页也不能被新模板选中、存量模板仍按原类别判定。`sys_notify_template` 与 `sys_notify_record` 新增可空列 `category_code`；`SendNotifyCommand.categoryCode` 已 `@Deprecated` 并被**忽略**（传了打 WARN），类别只认模板上的值。存量模板与调用点无需改动，空值一律归入 `DEFAULT`，行为与改造前一致。
  - 偏好存储与判定：新增 `sys_notify_user_preference`（类别 × 渠道 × 开关）与 `INotifyPreferenceService`（单点 + 批量判定）。判定优先级固定为「`SITE` → 直接放行」「渠道不在类别 `allowedChannels` 内 → 拒绝 `CHANNEL_NOT_ALLOWED`」「`mandatory` 类别 → 放行」「有用户记录 → 用记录值」「无记录 → 用类别 `defaultEnabled`」。类别元数据从库中读取（走缓存），未知 code 记 WARN 后放行；`SITE` 渠道永不参与判定，始终投递并落库。
  - 发送分发接入：被抑制的渠道跳过投递，但**仍落一条 `sys_notify_record`**，带 `category_code`、`send_status=SUPPRESSED` 与 `fail_reason`（取值见 `NotifyPreferenceReasons`），使「通知没到」可区分是偏好挡住还是发送失败。扇出多用户时按渠道做一次批量预取，N 个用户不产生 N 次查询。群机器人等无 `receiverUserId` 的投递不参与判定。
  - 接口：`GET/PUT /api/notify/preferences/current` 与 `POST /api/notify/preferences/current/reset`，返回启用中的类别清单（含服务端算出的 `editable`，客户端据此置灰）与各渠道开关；查询与更新返回同一结构。强制类别与 `SITE` 渠道不被用户提交覆盖（静默忽略），非法类别/渠道/重复项分别报 `22032`–`22034`。
  - 类别管理接口：`POST /api/notify/categories`、`PUT|DELETE|GET /api/notify/categories/{id}`、`POST /api/notify/categories/page`、`GET /api/notify/categories/list`（模板表单下拉用，只回启用中的类别，按 `sort` 排序），写操作记审计；配套权限码 `NOTIFY_CATEGORY_CREATE` / `NOTIFY_CATEGORY_EDIT` / `NOTIFY_CATEGORY_DELETE` / `NOTIFY_CATEGORY_QUERY`。
  - 新增错误码 `22032 PREFERENCE_CATEGORY_UNKNOWN`、`22033 PREFERENCE_CHANNEL_UNSUPPORTED`、`22034 PREFERENCE_ITEM_DUPLICATE`、`22037 CATEGORY_CODE_UNKNOWN`（模板侧校验与日志，不返回给客户端）、`22040 CATEGORY_NOT_FOUND`、`22041 CATEGORY_CODE_EXISTS`、`22042 CATEGORY_BUILTIN_PROTECTED`、`22043 CATEGORY_IN_USE`、`22044 CATEGORY_CHANNEL_UNSUPPORTED`；`NotifyRecordStatus` 新增 `SUPPRESSED`，zh_CN / en_US 文案同步。
  - `docs/sql`：`0.2.4/{mysql,postgresql}/01-notify-category-preference.sql` 升级脚本就地改写为「建 `sys_notify_category` + 写 5 行内置类别种子 + `DROP TABLE IF EXISTS sys_notify_user_setting` + 补「通知类别」菜单/按钮与 ADMIN 授权」，幂等可重放；`init/` 全量脚本同步。类别种子沿用 `019cf114a00070008000000000000046`–`4a` 段，菜单 `NOTIFY_CATEGORY`、按钮 `...0104`–`0107`。
- `nebula-auth`：**客户端接口面准入（client scope）**——按请求来源判定客户端作用域，为受限客户端提供「默认拒绝白名单之外」的接口面。
  - `IClientScopeResolver` SPI（`nebula-auth-api`）+ `DefaultClientScopeResolver`（恒返回 `INTERNAL`）+ `ClientScopeInterceptor`（`/api/**`）。判定链按 `@Order` 取首个非 null 结果，未知作用域按 `default-scope` 处理并记 WARN；Resolver 抛异常按**拒绝**（fail-closed）并记 ERROR。
  - 配置 `nebula.auth.client-scope.*`（`enabled` / `dry-run` / `default-scope` / `scopes.<SCOPE>.allow`），`allow` 为路径白名单，匹配规则与 MVC 一致（复用 `PathPattern`）：精确匹配、`/**` 递归、`/*` 单层，未命中即拒绝。通配符写错、`default-scope` 指向未声明作用域等在**启动期**失败。
  - **对现有部署默认不改变行为**：`default-scope` 默认 `INTERNAL`（不限制），只有业务侧显式提供 Resolver 把某类账号判为受限作用域后才开始拦截。灰度用 `dry-run=true`（命中拒绝规则只记 WARN 仍放行）。
  - 新增错误码 `18003 CLIENT_SCOPE_DENIED`、`18004 CLIENT_SCOPE_CONFIG_INVALID`，zh_CN / en_US 文案同步。
- `nebula-auth`：新增 `InterceptorOrders` 常量并给作用域、按钮权限两个拦截器显式设定 order（作用域 0、按钮权限 100），把「先判作用域、再判权限」变成确定契约——顺序错会让被拦请求报出错误的错误码（`18002` 而非 `18003`）。
- `nebula-storage` / `nebula-param` / `nebula-scheduler` / `nebula-audit` / `nebula-notify`：**补齐写/管理接口的按钮权限注解**。此前这些模块的控制器 `@NebulaPermission` 数量为 0，而按钮权限是唯一的运营级校验来源（无注解的方法不做任何校验），叠加安全链只要求「已登录」，等于任何已登录账号都能改系统参数、列出并删除全系统文件、启停定时任务、读全量审计日志。现按模块补充权限码常量（`StorageButtonCodes` / `ParamButtonCodes` / `SchedulerButtonCodes` / `AuditButtonCodes` / `NotifyButtonCodes`）并逐接口标注；面向当前用户的接口（`/announcements/current/**`、`/site-messages/**`、`/frontend/preferences/**`、`/profile*`）**刻意不加**，它们靠登录态与 `userId` 过滤，加了反而会让普通用户看不到自己的消息。各模块新增 `*ButtonPermissionCoverageTest` 防回归。
- `nebula-frontend`：**应用版本与升级检查**（移动端能力 #4）。新增 `frontend_app_release` 发布记录表（平台/渠道 × 整数构建号，`release_status` 取 `DRAFT`/`PUBLISHED`/`WITHDRAWN`）与 `IAppReleaseService`：客户端检查接口 `POST /api/frontend/app-release/check`（**匿名可调**，升级提示必须早于登录才能生效）按平台+渠道取"最新已发布"记录，返回 `latestVersionCode` / `latestVersionName` / `minSupportedVersionCode` / `upgradeAvailable` / `forceUpgrade` / `downloadUrl` / `releaseNotes`。判定用**整数** `versionCode` 比较（`"1.10.0"` 与 `"1.9.0"` 的字符串比较结果是错的）；`upgradeAvailable = latest > 当前`，`forceUpgrade = 当前 < minSupported`。**无发布记录不报错**，按"无更新"返回，避免全新平台客户端启动受阻。管理端 `POST /app-releases/page`、`GET|POST|PUT|DELETE /app-releases[/{id}]` 提供增删改查，撤回即把状态置为 `WITHDRAWN`（保留记录，不物理删除，物理删除只用于误录入）；新增 `FrontendButtonCodes` 权限码并在 `FrontendController` 的 `saveFrontendConfig` / `deleteCache` 上补齐（关闭接口面准入那批记录的已知缺口）。
  - `init` 契约扩展：`GET /api/frontend/init` 新增可选查询参数 `platform` / `channel`，传了才在 `frontendConfig` 里带上 `minSupportedVersionCode` / `latestVersionCode`，让客户端冷启动一次请求即可在渲染任何业务界面之前完成强制升级判定。不传则两字段为 null，Web 控制台行为不变。
  - 渠道缺省回退映射写死在 `AppPlatforms`：`IOS→APP_STORE`、`ANDROID→INTERNAL`、`OHOS→APP_GALLERY`、`H5→WEB`，避免客户端不传渠道时静默查不到记录。
  - 新增错误码 `41010`–`41016`（不存在 / 平台不支持 / 版本号非法 / 版本号重复 / 强制升级缺下载地址 / 最低支持版本高于最新 / 发布状态非法），zh_CN / en_US 同步。
  - `docs/sql`：新增 `0.2.4/{mysql,postgresql}/02-app-release.sql` 升级脚本，`init/` 全量脚本同步。
- `nebula-notify`：**移动推送与设备注册**（移动端能力 #2；服务端 A 段 + iOS APNs 发送器）。此前 PUSH 只落了契约骨架（类型与接口，无运行时行为），本次补齐实现。
  - 设备表 `sys_notify_push_device`：一台设备一行，`device_id` 全局唯一（一台设备同时只归属一个用户）。设备状态 `ACTIVE` / `INVALID`（厂商反馈 token 失效） / `UNREGISTERED`（用户登出注销）。**归属只来自登录态**——注册/注销/心跳请求体里没有 `userId` 字段，任何登录用户都无法触碰他人设备。换人登录同一台设备时**重归属**而不是新增行，否则已登出用户会继续收到该设备的推送（串号泄露）。
  - 设备生命周期接口：`POST /api/notify/push-devices`（Upsert，token 轮换、权限状态、客户端版本一并刷新）、`DELETE /api/notify/push-devices/{deviceId}`、`POST /api/notify/push-devices/heartbeat`、`GET /api/notify/push-devices/current`。这四个面向当前用户，**刻意不加权限码**（加了会让普通用户看不到自己的设备）；管理端的 `POST /api/notify/push-devices/page` 与 `POST /api/notify/push/test` 带权限码，测试推送另记审计。注销时 `push_token` **真清空**（走 `LambdaUpdateWrapper` 整列更新：实体式 `updateById` 会跳过 null 字段，个人数据清不掉）。
  - 发送分发：`PUSH` 作为**用户维度渠道**接入 `INotifyService.sendNotify`，因此偏好判定自动生效（`PUSH` 已列入 SECURITY/TODO/BUSINESS/DEFAULT 的 `allowedChannels`；`ANNOUNCEMENT` 仅 `SITE`，公告不经推送投递）。模板的 PUSH 变体内容为推送 JSON（`{title, body, deeplink, collapseKey, extra}`）；变体不是合法 JSON 或缺 `body` 时**失败并记 `PUSH_TEMPLATE_INVALID`**，不把整段 JSON 推给用户。发送记录里存渲染后的可读标题与正文，不存 JSON。
  - 扇出 `PushDispatcher`：取该用户的活跃设备 → 逐台投递 → 汇总 → 落明细。**单台失败不中断其余设备**，且推送异常绝不冒泡到业务调用方（业务侧常是"派单 + 通知"同一事务，推送失败回滚派单是本末倒置）。按 `userId` 过滤、指定 `deviceId` 时校验归属（不符按"不存在"处理）；超过 `nebula.notify.push.max-devices-per-user` 按最后活跃时间截断并打 WARN。用户在系统设置里关掉通知权限的设备只跳过推送（`NOTIFICATION_DISABLED`），站内信照常。
  - 逐设备投递明细 `sys_notify_push_record_detail`（设备、厂商、成败、厂商消息号、失败原因）。**单表不存 push_token**。被抑制也照常落 `sys_notify_record` 并注明原因，使"通知没到"可区分是没设备、权限被关、通道没配还是厂商拒绝。
  - iOS 发送器：`ApnsJwtSigner`（ES256 provider token：header `{alg,kid}` + payload `{iss,iat}`，DER 签名转 JOSE 定长 `r‖s`，base64url 去填充，token 复用 50 分钟）+ `ApnsPushChannelSender`（HTTP/2 单请求，`apns-topic` / `apns-push-type: alert` / `apns-priority: 10` / `apns-collapse-id`，正文 1500 字符截断）+ `PushHttpTransport` 出口（JDK `HttpClient`，5s 连接 / 10s 请求超时）。**凭据齐备才注册 Bean**，缺任一即不注册，命中时记 `PROVIDER_NOT_CONFIGURED`，而不是等线上第一条派单才发现漏配。
  - **token 回收只针对厂商明确反馈无效的情况**（`BadDeviceToken` / `Unregistered`）。刻意不含 `ExpiredProviderToken`（那是自己的 JWT 过期，属服务端问题）与 `DeviceTokenNotForTopic`（topic 配错，是全量配置问题）——把配置事故当作 token 失效处理，一次就会把整张设备表刷成 `INVALID`。
  - 新增错误码 `22038 PUSH_TEMPLATE_INVALID`、`22039 CHANNEL_TARGET_CHANNEL_UNSUPPORTED`（PUSH 不能配成 `sys_notify_channel_target`，否则是一条永远不生效的死配置），zh_CN / en_US 文案同步；新增权限码 `NOTIFY_PUSH_DEVICE_QUERY` / `NOTIFY_PUSH_TEST`。
  - `GET /api/frontend/init` 新增 `push` 节点（`enabled` + `vendors`）：客户端不必硬编码该初始化哪个推送 SDK。节点里列出的厂商都是**服务端确实能投递的**（有已注册发送器），列表为空即"不要初始化任何推送 SDK"；`enabled` 由列表是否为空推导，不另设开关，避免两侧配置不一致。结果用列表而非单值是因为 Android 同一份安装包在不同品牌手机上要用不同厂商通道，只能由客户端按设备品牌再选一次。
  - `docs/sql`：新增 `0.2.4/{mysql,postgresql}/03-notify-push-device.sql` 升级脚本（两张新表，含 `device_id` 唯一索引与 `(user_id, device_status)` 联合索引），`init/` 全量脚本同步。
- `nebula-storage`：**存储增强：对象存储与图片处理**（移动端能力 #5）。此前对象存储只有 MinIO 实现，且完全没有图片处理能力。
  - 新增 **S3 兼容** `StorageBinaryStore`（`nebula.storage.content.type=s3`），一份实现覆盖阿里云 OSS / 腾讯云 COS / 七牛 / MinIO 等；endpoint、region、bucket、AK/SK **只走配置（环境变量）**，不入库入仓，`S3ObjectAddress` 仅做寻址诊断且不含凭证；`createBucketIfMissing` 默认 `false`，未显式开启时行为不变。
  - 图片派生版本 `storage_file_variant`（`thumb` 等）：上传后按配置生成（`image.enabled` **默认 `false`**，关闭时行为与改造前完全一致），内容按 `(fileHash, variant)` 寻址去重，多个业务引用同一张图只存一份缩略图。派生是"可选存在"——未开启或处理失败时没有派生行，读取端回退原图。
  - 读取：`GET /api/storage/download` 增加可选 `variant` 参数（缺省为原图，既有调用不变），文件详情响应增加 `variants`（可用派生版本与尺寸）。
  - **防解压炸弹**：解码前先读图片头部尺寸，超过像素或字节上限直接拒绝（`IMAGE_DIMENSION_EXCEEDED`），格式白名单 jpeg/png/bmp/gif，非图片或畸形输入返回"无派生"而不是硬试。
  - 存储后端迁移入口（`StorageMigrationService`，`db` → `filesystem` / `s3`）：逐项 MD5 校验 + 守卫拒绝写入（`MIGRATION_IN_PROGRESS`），避免迁移与写入互相覆盖。**注意：该工具尚未交付触发入口（管理接口/命令行均未提供）**，属规划中能力；守卫为进程内状态，前提是迁移期间应用单实例运行（或停机窗口内执行）。
  - `POST /api/storage/files/list-by-source` 由内部能力开放为正式接口（按业务实体查附件，供移动端列表页取图）；文件删除补齐 `STORAGE_FILE_DELETE` 权限码。
  - `docs/sql`：新增 `0.2.4/{mysql,postgresql}/04-storage-file-variant.sql` 升级脚本（纯新增表，幂等），`init/` 全量脚本同步。
- `nebula-auth`：**恢复「自动建号默认角色 / 默认组织」并新增用户创建事件**。此前 bdd85606 移除了 OAuth2 默认角色/组织参数、把「建号不绑角色」交给业务侧，但业务侧拿到建号时机太晚——登录在创建用户后紧接着签发会话，而领域事件在事务提交后才派发，届时不绑角色则本次会话拿不到角色，绑定（若触发权限刷新）反而会让刚发的 token 失效。因此恢复同步绑定 + 补建号事件供事后反应。
  - 系统参数（参数中心，非静态 `application.yml`）：`login.oauth2.default-role-id` / `login.oauth2.default-org-id`（常量 `AuthLoginParamKeys.DEFAULT_ROLE_ID` / `DEFAULT_ORG_ID`，读取入口 `AuthLoginConfigSupport.getDefaultRoleId()` / `getDefaultOrgId()`）。键名沿用该参数被移除前的历史前缀，但**作用域是所有自助注册自动建号**：OAuth2 首登、用户名注册、手机号与邮箱验证码首次登录；后台「用户管理」建号不受影响（那里由管理员显式选择角色）。**空值即不绑定**；配置的角色 / 组织不存在时**快速失败**（`ROLE_NOT_FOUND` / `ORG_NOT_FOUND`）并回滚建号，不静默建出一个无角色账号。组织以「主组织」写入。
  - 绑定逻辑收敛到 `UserDefaultRoleOrgBinder`，由四条自助注册建号路径在建号事务内调用（`DefaultUserAutoProvisionService.createOAuth2User`、`LoginServiceImpl.register` / `createPhoneUser` / `createEmailUser`），不是事件监听器——原因见上。业务若覆盖 `UserAutoProvisionService` SPI，即自行接管 OAuth2 路径的默认角色 / 组织。
  - 新增领域事件 `UserCreatedEvent`（`nebula-auth-api`，eventType `auth-userCreated`），payload 含 `userId` / `username` / `nickname` / `email` / `phone` / `source`（`REGISTER` / `OAUTH2` / `ADMIN`）。在**全部五个建号点**发布：用户名注册、手机号首次登录建号、邮箱首次登录建号、OAuth2 自动开通（仅在账号行落库成功、即确为新建用户时发；并发冲突回退为「已绑定登录」不发）、后台建号。事件在提交后派发，供业务做事后反应（建客户档案、绑业务角色等）。
  - `docs/sql`：`init/{mysql,postgresql}/02-init-data.sql` 补两行 `sys_param`（`param_value` 为空）；新增 `0.2.4/{mysql,postgresql}/05-default-role-org-param.sql`，幂等且**不覆盖已有值**（`INSERT IGNORE` / `ON CONFLICT DO NOTHING`），避免重放把运维配好的默认角色重置回空。

- `nebula-storage`：**一厂商一模块的对象存储后端**，取代此前的通用 S3 兼容实现。
  - 新增契约模块 `nebula-storage-provider-spi`：`StorageBinaryStore` / `StorageContentProvider` / `StorageContentProviders`（按 `type` 选择）以及对象存储公共骨架 `AbstractObjectStorageBinaryStore`（bucket 惰性创建、直链开关、有效期截断、RFC 5987 下载名编码）。
  - 新增三个厂商模块，各用各家**原生 SDK**：`nebula-storage-provider-minio`（`io.minio:minio`，从 core 迁出）、`nebula-storage-provider-aliyun-oss`（`com.aliyun.oss:aliyun-sdk-oss`）、`nebula-storage-provider-tencent-cos`（`com.qcloud:cos_api`）。
  - `nebula.storage.content.type` 由枚举改为自由字符串，取值即 provider 的 `type()`：`filesystem` / `db` / `minio` / `aliyun-oss` / `tencent-cos`。新增厂商只需加模块，核心层不改一行。
  - 只有被 `type` 选中的后端建立外部连接，配置校验也只在选中时执行——未选中模块的配置即使为空也不影响启动。
  - `type` 填了未安装的后端在**启动期**直接失败，错误信息列出「当前已安装的类型」与对应模块名，而不是运行期报 "no qualifying bean"。
  - 每个厂商模块自带 `nebula.storage.content.<vendor>.*` 配置与自动配置，靠 `META-INF/spring/...AutoConfiguration.imports` 生效；`nebula-app-starter` 与 `nebula-storage-service` 默认引入全部三个厂商模块。
- `nebula-storage`：**上传时落上内容类型**。对象键带扩展名（`<hash>.<ext>`），上传即按扩展名推导 Content-Type 写入对象，不再依赖下载时用响应头覆盖纠正——阿里云 OSS 拒绝该覆盖（实测 400 `InvalidRequest`），这是此前 OSS 直链报错的根因之一。
- `nebula-storage`：**强制下载文件名按 RFC 5987 编码**（`filename*=UTF-8''...`，并附 ASCII 回退名），中文文件名不再乱码。
- `nebula-storage`：新增端到端验收测试 `StorageAliyunOssIT`（真实 OSS，环境变量门控、不进入 `mvn test`），覆盖上传 → 绑定 → 预览直链 → 带中文名的下载直链 → 服务端代理读取，结束时清理测试对象。

### Changed

- `nebula-auth`：作用域准入的失败取态与通知偏好判定相反（此处 fail-closed，偏好判定 fail-open），两者不可互相套用；见 `docs/spec/09-security.md` §2.3.3。
- `nebula-notify`：**删除偏好总开关** `nebula.notify.preference.enabled`（连同 `nebula.notify.preference.*` 整段配置与免打扰时区默认值）：偏好判定不再可关闭，永远生效。影响面见「升级注意」。
- `nebula-notify`：偏好表不可用时**放行**（fail-open，与客户端接口面准入的 fail-closed 方向相反，两者不可互相套用）；放行即照常投递并落 `SUCCESS`/`FAILED`，不写 `SUPPRESSED`，仅打 ERROR 日志。类别表不可用时同样放行，并记 WARN。
- `nebula-notify`：推送总开关 `nebula.notify.push.enabled` **默认 `false`**，同时充当回退杠杆——线上出问题时关掉开关即停止一切推送投递与设备注册，站内信与邮件完全不受影响。厂商凭据只从环境变量读取（`NEBULA_NOTIFY_PUSH_APNS_*`），一处也不落库落仓。
- `nebula-frontend`：`GET /api/frontend/init` 新增 `push` 节点，只在请求带 `platform` 且推送模块在进程内、且该端确有可用厂商通道时才出现；不满足时该节点整体缺席（客户端回退到轮询 + 站内信），与版本策略字段的处理一致。
- `nebula-web`：新增「系统管理 → 通知管理 → 通知类别」管理页（菜单 `NOTIFY_CATEGORY`、组件 `CategoryManagementPage`）；通知模板页的类别下拉与列表展示改为读取 `GET /api/notify/categories/list`，不再硬编码五个类别，未出现在列表中的 code 原样显示（例如已停用的类别）。
- `nebula-web` / `mobile` / `packages/client-sdk`：消息设置（个人信息页）下线免打扰时段 UI、校验与 `quietHours` 契约，更新偏好只提交渠道开关。

- `nebula.storage.content.type` 改为字符串（Spring 宽松绑定）；`nebula.storage.content` 下不再有内置的 `s3` / `minio` 段，改为由各 provider 模块提供自己的 `<vendor>` 段。
- `nebula-app-runner` 的 `application.yml` 补上对象存储各后端的环境变量占位符。此前规范里写了 `NEBULA_STORAGE_S3_*` 却没有任何 `${...}` 引用，配了也不生效。
- 文档与清单同步：`docs/spec/10-config.md` §5.4、`nebula-storage/README.md`、`nebula-app/README.md`、根 `README.md`、模块指南 `storage.md`、`.env.example`、`docker-compose.yml`；`nebula-dependency` BOM 中四个已不存在的 `nebula-storage-service-*` 条目替换为新增的 provider 制品。

### Removed

- `nebula-notify`：**整体删除免打扰（quiet hours）**——`dndExempt` 类别属性、`sys_notify_user_setting` 表、`QuietHoursCommand` / `QuietHoursDto` / `QuietHoursReq` / `QuietHoursResp`、`NotifyPreferenceReasons.QUIET_HOURS`、偏好响应与请求里的 `quietHours` 字段，以及 `NotifyUserNotifySettingEntity` / `Dao` / `Mapper` 一并移除；`0.2.4/01` 脚本带 `DROP TABLE IF EXISTS sys_notify_user_setting`。
- `nebula-notify`：**删除偏好总开关** `nebula.notify.preference.enabled` 与 `NotifyProperties.Preference` 嵌套配置（含 `default-quiet-timezone`）。
- `nebula-notify`：删除错误码 `22035 PREFERENCE_QUIET_HOUR_INVALID`、`22036 PREFERENCE_TIMEZONE_INVALID`（zh_CN / en_US 文案同步移除）。
- `packages/client-sdk`：删除 `QuietHoursResp` 及 `NotifyPreferenceResp.quietHours` / `UpdateNotifyPreferenceReq.quietHours`。

- `nebula-storage`：删除通用 **S3 兼容**后端（`type=s3`）及其全部实现：`StorageContentType`、`StorageStoreFactory`、`S3StorageBinaryStore`、`S3ObjectClient`、`AwsS3ObjectClient`、`S3ObjectAddress`。core 不再依赖 `software.amazon.awssdk:s3` 与 `io.minio:minio`。
- 配套删除 `nebula.storage.content.s3.*` 全部配置项（含 `region` 与 `path-style-access`）；`StorageS3IT` 由 OSS 版验收测试取代。

### Fixed

- `nebula-auth`：补齐缺失的 `auth.18002` 国际化文案。`BUTTON_PERMISSION_DENIED` 此前没有对应的 properties 条目，en_US 环境下会回落到中文默认文案。
- `nebula-auth-oauth2-provider-wechat`：**修复微信接口响应被误判为格式无效，导致小程序登录恒定失败**。微信的 `sns/jscode2session`、`cgi-bin/token`、`sns/oauth2/access_token` 等接口响应体是 JSON，但 `Content-Type` 一律返回 `text/plain`（带 `Accept: application/json` 也不变），而 Spring 默认的 Jackson 转换器只声明支持 `application/json`，`retrieve().body(XxxResponse.class)` 直接抛 `UnknownContentTypeException`。异常被 `HttpMessageConversionException` 分支捕获后一律归为 `INVALID_RESPONSE`（`19212`），真实原因（凭证无效、AppID 无效等）被完全掩盖——小程序 `wx.login` 换 session 的成功路径根本走不到，对外只看到笼统的「OAuth2提供商调用失败」。新增包内工具 `WechatRestClients`：复用容器 `ObjectMapper` 注册一个额外支持 `text/plain` 的 Jackson 转换器并置于转换器链首位，`WechatOAuth2ProviderClient` 与 `WechatAccessTokenProvider` 统一经它构建 `RestClient`（后者构造函数因此新增 `ObjectMapper` 参数，自动装配同步）。补 4 个 `text/plain` 响应回归测试（会话解析 / errcode 映射 / access_token 获取 / errcode 映射）。
- `nebula-notify`：集成测试的 H2 库改为按 Spring 上下文分配独立库名。此前共用固定库名（`DB_CLOSE_DELAY=-1`），出现第二个上下文时会重跑建表脚本，`CREATE INDEX` 等非幂等 DDL 二次执行失败，导致整个上下文加载失败。

- 阿里云 OSS 直链下载 403：通用 S3 实现要求用户自己设对寻址风格，配成 path-style 时 OSS 直接拒绝（`SecondLevelDomainForbidden`）。原生 SDK 自动使用虚拟主机风格寻址，该开关连同这个坑一起消失。
- 阿里云 OSS 直链下载 400：预签名请求上携带 `response-content-type` 会被 OSS 拒绝（`InvalidRequest`），`aliyun-oss` 模块不再发送该参数。
- 图片以 `application/octet-stream` 落地导致前端不渲染：改为上传时按对象键扩展名写入 Content-Type。


### 升级注意

- **对象存储后端换了实现形态，`type=s3` 已移除**（S3 兼容后端随 `0.2.3` 发布过，`0.2.4` 起不再提供）：升级后请把 `nebula.storage.content.type` 从 `s3` 改为具体厂商（`aliyun-oss` / `tencent-cos` / `minio`），配置段相应改为 `nebula.storage.content.<厂商>.*`。以阿里云 OSS 为例：

  ```yaml
  # 旧
  nebula:
    storage:
      content:
        type: s3
        s3:
          endpoint: https://oss-cn-hangzhou.aliyuncs.com
          access-key: xxx
          secret-key: xxx
          bucket: omni-mart
          region: oss-cn-hangzhou
          path-style-access: false

  # 新
  nebula:
    storage:
      content:
        type: aliyun-oss
        aliyun-oss:
          endpoint: https://oss-cn-hangzhou.aliyuncs.com
          access-key: ${NEBULA_STORAGE_ALIYUN_OSS_ACCESS_KEY}
          secret-key: ${NEBULA_STORAGE_ALIYUN_OSS_SECRET_KEY}
          bucket: omni-mart
  ```

  `region` 与 `path-style-access` 不再需要：前者由 SDK 从 endpoint 推导，后者是寻址开关，而 OSS 只支持虚拟主机风格；厂商 AK/SK 只走环境变量。漏改会在**启动期**直接失败并列出当前已安装的类型，不会静默降级。`filesystem` / `db` 的取值不变；仍用 `minio` 的请确保依赖中有 `nebula-storage-provider-minio`（`nebula-app-starter` 已默认引入）。

- 按钮权限码需要在 `auth_button` 表中有对应行（并通过 `auth_permission` 授予角色）才能被非超管用户获得；开启 `nebula.auth.permission.enforce-enabled=true` 之前，请先在管理端「按钮管理」建好本批新增的权限码，否则相关接口对 ADMIN / SUPER_ADMIN 之外的角色一律拒绝。本批不包含 `auth_button` 种子数据。
- 应用发布管理接口使用新增权限码 `FRONTEND_APP_RELEASE_QUERY` / `FRONTEND_APP_RELEASE_CREATE` / `FRONTEND_APP_RELEASE_EDIT` / `FRONTEND_APP_RELEASE_DELETE` 与 `FRONTEND_CONFIG_SAVE` / `FRONTEND_CACHE_DELETE`，同样需要先在管理端「按钮管理」建行并授权；前端管理页菜单本批未提供。`POST /api/frontend/app-release/check` 与 `GET /api/frontend/init` 是匿名接口，已登记在 `AuthProperties` 固定放行名单内，无需额外配置。
- **推送默认关闭**（`nebula.notify.push.enabled=false`），关闭期间设备**注册会被直接拒绝**（`PUSH_DISABLED`）——不留无用 token。要启用需同时具备：开关打开 + `NEBULA_NOTIFY_PUSH_APNS_KEY_ID` / `TEAM_ID` / `PRIVATE_KEY` / `TOPIC` 四个环境变量齐备（APNs 私钥只走环境变量，**禁止入库入仓**，与微信 AppSecret 同一处理）。四者缺任一则不注册发送器，命中时记 `PROVIDER_NOT_CONFIGURED` 并落明细。
- 本批**只实现 iOS（APNs）**。Android 与鸿蒙客户端注册的设备会因"无对应发送器"投递失败（不静默）；国内 Android 厂商通道在企业内部分发前提下因资质门槛不可实施，独立渠道接入需逐厂商评估。`GET /api/frontend/init` 的 `push.vendors` 会如实反映这一点（没有可用通道时为空数组）。
- 推送设备管理接口使用新增权限码 `NOTIFY_PUSH_DEVICE_QUERY` / `NOTIFY_PUSH_TEST`，需先在管理端「按钮管理」建行并授权；设备注册/注销/心跳/我的设备面向当前用户，**不加权限码**，无需配置。
- **通知偏好判定从此永远生效**（原 `nebula.notify.preference.enabled` 默认 `false`，本次已删除该开关）。已核实的影响面：群机器人通道不参与判定（无 `receiverUserId`）；`category_code` 为空的存量模板归 `DEFAULT`（`allowedChannels` 含 SITE+EMAIL+PUSH，全部放行）；无偏好记录的用户按类别 `defaultEnabled`，5 类内置类别默认全为 `true`。**唯一会变的场景**是被显式归为 `TODO` / `BUSINESS` / `ANNOUNCEMENT` 的模板走 `EMAIL` 或 `PUSH`——这三类的 `allowedChannels` 不含 EMAIL（`ANNOUNCEMENT` 还不含 PUSH），此前投递、升级后按 `CHANNEL_NOT_ALLOWED` 抑制。类别功能本身尚未发版，正式环境不会有这类模板；但开发/预发库里手工归过类的模板会突然被挡，升级前请先核对。用户在开关关闭期间保存过的偏好开关，升级后立即生效。
- 通知类别管理页与类别管理接口使用新增权限码 `NOTIFY_CATEGORY_CREATE` / `NOTIFY_CATEGORY_EDIT` / `NOTIFY_CATEGORY_DELETE` / `NOTIFY_CATEGORY_QUERY`；`0.2.4/01` 脚本已包含「通知类别」菜单、4 条按钮与 ADMIN 授权行，重复执行幂等。若既有环境跳过该脚本，需先在管理端「按钮管理」建行并授权，否则页面与接口 403。
- **默认角色 / 默认组织默认仍为「不绑定」**：两行 `sys_param` 的 `param_value` 为空，行为与升级前一致（自动建号用户无角色）。要启用，请在管理端「系统参数」把 `login.oauth2.default-role-id` / `login.oauth2.default-org-id` 配成已存在的角色 / 组织 ID。**注意它作用于所有自助注册建号**（含用户名注册与手机号 / 邮箱首次登录），本版没有「只给 OAuth2 建号绑角色」的单独开关——要收窄建号入口，请关掉 `login.username.allow-register` / `login.phone.allow-register` / `login.email.allow-register`。配错（ID 不存在）会让**建号直接失败**（`ROLE_NOT_FOUND` / `ORG_NOT_FOUND`），这是刻意的快速失败，别在没核对 ID 的情况下配。`0.2.4/05` 脚本幂等且不覆盖已有值。
- `UserCreatedEvent` 是新增事件，注入 `@NebulaEventListener(eventType = "auth-userCreated")` 即可监听；事件在**事务提交后**派发，监听器里读到的用户行已可见，但**不要**指望它来给本次登录会话补角色（会话在提交前已签发）——需要「开通即有角色」请直接配 `login.oauth2.default-role-id`。
- 存储增强的图片处理默认关闭（`nebula.storage.image.enabled=false`），不开图片处理时行为与升级前完全一致。
- 对象存储各后端的 `create-bucket-if-missing` 默认 `true`（沿用原 minio 的默认值，只在被选中的后端上生效）；多数云厂商的 AK 无建桶权限，生产建议显式设为 `false`。
- `db` 迁移到对象存储 / `filesystem` 的迁移服务已实现，但**触发入口尚未交付**（管理接口与命令行均未提供）；启用前请自行调用 `StorageMigrationService` 并**安排停机窗口**（迁移期间写入会被拒绝，且守卫为进程内状态，需单实例运行）。

## [0.2.2] - 2026-10-01

### Added

- `nebula-auth`：新增 `nebula-auth-oauth2-provider-wechat` 插件，配置按渠道分两级（`mini` / `web`）。小程序渠道支持 `POST /api/auth/wechat/mini-login`（入参 `code`、可选 `phoneCode`/`nickname`/`avatarUrl`，同一次请求直接返回 token，无浏览器重定向）；网站应用渠道（开放平台网站应用，浏览器扫码）支持 `connect/qrconnect` 重定向式登录（`prepare`/`callback`/`status` 三段式，与 GitHub 同一套 state 机制）。`providerUserId` 优先取 `unionid`、缺失退回 `openid`——同一开放平台账号下两渠道 unionid 一致，网站应用扫码绑定后小程序可直接登录同一账号；`session_key` 不落库、不进日志。
- `nebula-auth`：`OAuth2ProviderClient` SPI 新增 `buildAuthorizeUrl(state)` 默认方法；绑定流程对非 GitHub 的重定向式 provider（微信扫码）统一走该方法生成授权地址，`supportsBinding()` 按渠道回答（扫码可绑、小程序不可绑），个人信息页绑定列表据此展示微信扫码绑定入口。
- `nebula-auth`：`OAuth2ProviderClient` 新增 `supportsBinding()` 默认方法，微信小程序返回 `false`，绑定列表与绑定/解绑接口据此隐藏或拒绝该类 provider。
- `nebula-auth`：OAuth2 首次建号时按 `provider_attributes` 约定键写入昵称、头像、邮箱、手机号（GitHub 首次建号也会带上真实的 `name`/`avatarUrl`/`email`）；身份带手机号且该手机号已属既有账号时合并到该账号而非新建用户。
- `nebula-auth` / `nebula-param`：新增微信登录开关——系统参数 `login.oauth2.provider.wechat.enabled`（默认 `false`）与高级配置页「通用配置 → 微信登录」开关。该开关为提供商级，同时覆盖网站应用（扫码）与小程序两个渠道；`/auth/init` 额外返回 `wechatWebEnabled` / `wechatMiniEnabled` 两个渠道可用性字段，前端登录页据此只在网站应用渠道凭据齐备时展示微信扫码入口。
- `docs/sql`：新增 `0.2.2/{mysql,postgresql}/01-wechat-login-param.sql` 升级脚本（发布前位于 `unreleased/`），`init/` 全量脚本同步。

### Changed

- `nebula-frontend`：init 聚合契约不再各自复制一份同构对象。`FrontendInitDto.loginConfig` 直接复用 `nebula-auth-api` 的 `AuthInitDto`，`FrontendStorageInitDto.upload` 直接复用 `nebula-storage-api` 的 `StorageUploadPolicy`，删除 `FrontendLoginConfigDto` 与 `FrontendUploadConfigDto` 两个复制品，`FrontendServiceImpl.getInit()` 改为原样转发。`/api/frontend/init` 的既有字段不变，并借此补上了此前被静默丢弃的 `wechatEnabled` / `wechatWebEnabled` / `wechatMiniEnabled`（见 Added）。
- `docs/spec`：`*-api` 允许依赖其他模块 `*-api`（原为禁止项），用于聚合型契约复用生产方定义的对象，约束为不得成环、只传契约不传实现；`docs/spec/02-layering.md` 同时要求跨模块复用的 DTO 转 Resp 的 Mapper 必须显式声明 `unmappedSourcePolicy` / `unmappedTargetPolicy` 为 `ERROR`。
- `nebula-auth` / `nebula-frontend`：`LoginLocalConverter` 拆出 `AuthInitConverter` 承载 `AuthInitDto → AuthInitResp`，`FrontendLocalConverter` 承载 init 响应映射，两者均开启 MapStruct 双向严格策略。此前 MapStruct 的 `unmappedSourcePolicy` 默认 `IGNORE`，源侧新增字段而目标侧漏加时既不报错也不告警，值会被静默丢弃——微信渠道开关下发不到前端即由此产生。
- `docs/sql`：版本升级目录改为**目标版本**语义——目录名即「升级到该版本」，尚未发版的脚本统一放 `unreleased/`，发版时整体更名为新版本号。原 `0.1.0/`、`0.2.0/` 两个目录实际都随 `0.2.1` 发布（`v0.2.0` 及更早的 tag 里没有任何升级目录），现合并为 `0.2.1/`（`01-add-login-record-client-type`、`02-upload-policy-params`）。此前 `0.2.0` 环境升级到 `0.2.1` 只会执行 `0.2.0/`，会漏掉 `auth_login_record` 的端类型列；按目标版本目录执行后不再遗漏。

### Fixed

- `scripts/set-version.sh`：`--with-backend` 在「当前版本已等于目标版本」时提前退出，导致发版后按文档回填 `backend/pom.xml` 的 `<nebula.version>` 静默失效（模板会锁在上一版本）。现将该分支改为只更新 backend 引用，升版路径行为不变。
- `.github/workflows/sync-template.yml`：模板同步等待 Maven Central 元数据的上限由 15 分钟放宽到 60 分钟。Central 在 release 校验通过后异步发布，实测滞后可超过 50 分钟，原窗口导致每次发版的同步 job 必然失败。
- `.github/workflows/sync-template.yml`：新增 `NEBULA_TEMPLATE_TOKEN` 写权限前置自检（`git push --dry-run`，无副作用）。此前 token 只读时会在同步完成后才以 403 失败，日志只有一句 `denied to <user>`；现在在第一步就给出可操作的报错。
- `.github/workflows/sync-template.yml`：打 tag 步骤改为幂等——重跑 job 时 tag 若已存在不再以 `tag already exists` 中断，指向当前提交则跳过，指向别处则告警保持不动。

## [0.2.1] - 2026-09-30

### Added

- `nebula-storage`：上传策略参数 `storage.upload.max-file-size`（默认 100MB）、`chunk-threshold`（10MB）、`chunk-size`（5MB）、`allowed-extensions`（默认空=不限制）、`temp-retention-days`（14 天），均可在高级配置页「存储 → 上传配置」运行时调整，并随 `GET /api/frontend/init` 的 `storage.upload` 子树下发给前端（复用既有匿名可访问端点，不新增接口）。
- `nebula-storage`：新增错误码 `24018 FILE_TOO_LARGE`、`24019 EXTENSION_NOT_ALLOWED`，同步 zh_CN/en_US 文案；服务端强制点覆盖分片任务创建、整文件上传、分片上传（分片序号越界、单片超限、非分片任务拒收），`chunkCount` 由服务端按配置重算，不再信任客户端。
- `nebula-storage`：启动期传输口径自检 `StorageUploadCeilingGuard`——`spring.servlet.multipart.max-file-size` 小于业务上限时直接启动失败；参数中心启动期读不到时按默认策略继续断言。
- `web`：新增分片上传能力（`createUploadTask` / `uploadTaskPart` / `completeUploadTask`）、按阈值选路与真实进度的 `uploadFileWithPolicy`、上传策略缓存 store，并为上传控件与头像上传接入白名单 `accept` 与本地预校验。

### Changed

- `nebula-storage`：临时上传任务清理天数改由 `storage.upload.temp-retention-days` 决定，替换硬编码的 14 天。
- `docs/sql`：新增 `0.2.1/02-upload-policy-params-{mysql,postgresql}.sql` 升级脚本，`init/` 全量脚本同步。

### Fixed

- 修复上传大小策略「页面显示 100MB、实际 1.1MB 即 413」的静默失效：`spring.servlet.multipart.*` 是启动期装配项（Tomcat 在请求解析阶段限流），写在参数中心不生效，真正生效的是 Spring Boot 的 1MB 默认值。现改为 `application.yml` 静态配置（`max-file-size: 110MB` / `max-request-size: 120MB`），并新增 `server.tomcat.max-part-header-size: 10KB` 以支持长文件名；参数中心中的这两个 key 由 SQL 脚本显式清理（upsert 语义下仅删 INSERT 行不会清理存量库）。
- 修复前端丢弃 init 响应中 `storage` 字段导致策略无法下发的问题（`getAuthConfig()` 此前只取 `loginConfig`）。

## [0.2.0] - 2026-09-12

### Added

- `nebula-base-common`：以自动配置注册 `SpringBeanUtils`（静态 ApplicationContext 持有者），业务应用只扫描自身包时 `JsonUtils`、`IdGenerateUtils` 等静态工具类也能正常初始化。
- `nebula-base-mybatis`：以自动配置注册 `MetaObjectHandler`（`BaseFieldHandler`），业务应用只扫描自身包时也能自动填充 `create_time` / `update_time`；应用自行扫描到该组件时自动退让。
- `nebula-auth`：新增验证码下发扩展点 `VerificationCodeSender`（业务工程实现并注册 Bean 即可对接短信/邮件网关），以及 `nebula.auth.code.log-enabled`（仅本地联调，将验证码输出到日志）。
- `nebula-base-web`：`ApiResultAdvice` 改为随自动配置注册（此前仅组件扫描可达），业务应用只扫描自身包时返回值封装同样生效；新增跨域配置 `nebula.web.cors.*`（默认关闭），`allowed-origins` 非空时注册最高优先级的 `CorsFilter`，预检请求先于鉴权处理。
- `scripts/sync-template.sh`：本地生成模板内容（与 CI 同步规则一致），发布前可本地验证「一键启动」。

### Changed

- 模板工程：显式引入 Lombok；启动类增加 `@MapperScan("cn.cloudomni.nebula.template.**.mapper")`，业务 Mapper 放在 `<业务包>.**.mapper` 下即自动注册。
- 本地开发栈变量隔离：模板 `backend/docker-compose.yml` 的 MySQL/Redis 改用 `NEBULA_LOCAL_*`（库名、账号、端口），不再读取宿主机可能导出的 `NEBULA_APP_DATASOURCE_*`；应用进程仍按 Spring 约定读取 `NEBULA_APP_*`（README 已说明本地联调需 unset 或注释宿主机导出）。
- `01-init-structure-quartz-{mysql,postgresql}.sql` 改为在当前连接的库中建表（不再创建并切换到 `nebula_quartz` 库），与框架实际使用的数据源一致；`docs/sql/README.md` 同步更新。
- 模板 `application.yml` 增补跨域与验证码发送器配置示例；版本号 0.1.1 → 0.2.0。

### Fixed

- 修复模板工程「一键启动」阻断问题：`SpringBeanUtils` / `BaseFieldHandler` 未注册导致静态工具类初始化失败（`@NebulaAudit` 接口直接 500、`create_time` 为空），登录记录、字典、业务数据等所有写入失败；`ApiResultAdvice` 未注册导致业务工程拿不到统一返回值封装；Quartz 表建在 `nebula_quartz` 而应用连接业务库导致启动失败；`NEBULA_APP_DATASOURCE_*` 环境变量污染本地 compose。
- `nebula-web`：删除 `NebulaWebAutoConfiguration` 上无效的 `@MapperScan("cn.cloudomni.nebula.web")`（该包下无 Mapper），消除对 mybatis-spring 的隐式依赖与反射解析注解时的 `DaoSupport` 类缺失问题。
- `nebula-scheduler` / `nebula-event-remote`：以自动配置补齐 `SchedulerJacksonConfiguration` 与 `OutboxEventDao` / `EventConsumeRecordDao` 的注册，业务应用只扫描自身包时不会因缺少这些 Bean 启动失败（事件远程模式）。
- `scripts/set-version.sh`：末行提示 `$NEW_VERSION` 紧跟中文括号引发 `unbound variable` 并以非 0 退出，改为 `${NEW_VERSION}`。

### Security

- 手机验证码登录、邮箱验证码登录、找回密码不再使用固定验证码 `123456`，改为 `SecureRandom` 生成的 6 位随机码并保持原有有效期与发送频率限制；未配置 `VerificationCodeSender`（且未开启日志模式）时发送接口直接返回「验证码发送器未配置」，不再静默下发可预测验证码。
- `/api/auth/send-phone-code`、`/api/auth/phone-login`、`/api/auth/send-email-code`、`/api/auth/email-login` 纳入固定放行白名单，登录页的手机号/邮箱入口恢复可用（此前匿名调用一律返回「未登录或登录已过期」）。
