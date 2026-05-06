# Nebula Param 使用方式

## 1. 接入方式总览

`nebula-param` 支持两种主要接入方式：

- 单体模式：业务应用直接引入 `nebula-param-local`
- 微服务模式：独立部署 `nebula-param-service`，业务应用引入 `nebula-param-remote`

无论哪种方式，业务代码最好都面向 `ISystemParamService` 及其 command/query/dto 契约编程。

---

## 2. 单体应用接入

### 2.1 Maven 依赖

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-param-local</artifactId>
</dependency>
```

### 2.2 适合场景

适用于：

- 单体后台系统
- 已经使用 `nebula-app-starter` 的场景
- 参数中心能力直接随主应用一起运行

### 2.3 运行方式

此时：

- `SystemParamController` 直接对外提供接口
- `ISystemParamService` 由 `SystemParamServiceImpl` 本地实现
- 参数读取、缓存和校验逻辑都在当前应用中执行

---

## 3. 独立参数服务接入

### 3.1 启动独立服务

```bash
mvn spring-boot:run -pl nebula-param/nebula-param-service
```

### 3.2 当前服务配置

从 `nebula-param-service/src/main/resources/application.yml` 可确认：

- 默认端口：`17780`
- `nebula.param.mode=local`
- `nebula.architecture.mode=remote`

即独立服务本身暴露的是本地实现接口，对外作为参数中心服务运行。

### 3.3 消费方依赖

业务服务作为消费者时，应引入：

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-param-remote</artifactId>
</dependency>
```

### 3.4 remote 配置示例

```yaml
nebula:
  param:
    mode: remote
    remote:
      service-name: nebula-param-service
      service-url: http://localhost:17780
```

### 3.5 适合场景

适用于：

- 多个业务服务共用一套系统参数中心
- 希望统一治理各模块运行期配置
- 前端平台配置、认证开关、通知开关等都要集中维护

---

## 4. 配置说明

## 4.1 基础示例

```yaml
nebula:
  param:
    mode: local
    cache-ttl-seconds: 300
    remote:
      service-name: nebula-param-service
      service-url: http://localhost:17780
```

### 4.2 `mode`

可选值：

- `local`
- `remote`

它决定当前应用是：

- 本地直接实现参数能力
- 还是作为参数中心消费者转调远程服务

### 4.3 `cache-ttl-seconds`

作用：

- 控制按 key 读取参数缓存的默认 TTL

建议：

- 大多数系统参数读多写少，适合启用缓存
- 如果参数变更非常频繁，也可以根据业务适当降低 TTL

### 4.4 `remote.*`

主要包括：

- `service-name`
- `service-url`

适用场景：

- 服务发现环境优先用 `service-name`
- 本地联调和固定直连环境可用 `service-url`

---

## 5. 业务侧如何使用

## 5.1 程序中按 key 读取参数

最常见的使用方式就是直接注入 `ISystemParamService`：

```java
@RequiredArgsConstructor
@Service
public class LoginPolicyService {

    private final ISystemParamService systemParamService;

    public Integer getMaxFailCount() {
        return systemParamService.getIntegerParamByKey("auth.login.username.login-fail-max-count");
    }

    public Boolean allowRegister() {
        return systemParamService.getBooleanParamByKey("auth.login.username.allow-register");
    }
}
```

适合场景：

- 登录策略
- 通知策略
- 页面默认值
- 运行期开关

### 5.2 构建后台设置页

推荐流程：

1. 前端先按 `moduleCode` 调用 `/api/param/module/{moduleCode}`
2. 页面根据 `dataType`、`placeholder`、`renderEnabled` 等字段渲染表单
3. 用户修改后，统一调用 `/api/param/batch-update-values`
4. 页面根据逐项结果提示保存成功或失败

适合场景：

- 前端平台设置
- 通知设置
- 认证设置
- 模块化系统参数页

### 5.3 程序化写入默认参数

如果某个模块需要在首次使用时自动补齐平台配置，可以调用：

- `saveOrUpdateSystemParamByKey`

这类方式适合：

- 模块安装初始化
- 保存平台级默认配置
- 程序启动时补齐缺失参数

frontend 模块当前就采用了这种模式来维护自己的平台配置。

---

## 6. 参数设计建议

### 6.1 参数键命名建议

建议统一使用模块前缀：

- `auth.login.*`
- `frontend.*`
- `notify.*`
- `storage.*`

这样有几个好处：

- 一看就知道参数归属哪个模块
- 更容易按模块做设置页和配置治理
- 避免不同模块参数键撞名

### 6.2 什么时候用字典选项型参数

如果某个参数值必须从固定集合里选择，而不是任意字符串，建议：

1. 先在字典模块维护可选项
2. 参数的 `dataType` 设为 `SINGLE` 或 `MULTIPLE`
3. 通过 `optionCode` 绑定该字典

适用场景：

- 默认主题
- 默认语言
- 默认状态
- 默认分类

### 6.3 哪些参数要打开 `editableFlag`

建议打开 `editableFlag` 的参数：

- 运营或产品需要经常调整的参数
- 页面设置页要一次批量保存的参数

建议关闭 `editableFlag` 的参数：

- 只允许程序初始化写入的内建参数
- 结构性关键参数
- 不希望被普通后台设置页修改的参数

---

## 7. 前端接入建议

### 7.1 设置页渲染侧

前端如果要把参数做成通用设置页，建议至少使用这些字段：

- `paramKey`
- `paramName`
- `description`
- `dataType`
- `paramValue`
- `placeholder`
- `renderEnabled`
- `displayOrder`

根据 `dataType` 可以映射出常见组件：

- `STRING` -> 输入框 / 文本域
- `INT` / `DOUBLE` -> 数字输入框
- `BOOLEAN` -> 开关
- `SINGLE` -> 单选或下拉
- `MULTIPLE` -> 多选

### 7.2 保存侧

建议区分两类保存：

1. **管理页保存完整参数定义**
   - 走创建 / 更新参数接口
2. **设置页只保存参数值**
   - 走批量更新值接口

这样“参数定义管理”和“参数值维护”两类场景边界更清晰。

---

## 8. 常见落地建议

### 8.1 参数值尽量保持业务语义清晰

例如：

- 布尔值用 `true/false`
- 枚举值用稳定编码
- JSON 配置保持结构稳定

### 8.2 不要把超大结构化配置硬塞进 param 模块

例如：

- 大量页面 schema
- 复杂模板全文
- 大块多层嵌套配置

这类内容更适合独立配置文件或专门的数据表。

### 8.3 参数中心适合“读多写少”场景

如果某类配置需要高频写入、强事务性或复杂审计流程，建议单独建模，而不是全部塞进参数中心。

---

## 9. 小结

param 模块的最佳使用方式可以概括为：

1. **程序侧按 key 读取运行期配置**
2. **后台设置页按 moduleCode 加载并批量保存参数值**
3. **平台级默认配置通过 saveOrUpdateByKey 程序化维护**
4. **需要受控选项时，联动字典模块一起治理**

这样既能保持业务调用简单，又能让系统配置逐步从硬编码演进成统一可维护的参数中心。
