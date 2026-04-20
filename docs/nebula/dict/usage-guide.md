# Nebula Dict 使用方式

## 1. 接入方式概览

`nebula-dict` 当前支持两种主要接入方式：

- 单体 / 本地接入
- 独立字典服务 + 远程消费

如果你只是想在当前应用里直接使用字典能力，优先用 `local`。
如果你希望多个业务系统共享一套字典中心，优先把 `nebula-dict-service` 独立部署，再让其他服务走 `remote`。

---

## 2. 单体应用接入

### 2.1 直接引入本地模块

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-dict-local</artifactId>
</dependency>
```

说明：

- 适合单体项目
- 适合 `nebula-app-starter` 已经直接集成的场景
- Controller 会直接在当前应用里暴露 `/api/dict/*`

### 2.2 模式配置

通常使用：

```yaml
nebula:
  dict:
    mode: local
```

如果不显式配置，当前控制器默认也会按 local 模式生效。

### 2.3 适用场景

- 中后台单体项目
- 字典能力和业务服务一体部署
- 不想额外维护一个字典中心服务

---

## 3. 独立字典服务部署

### 3.1 启动方式

```bash
mvn spring-boot:run -pl nebula-dict/nebula-dict-service
```

### 3.2 当前默认端口

```yaml
server:
  port: 17779
```

### 3.3 服务内模式

从当前 `application.yml` 可以确认：

- `nebula.architecture.mode=remote`
- `nebula.dict.mode=local`

它的含义是：

- 当前进程自身实现字典能力
- 但它作为独立服务对外提供 HTTP 接口，供其他服务远程消费

### 3.4 适用场景

- 多个业务系统共享一套字典中心
- 希望统一维护字典数据
- 希望把字典读取和管理从业务服务中拆出去

---

## 4. 远程消费方式

### 4.1 引入 remote 模块

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-dict-remote</artifactId>
</dependency>
```

### 4.2 模式切换

业务服务配置：

```yaml
nebula:
  dict:
    mode: remote
```

### 4.3 Remote 配置

当前远程调用支持以下配置项：

```yaml
nebula:
  dict:
    remote:
      service-name: nebula-dict-service
      service-url: http://localhost:17779
```

说明：

- `service-name` 用于服务发现名称
- `service-url` 用于直连地址覆盖
- Feign Client 默认 path 为 `/api/dict`

### 4.4 设计价值

业务服务仍然可以继续面向 `IDictService` 编程，不需要自己区分：

- 当前是本地实现
- 还是远程代理实现

这让字典模块能在单体与微服务部署之间平滑切换。

---

## 5. 前端调用建议

### 5.1 平铺字典读取

适用于：

- 状态下拉
- 单选项
- 简单枚举展示

调用建议：

```text
GET /api/dict/items/dict/order_status
```

### 5.2 树形字典读取

适用于：

- 分类树
- 区域树
- 级联选择器

调用建议：

```text
GET /api/dict/items/dict/region/tree
```

### 5.3 是否只看启用项

通常前台页面建议：

- 默认不传 `onlyEnabled`
- 直接使用默认语义（只看启用项）

后台维护页面若需要查看停用数据，可以显式传：

```text
?onlyEnabled=false
```

---

## 6. 字典建模建议

### 6.1 字典编码建议

- `code` 使用稳定且有业务语义的英文编码
- 不要直接使用中文或临时业务文案作为唯一身份

例如：

- `order_status`
- `user_level`
- `invoice_type`

### 6.2 字典项字段建议

建议把这几个字段职责分开：

- `dictCode`：所属字典编码
- `name`：展示名称
- `itemValue`：对前端或下游的实际值表达

当前模型已经不再保留 `itemCode`，因此如果业务需要稳定使用某个枚举值，应优先使用 `itemValue`。

### 6.3 树形字典建议

如果业务存在层级结构：

- 由服务端自动维护 `parentId + path`
- 业务方不要自己拼接 `path`
- 优先通过树接口获取完整树形结果

### 6.4 富字典建议

如果前端需要更多展示属性，可优先利用：

- `defaultFlag`
- `tagColor`
- `extraJson`

这样很多“轻量枚举扩展需求”无需再额外开表。

---

## 7. 与 app-starter 的关系

如果你当前使用的是 `nebula-app-starter`，那么字典模块通常已经被直接集成，无需再额外手动拼装一套模块依赖。

此时更关注的是：

- 字典数据如何初始化
- 字典接口如何被前端调用
- 是否需要把字典中心独立拆出

---

## 8. 推荐接入路径

如果你的目标是：

- **当前项目内部直接使用字典能力** → 直接走 `local`
- **多个系统共享统一字典中心** → 部署 `nebula-dict-service`，其他系统走 `remote`
- **前端做状态映射和下拉** → 调平铺接口
- **前端做分类树和级联选择** → 调树接口
