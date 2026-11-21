# 缓存管理页对接说明

本文档面向前端页面开发，描述 `nebula-frontend` 已提供的缓存管理接口、推荐页面结构、TypeScript 类型、交互流程与异常处理约定。

## 1. 页面目标

缓存管理页需要解决三个问题：

1. 让使用方看到当前系统里**全部**缓存命名空间——包括当前没有任何 Key 的命名空间，否则「没注册」和「注册了但为空」在页面上长得一样。
2. 让使用方知道本进程生效的**缓存模式**（`caffeine` / `redis`），以及每个命名空间实际落在哪个后端上。
3. 让使用方删除指定缓存项或清空整个命名空间，触发下游业务在下一次访问时重新生成缓存。

**受保护命名空间**（系统参数、会话/令牌、验证码、找回密码、在线用户、第三方登录态）只返回名称、模式、TTL 与条目数，**不返回 Key 与值**——会话缓存的 Key 本身就是令牌；它们只能整组清空。

## 2. 接口清单

### 2.1 查询缓存列表

- 方法：`GET`
- 路径：`/api/frontend/caches`
- 权限码：`FRONTEND_CACHE_QUERY`（`auth_api`）

### 2.2 删除缓存项

- 方法：`DELETE`
- 路径：`/api/frontend/caches/entries`
- 权限码：`FRONTEND_CACHE_DELETE`（`auth_button`，按钮「清除前端缓存」）
- Query 参数：
  - `cacheName`
  - `cacheKey`

### 2.3 清空缓存分组

- 方法：`DELETE`
- 路径：`/api/frontend/caches`
- 权限码：`FRONTEND_CACHE_DELETE`（同上）
- Query 参数：
  - `cacheName`

受保护命名空间没有 Key 清单，整组清空是它们唯一的清理入口。三个接口都只接受**已存在**的命名空间，传未知名字返回 `41006`（缓存名称不合法）而不是就地创建空缓存。

## 3. 统一响应结构

后端使用统一返回包装，前端可按下面结构解析：

```ts
export interface ApiResult<T> {
  code: string
  message: string
  data: T
}
```

成功时：

- `code === '0'`
- `message === 'success'`

## 4. TypeScript 类型定义

建议前端直接建立以下类型：

```ts
export interface FrontendCacheEntry {
  cacheKey: string
  cacheValueJson: string | null
  cacheValueType: string | null
  ttlSeconds: number | null
  remainingTtlSeconds: number | null
}

export interface FrontendCacheGroup {
  cacheName: string
  /** 该命名空间实际生效的缓存模式：'redis' | 'caffeine' */
  cacheMode: string | null
  /** 受保护命名空间：entries 恒为空，只能整组清空 */
  protectedCache: boolean
  defaultTtlSeconds: number | null
  /** 条目数；后端无法枚举（Redis 命名缓存）时为 null，页面展示「未知」而不是 0 */
  entryCount: number | null
  entries: FrontendCacheEntry[]
}

export type FrontendCacheListResp = ApiResult<FrontendCacheGroup[]>

export type FrontendDeleteCacheResp = ApiResult<null>
```

## 5. 字段解释

### 5.1 缓存分组字段

| 字段 | 说明 | 前端用途 |
|------|------|----------|
| `cacheName` | 缓存分组名 | 分组标题、删除入参 |
| `cacheMode` | 该命名空间实际生效的缓存模式，取值 `redis` / `caffeine` | 页面顶部展示「缓存模式」，排查「缓存到底落在哪个后端」 |
| `protectedCache` | 敏感命名空间标记；为 `true` 时后端不返回 Key 与值 | 分组打「受保护」标签，隐藏 Key 列表、引导走整组清空 |
| `defaultTtlSeconds` | 该缓存定义的默认 TTL | 分组说明信息 |
| `entryCount` | 当前分组条目数；为 `null` 表示后端无法枚举，**不要当 0** | 分组徽标、计数展示 |
| `entries` | 当前分组下缓存项列表；受保护命名空间恒为 `[]` | 表格数据源 |

### 5.2 缓存项字段

| 字段 | 说明 | 前端用途 |
|------|------|----------|
| `cacheKey` | 缓存项唯一键 | 表格主列、删除入参 |
| `cacheValueJson` | 缓存值序列化后的 JSON 字符串 | JSON 查看器 / 文本展示 |
| `cacheValueType` | 缓存值 Java 类型名 | 辅助信息、tooltip |
| `ttlSeconds` | 写入该缓存项时的原始 TTL | 展示原始缓存时长 |
| `remainingTtlSeconds` | 当前剩余 TTL | 展示剩余有效期 |

### 5.3 返回范围

- 列表返回的是**全部命名空间**：启动期由 `CacheDefinition` 注册的、运行时按需动态注册的，以及只在底层 `CacheManager` 上承载的命名缓存；没有条目的命名空间同样返回（`entryCount` 为 `0`）。
- `cacheMode` 由缓存实例类型求得，实例答不出来（租户前缀包装类）时回退到 `nebula.cache.type`——两者事实同源。
- 受保护命名空间按关键词匹配（`systemparam` / `session` / `token` / `verificationcode` / `forgotpassword` / `onlineuser` / `oauth2`），命中即只回名称、模式、TTL 与条目数。

## 6. 推荐页面结构

建议采用“两层结构”：

### 6.1 第一层：缓存分组视图

可选形式：

- 折叠面板
- Tabs
- 左侧缓存分组列表 + 右侧详情区

每个分组建议展示：

- 缓存名称 `cacheName`
- 默认 TTL `defaultTtlSeconds`
- 条目数量 `entryCount`（为 `null` 时展示「未知」，不要展示 0）
- 受保护标记 `protectedCache`
- 缓存模式 `cacheMode`（页面顶部整体展示一次即可，同进程内一般一致）

> 没有条目的分组不要隐藏。只有在「按缓存 Key 过滤」时才用条目数过滤分组，否则用户看不到「缓存已注册但当前为空」这一事实。

### 6.2 第二层：缓存项表格

建议表格列：

| 列名 | 对应字段 | 说明 |
|------|----------|------|
| 缓存键 | `cacheKey` | 建议支持复制 |
| 原始 TTL | `ttlSeconds` | 单位秒，可转分钟显示 |
| 剩余 TTL | `remainingTtlSeconds` | 建议加颜色提示 |
| 值类型 | `cacheValueType` | 长文本可省略显示 |
| 缓存值 | `cacheValueJson` | 建议 JSON 展开器 / Drawer |
| 操作 | - | 删除按钮；受保护分组引导用整组清空 |

## 7. 推荐交互流程

### 7.1 首次进入页面

1. 页面 mounted / onLoad
2. 调用 `GET /api/frontend/caches`
3. 将返回的 `data` 绑定到缓存分组列表
4. 默认展开第一个有数据的缓存分组

### 7.2 删除缓存项

1. 用户点击某行“删除”
2. 弹出二次确认，确认文案建议包含 `cacheName` 和 `cacheKey`
3. 调用：

```ts
DELETE /api/frontend/caches/entries?cacheName=${cacheName}&cacheKey=${cacheKey}
```

4. 删除成功后提示“删除成功”
5. 重新调用 `GET /api/frontend/caches` 刷新列表

### 7.3 清空缓存分组

1. 用户选中某个分组，点击「清空当前分组」
2. 弹出二次确认，确认文案带上目标分组名（如 `确认清空缓存「authSessionCache」下的全部缓存项？`）
3. 调用：

```ts
DELETE /api/frontend/caches?cacheName=${cacheName}
```

4. 清空成功后提示并重新拉取列表（受保护分组同样走这个入口）

## 8. 请求示例

### 8.1 查询缓存列表

```ts
export async function fetchFrontendCaches() {
  return request<FrontendCacheListResp>({
    url: '/api/frontend/caches',
    method: 'get',
  })
}
```

### 8.2 删除缓存项

```ts
export async function deleteFrontendCacheEntry(cacheName: string, cacheKey: string) {
  return request<FrontendDeleteCacheResp>({
    url: '/api/frontend/caches/entries',
    method: 'delete',
    params: {
      cacheName,
      cacheKey,
    },
  })
}
```

### 8.3 清空缓存分组

```ts
export async function clearFrontendCacheGroup(cacheName: string) {
  return request<FrontendDeleteCacheResp>({
    url: '/api/frontend/caches',
    method: 'delete',
    params: {
      cacheName,
    },
  })
}
```

## 9. 视图格式建议

### 9.1 TTL 展示

建议同时保留秒级真实值和更友好的文案：

```ts
export function formatSeconds(seconds?: number | null) {
  if (seconds == null) {
    return '-'
  }
  if (seconds < 60) {
    return `${seconds}s`
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}
```

### 9.2 缓存值展示

`cacheValueJson` 可能较长，建议：

- 表格中默认只显示前 80~120 个字符
- 点击“查看”后在弹窗 / Drawer / JSON Viewer 中完整展示
- 支持复制原始 JSON

## 10. 异常处理建议

### 10.1 删除失败

常见失败场景：

- `cacheName` 不存在
- `cacheKey` 为空
- 网络异常

建议统一提示：

- 优先展示后端返回的 `message`
- 无 message 时展示兜底文案：`删除缓存失败，请稍后重试`

### 10.2 空数据态

当接口返回空数组时，建议展示：

- 空状态插图 / 占位文案
- 文案示例：`当前没有可管理的动态缓存`

## 11. 使用限制说明

- 删除支持两种粒度：按缓存项删除，或按命名空间整组清空（`DELETE /api/frontend/caches`）。
- 受保护命名空间（系统参数、会话/令牌、验证码、找回密码、在线用户、第三方登录态）只回名称、模式、TTL 与条目数，**不回 Key 与值**：会话缓存的 Key 就是令牌本身。它们的清理入口只有整组清空。
- 列表覆盖全部命名空间：动态注册的、只由底层 `CacheManager` 承载的、以及当前没有条目的都会出现。只在底层 `CacheManager` 承载的 Redis 命名缓存无法枚举条目，此时 `entryCount` 为 `null`，页面应展示「未知」。
- `cacheMode` 表示该命名空间实际生效的后端（`redis` / `caffeine`），排查「缓存有没有真的进 Redis」看这个字段。
- 如果某个缓存名称同时被动态缓存和 `@Cacheable` 共用，Redis 模式下可能看到同名缓存空间的数据。
- 删除/清空接口不会因为误传缓存名称而创建新的缓存分组：未知名字返回 `41006`。

## 12. 推荐前端状态设计

建议页面状态最少包含：

```ts
interface CachePageState {
  loading: boolean
  deleteLoading: boolean
  clearLoading: boolean
  groups: FrontendCacheGroup[]
  activeCacheName: string | null
  selectedEntry: FrontendCacheEntry | null
}
```

## 13. 最小落地方案

如果要先快速上线，可按下面最小方案做：

1. 顶部展示缓存模式，并用缓存分组下拉框或 Tabs 选择分组。
2. 下方用单表格展示当前分组的 `entries`；分组没有条目时展示空态而不是隐藏分组。
3. 提供“查看 JSON”“删除”“清空分组”三个操作。
4. 删除或清空成功后直接全量刷新列表。

这个方案实现成本最低，也足够支撑缓存排查和手动重建场景。
