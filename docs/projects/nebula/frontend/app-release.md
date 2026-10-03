---
title: 应用版本与升级检查
date: 2026-10-02 11:05
tags: [nebula, guide]
---

# 应用版本与升级检查

`nebula-frontend` 提供应用版本发布管理与客户端升级检查能力，覆盖「发布新版本 → 客户端冷启动判定是否升级 / 强制升级 → 管理端撤回」的闭环。

## 1. 核心概念

- **一次发布 = 平台 × 渠道 × 整数构建号（`versionCode`）** 的一条记录，存在 `frontend_app_release` 表。
- 平台（`AppPlatforms`）：`IOS` / `ANDROID` / `OHOS` / `H5`。
- 发布状态（`AppReleaseStatus`）：`DRAFT`（草稿，不参与最新版本计算）/ `PUBLISHED`（参与）/ `WITHDRAWN`（保留记录但不再参与）。
- **用整数 `versionCode` 比较，不用字符串版本号**。字符串比较会得到错误结果：`"1.10.0" < "1.9.0"`。`versionName` 只作展示/记录。

### 1.1 平台默认渠道

客户端不传 `channel` 时按平台取默认渠道（写死在 `AppPlatforms` 的确定性映射）：

| 平台 | 默认渠道 |
| --- | --- |
| `IOS` | `APP_STORE` |
| `ANDROID` | `INTERNAL` |
| `OHOS` | `APP_GALLERY` |
| `H5` | `WEB` |

## 2. 客户端升级检查

### 2.1 独立检查接口（匿名可调）

```bash
curl -X POST "http://{host}/api/frontend/app-release/check" \
  -H "Content-Type: application/json" \
  -d '{ "platform": "ANDROID", "channel": "INTERNAL", "versionCode": 140, "versionName": "1.4.0" }'
```

请求字段：`platform`（必填）、`channel`（可空，空则取平台默认）、`versionCode`（必填，正整数）、`versionName`（可空，仅作记录）。

响应字段：`platform`、`channel`、`latestVersionCode`、`latestVersionName`、`minSupportedVersionCode`、`upgradeAvailable`、`forceUpgrade`、`downloadUrl`、`releaseNotes`、`publishedAt`。

判定规则：

- 取该平台+渠道下**最新已发布**记录（`releaseStatus = PUBLISHED`，按 `versionCode` 倒序取第一条）。`DRAFT` 与 `WITHDRAWN` 都不参与。
- `upgradeAvailable = latestVersionCode > 当前 versionCode`（普通可用更新）。
- `forceUpgrade = 当前 versionCode < minSupportedVersionCode`（**为 true 时客户端必须阻断进入业务界面**）。
- **无发布记录不报错**，按「无更新」返回（`upgradeAvailable=false`、`forceUpgrade=false`），避免全新平台的客户端启动受阻。

> 该接口**匿名可调**（登记在 `AuthProperties` 固定放行名单内）：升级提示（含强制升级的阻断）必须早于登录才能生效。平台不支持报 `41011`，版本号非法报 `41012`。

### 2.2 通过 init 一次拿全（推荐冷启动）

`GET /api/frontend/init` 新增两个可选查询参数：

| 参数 | 说明 |
| --- | --- |
| `platform` | 客户端平台，如 `ANDROID`；**不传则不下发版本策略** |
| `channel` | 客户端分发渠道；不传取平台默认渠道 |

传了 `platform` 时，`frontendConfig` 里会带上 `minSupportedVersionCode` 与 `latestVersionCode`；不传则这两个字段为 `null`，Web 控制台行为不变。

```bash
curl "http://{host}/api/frontend/init?platform=ANDROID&channel=INTERNAL"
```

这样客户端冷启动一次请求即可在渲染任何业务界面之前完成强制升级判定，无需再单独调 check。

客户端侧的两路判定（`mobile/src/upgrade`）：`evaluateUpgrade`（依据 check 响应）与 `evaluateUpgradeFromInit`（依据 init 的 `frontendConfig`），返回 `NONE` / `OPTIONAL` / `FORCE`。

## 3. 管理端发布管理

| 方法 + 路径 | 权限码 | 审计 |
| --- | --- | --- |
| `POST /api/frontend/app-releases/page` | `FRONTEND_APP_RELEASE_QUERY` | — |
| `GET /api/frontend/app-releases/{id}` | `FRONTEND_APP_RELEASE_QUERY` | — |
| `POST /api/frontend/app-releases` | `FRONTEND_APP_RELEASE_CREATE` | ✅ |
| `PUT /api/frontend/app-releases/{id}` | `FRONTEND_APP_RELEASE_EDIT` | ✅ |
| `DELETE /api/frontend/app-releases/{id}` | `FRONTEND_APP_RELEASE_DELETE` | ✅ |

管理端 CRUD 的共用校验：

- `minSupportedVersionCode > versionCode` → `APP_RELEASE_MIN_GREATER_THAN_LATEST`（`41015`）。
- `minSupportedVersionCode` 有值但 `downloadUrl` 为空 → `APP_RELEASE_DOWNLOAD_URL_REQUIRED`（`41014`）。
- 同平台+渠道+versionCode 已存在 → `APP_RELEASE_VERSION_EXISTS`（`41013`）。
- `releaseStatus` 不合法 → `APP_RELEASE_STATUS_INVALID`（`41016`）。
- 状态为 `PUBLISHED` 且 `publishedAt` 为空时取当前时间。

**状态省略语义（create 与 update 相反，注意）**：

- **create** 不带 `releaseStatus` → 默认 `DRAFT`（新记录无「当前状态」可保持）。
- **update** 不带 `releaseStatus` → **保持当前状态不变**，不会回落 `DRAFT`；`publishedAt` 同理——状态不变时原发布时间保留，只有「从非 PUBLISHED 显式改为 PUBLISHED」且未传 `publishedAt` 时才盖当前时间。这样「编辑已发布版本的备注」不会把版本打回草稿或重置发布时间。

**版本参数由服务层校验**：`versionCode`（必填、>0）与 `minSupportedVersionCode`（有值时 >0）在服务层校验，非法报 `41012`。Bean Validation 注解刻意不标注这两个字段——避免「注解层与 41012 口径分叉」；接口参数校验本身仍生效（如 `platform` 空白会被 Bean Validation 拦下）。

**撤回**：没有独立接口——通过 `PUT` 把 `releaseStatus` 置为 `WITHDRAWN` 完成，记录保留、不再参与最新版本计算。物理删除只用于误录入。

> 这些权限码需先在管理端「按钮管理」建行并授权；前端管理页菜单本批未提供。

## 4. 失败取态：版本检查是 fail-open

`AppReleaseServiceImpl.checkAppRelease` 在查询发布记录抛错时 **catch 住、打 ERROR，按「无更新、不强制」返回**。

理由：版本服务不可用不应导致全部用户无法登录 / 无法进入 App。这与 [客户端接口面准入](../auth/client-scope) 的 **fail-closed**（安全边界出问题宁可挡住）方向**相反**，是有意取舍：

| 场景 | 取态 | 理由 |
| --- | --- | --- |
| 版本检查 | **fail-open** | 可用性问题，不应阻断用户 |
| 客户端作用域准入 | **fail-closed** | 安全问题，宁可挡住 |

两者不可互相套用，**不要把它们当成 bug**。

## 5. 错误码

| 错误码 | 名称 | 说明 |
| --- | --- | --- |
| `41010` | `APP_RELEASE_NOT_FOUND` | 发布记录不存在 |
| `41011` | `APP_RELEASE_PLATFORM_UNSUPPORTED` | 不支持的应用平台 |
| `41012` | `APP_RELEASE_VERSION_INVALID` | 版本号不合法 |
| `41013` | `APP_RELEASE_VERSION_EXISTS` | 同平台同渠道的该版本号已存在 |
| `41014` | `APP_RELEASE_DOWNLOAD_URL_REQUIRED` | 强制升级必须提供下载地址 |
| `41015` | `APP_RELEASE_MIN_GREATER_THAN_LATEST` | 最低支持版本不能高于最新版本 |
| `41016` | `APP_RELEASE_STATUS_INVALID` | 发布状态不合法 |

## 6. 数据表

`frontend_app_release` 的字段与索引见 [Frontend 数据表](./ddl)。

## 7. 配置

升级策略来自 `frontend_app_release` 表本身，**没有新增配置项**。匿名放行路径 `/api/frontend/app-release/check` 写死在 `AuthProperties.FIXED_EXCLUDED_PATHS`（不可配置），可在 `nebula.auth.excluded-paths` 追加其他公共路径。
