# 项目分层对象命名规约说明书

**（基于 Spring + 阿里手册 + 团队实践）**

## 目的

统一 Controller / Service / DAO 三层在"参数对象"上的命名与使用方式，让代码在跨模块、跨人协作时一眼能看出"它属于哪一层、承担什么职责"，同时保持与 Spring 生态、阿里开发手册的兼容。

## 适用范围

所有新建及迭代的 Spring Boot / Spring Cloud 微服务工程。

---

## 一、Controller 层 —— 统一后缀 Req / Resp

### 命名约定

- **入参**：`XxxReq` 或 `XxxRequest`
- **出参**：`XxxResp` 或 `XxxResponse`

### 代码示例

```java
@PostMapping("/orders")
public OrderCreateResp createOrder(@Valid @RequestBody OrderCreateReq req) {
    CreateOrderCommand cmd = OrderConvert.toCommand(req);
    OrderDTO dto = orderService.createOrder(cmd);
    return OrderConvert.toResp(dto);
}
```

### 原因（Why）

1. **与协议绑定**：Req/Resp 只负责"序列化 + 字段校验"，天然随 UI/接口版本而变；如果直接把这些对象下传到 Service，会导致业务层被迫跟着前端一起抖动。

2. **Spring 官方示范**：spring-petclinic、spring-data-examples 等仓库均使用 `*Request/*Response` 作为 Web 边界对象。

3. **阿里手册认可**：虽然手册没强制后缀，但明确"禁止把 DO/DTO 直接暴露到接口层"，使用独立的 Req/Resp 正是这一条的落地。

---

## 二、Service 层 —— 写用 Command，读用 Query

### 命名约定

- **写操作（CMD）**：`CreateOrderCommand`、`UpdateUserCommand` …
- **读操作（QRY）**：`OrderPageQuery`、`UserListQuery` …
- **返回对象**：`OrderDTO`、`PageResult<OrderDTO>`
- **包路径**：
  - Command 类放在 `model.command` 包下
  - Query 类放在 `model.query` 包下

### 代码示例

```java
@Transactional
public OrderDTO createOrder(CreateOrderCommand cmd) {
    // …
}

public List<OrderDTO> listOrders(OrderPageQuery query) {
    // …
}
```

### 原因（Why）

1. **语义精确**：Command = "意图会改变业务状态"；Query = "只读无副作用"，天然符合 CQRS 思想。

2. **可演进**：后续若引入消息队列、事件溯源，Command 对象可直接序列化到 Kafka，无需再做转换。

3. **单测友好**：Command/Query/DTO 都是纯 POJO，脱离容器即可单元测试。

4. **阿里手册不冲突**：手册只强制动词前缀（get/list/save…），对参数后缀无硬性要求；Command/Query 在阿里内部不少 DDD 项目中也广泛使用。

---

## 三、DAO 层 —— 多于 3 个参数时封装 XxxParam

### 命名约定

- **MyBatis Mapper 方法**：
  - 小于等于 3 个参数：直接 `@Param`
  - 大于 3 个参数：封装为 `XxxParam` 对象
- **对象后缀**：`XxxParam`（与 Service 的 Command/Query 区分，表达"仅用于 SQL 拼装"）

### 代码示例

```java
// <=3 个参数
List<OrderEntity> findByStatusAndType(@Param("status") int status,
                                      @Param("type") int type);

// >3 个参数
List<OrderEntity> search(OrderSearchParam param);
```

### 原因（Why）

1. **MyBatis 官方最佳实践**：参数过多时通过对象封装，可读性高，还能复用 SQL 映射。

2. **隔离职责**：Param 只解决"SQL 条件拼装"，不会混入业务校验逻辑，与 Command/Query 各司其职。

---

## 四、实体层 —— 统一后缀 Entity

### 命名约定

- **JPA / MyBatis-Plus 实体**：`OrderEntity`、`UserEntity` …
- **放在** `domain` 或 `infrastructure.entity` 包下

### 代码示例

```java
@Entity
@Table(name = "t_order")
public class OrderEntity {
    // …
}
```

### 原因（Why）

1. **表意清晰**：Entity 直接表明"与数据库字段一一对应"，区别于 DTO/VO/DO 等可能带业务计算字段的对象。

2. **减少"DO"歧义**：阿里手册的 DO 是 Data Object，但团队过往常把 DO 误当成 Domain Object；统一用 Entity 可彻底规避这种混淆。

3. **与 Spring Data JPA 命名习惯保持一致**（spring-data-examples 亦大量使用 `*Entity`）。

---

## 五、跨层转换规则

### 转换器规范

- **只允许** MapStruct / 手动转换器出现
- **禁止**在业务方法里写 `BeanUtils.copyProperties`
- **转换器命名**：`XxxConvert` / `XxxMapper`（MapStruct），统一放在 `convert` 或 `mapper` 包下

### 转换方向

```
Req → Command / Query
Entity → DTO
DTO → Resp
```

---

## 总结

| 层级 | 对象类型 | 后缀示例 | 职责 |
|------|---------|---------|------|
| Controller | 入参 | `XxxReq/Request` | 接收请求、字段校验 |
| Controller | 出参 | `XxxResp/Response` | 返回响应、数据序列化 |
| Service | 写操作 | `XxxCommand` | 封装写业务意图 |
| Service | 读操作 | `XxxQuery` | 封装查询条件 |
| Service | 返回对象 | `XxxDTO` | 传输业务数据 |
| DAO | 参数对象 | `XxxParam` | SQL 条件拼装 |
| Entity | 实体 | `XxxEntity` | 数据库表映射 |