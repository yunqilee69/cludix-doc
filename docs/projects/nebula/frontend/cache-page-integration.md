# 缓存管理页对接说明

本文档面向前端页面开发，描述 `nebula-frontend` 已提供的缓存管理接口、推荐页面结构、TypeScript 类型、交互流程与异常处理约定。

## 1. 页面目标

缓存管理页需要解决两个问题：

1. 让使用方看到当前系统里已经存在的缓存分组与缓存项。
2. 让使用方删除指定缓存项，触发下游业务在下一次访问时重新生成缓存。

当前后端提供的是“按缓存分组查看 + 按缓存项删除”的能力，不提供整组清空接口。

## 2. 接口清单

### 2.1 查询缓存列表

- 方法：`GET`
- 路径：`/api/frontend/caches`

### 2.2 删除缓存项

- 方法：`DELETE`
- 路径：`/api/frontend/caches/entries`
- Query 参数：
  - `cacheName`
  - `cacheKey`

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
  defaultTtlSeconds: number | null
  entryCount: number
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
| `defaultTtlSeconds` | 该缓存定义的默认 TTL | 分组说明信息 |
| `entryCount` | 当前分组条目数 | 分组徽标、计数展示 |
| `entries` | 当前分组下缓存项列表 | 表格数据源 |

### 5.2 缓存项字段

| 字段 | 说明 | 前端用途 |
|------|------|----------|
| `cacheKey` | 缓存项唯一键 | 表格主列、删除入参 |
| `cacheValueJson` | 缓存值序列化后的 JSON 字符串 | JSON 查看器 / 文本展示 |
| `cacheValueType` | 缓存值 Java 类型名 | 辅助信息、tooltip |
| `ttlSeconds` | 写入该缓存项时的原始 TTL | 展示原始缓存时长 |
| `remainingTtlSeconds` | 当前剩余 TTL | 展示剩余有效期 |

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
- 条目数量 `entryCount`

### 6.2 第二层：缓存项表格

建议表格列：

| 列名 | 对应字段 | 说明 |
|------|----------|------|
| 缓存键 | `cacheKey` | 建议支持复制 |
| 原始 TTL | `ttlSeconds` | 单位秒，可转分钟显示 |
| 剩余 TTL | `remainingTtlSeconds` | 建议加颜色提示 |
| 值类型 | `cacheValueType` | 长文本可省略显示 |
| 缓存值 | `cacheValueJson` | 建议 JSON 展开器 / Drawer |
| 操作 | - | 删除按钮 |

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

- 当前接口按“缓存项”删除，不支持整组删除。
- 当前接口管理的是动态缓存分组视图。
- 如果某个缓存名称同时被动态缓存和 `@Cacheable` 共用，Redis 模式下可能看到同名缓存空间的数据。
- 删除接口不会因为误传缓存名称而创建新的缓存分组。

## 12. 推荐前端状态设计

建议页面状态最少包含：

```ts
interface CachePageState {
  loading: boolean
  deleteLoading: boolean
  groups: FrontendCacheGroup[]
  activeCacheName: string | null
  selectedEntry: FrontendCacheEntry | null
}
```

## 13. 最小落地方案

如果要先快速上线，可按下面最小方案做：

1. 顶部使用缓存分组下拉框或 Tabs。
2. 下方用单表格展示当前分组的 `entries`。
3. 提供“查看 JSON”和“删除”两个操作按钮。
4. 删除成功后直接全量刷新列表。

这个方案实现成本最低，也足够支撑缓存排查和手动重建场景。
