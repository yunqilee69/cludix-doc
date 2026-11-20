# 服务间内部调用认证（HMAC 签名）

> 状态：**已实施**。实现在 `nebula-base/nebula-base-cloud` 的 `cn.cloudomni.nebula.cloud.internal` 包，接入方为 `nebula-auth`、`nebula-storage`、`nebula-notify` 三个服务与 `nebula-gateway`。
> 定位：这是**服务与服务之间**的准入机制，不是用户鉴权。用户令牌、权限码在这里都不参与。

## 1. 为什么需要它

平台里有几类调用只能由别的服务发起，不能开给终端用户，也拿不到用户令牌：

| 场景 | 调用链 | 为什么不能用用户令牌 |
| --- | --- | --- |
| 通知发送记录回填接收人名称 | notify → auth | notify 在后台扇出投递时没有「某个用户的令牌」，原链路逐用户调用 `/api/auth/users/{id}` 必然 401，异常被吞后名称恒为空 |
| 上传任务绑定正式文件 | auth → storage | 头像/企业资料图绑定发生在普通用户保存资料时，而 `STORAGE_UPLOAD` 是接口权限码，普通用户默认没有——校验它会让普通用户存不了头像，不校验则端点零防护 |

两条链路的共同点是：**调用方是可信服务，被保护的是内部端点**。因此需要一套与用户身份无关、能证明「请求确实来自本集群的另一个服务」的机制。

已评估并**放弃**的替代方案：

- **全局透传 `Authorization`**：会把用户令牌外溢到本不需要它的下游；而 `/api/auth/users/{id}` 一类端点没有权限码校验，一旦令牌可用，任何登录用户都能借 notify 服务查任意用户——典型的 confused deputy，用一个漏洞换另一个。
- **复用下载链接签名**（`StorageSignedDownloadSupport`）：那是「面向终端用户的一次性 URL 签名」，参数与语义都绑在下载链路上，改造成服务间双向认证会把两个关注点耦死。
- **网络隔离**：`/api/storage/**` 已在网关路由表内，`/api/auth/**` 更是全量转发，内部端点靠网段保护在这个拓扑下不成立。

## 2. 契约

### 2.1 头部

| 头名 | 内容 |
| --- | --- |
| `X-Nebula-Internal-Signature` | `Base64(HmacSHA256(secret, 签名串))` |
| `X-Nebula-Internal-Timestamp` | 秒级 epoch 时间戳 |

头名**大小写与连字符形式固定**，出站签名、入站校验、网关剥离三处都引用同一常量（`InternalRequestSigner.SIGNATURE_HEADER_NAME` / `TIMESTAMP_HEADER_NAME`）。

### 2.2 签名串

```text
payload   = METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + HEX(SHA256(body))
signature = Base64(HmacSHA256(secret, payload))
```

细则（任一条两侧不一致都会表现为「全部内部调用被拒」，所以由共享工具类实现，禁止两侧各写一份）：

| 项 | 约定 |
| --- | --- |
| `METHOD` | 统一大写（入参不区分大小写） |
| `PATH` | **不含查询串**，也不含 context-path（服务端取 `requestURI` 后剥掉 `getContextPath()`） |
| `TIMESTAMP` | 秒级 epoch，与头里发的是同一个值 |
| `HEX(SHA256(body))` | **小写**十六进制；空 body（`null` 或长度 0）按 `SHA256("")` 计算，不是跳过该段、也不是按 `null` 字符串 |
| body 来源 | 调用方发出的原始字节；服务端必须读**原始字节**（先反序列化再序列化会因字段顺序/空格差异导致摘要不一致），因此 storage 侧用过滤器缓存请求体、auth 侧按 `byte[]` 接收 |

### 2.3 时间窗与防重放

- 时间戳与服务器时间相差超过 `nebula.internal-auth.clock-skew-seconds`（默认 **300 秒**）即拒绝。
- **不做 nonce 缓存**：本机制保护的内部调用只有两类——用户名称查询（只读、幂等）与文件绑定（幂等键为 `taskId`，重复请求返回同一 `fileId`）。重放同一请求不会产生额外副作用，为此引入有状态组件（Redis/内存 + TTL 清理）是用复杂度换一个不存在的风险。**若未来出现非幂等的内部写操作，必须回到本节重新评估**。
- 比对使用 `MessageDigest.isEqual`（常量时间比较），不引入新依赖。

### 2.4 密钥

| 项 | 约定 |
| --- | --- |
| 配置项 | `nebula.internal-auth.secret`（`InternalSignatureProperties`） |
| 唯一来源 | **环境变量 `NEBULA_INTERNAL_AUTH_SECRET`**；yml 只允许写占位 `${NEBULA_INTERNAL_AUTH_SECRET:}`，禁止落具体密钥值、禁止给非空默认值 |
| 多服务一致性 | auth / storage / notify 三处必须配同一个值；当前**没有双密钥过渡期**，轮换需同时更换 |
| 禁止 | 入仓、入库、入日志、入审计 |

```yaml
nebula:
  internal-auth:
    secret: ${NEBULA_INTERNAL_AUTH_SECRET:}
    clock-skew-seconds: 300
```

### 2.5 缺密钥即 fail-closed

`secret` 为空时：

- 应用**照常启动**（不因缺密钥启动失败）；
- `InternalSignatureVerifier` 仍然装配，但**拒绝一切请求**，并在构造时打一条 WARN：「内部调用认证未配置，内部端点将拒绝所有请求（fail-closed）」；
- `InternalRequestSigner` 直接拒绝发送内部请求（抛 `BusinessException`）。

刻意**不采用**「缺密钥就不注册 Bean」：那会造成内部端点在没有校验者的情况下被放行，或让上下文启动失败，两者都与 fail-closed 相悖。

## 3. 加签范围与内部端点

### 3.1 只有两个前缀加签

| 前缀 | 服务 | 端点 | 注册条件 |
| --- | --- | --- | --- |
| `/api/auth/internal` | auth | `POST /api/auth/internal/users/batch` | `nebula.architecture.mode=remote` 时注册（单体不暴露）；路径由 `nebula.auth.internal-paths` 声明并放进安全链放行名单 |
| `/api/storage-internal` | storage | `POST /api/storage-internal/upload-tasks/bind` | 常量路径，始终注册，由签名拦截器把关 |

出站 Feign 请求只在这两个前缀上计算并附加签名头；其它既有业务 Feign 调用不带头、行为不变（`InternalRequestSigner#isInternalPath`）。前缀匹配是「等于前缀或以 `前缀/` 开头」，因此 `/api/auth/internalxxx` 不会被误判为内部路径。

### 3.2 内部端点不使用用户权限码

- 内部端点**不挂** `@NebulaApiPermission` / `@NebulaPermission`：调用方是服务而不是终端用户，鉴权靠签名。给 storage 内部绑定端点校验 `STORAGE_UPLOAD` 会让普通用户无法保存头像。
- **必须做上下文一致性校验**：`StorageInternalController` 会把请求体里的 `operatorUserId` / `tenantId` 与当前调用上下文（由转发头还原）比对，不一致按 `INTERNAL_SIGNATURE_INVALID`（`24028`）拒绝——否则一个合法调用方可以替别的用户/租户绑定文件。
- 内部端点照常记审计（`@NebulaAudit`），但审计不应记录响应快照中可能含凭据的地址。

### 3.3 网关：拦截 + 剥离

内部端点**一律不登记进网关路由**，并在既有路由上加 `RemoveRequestHeader` 剥离 `X-Nebula-Internal-*`：

```yaml
default-filters:
  - RemoveRequestHeader=X-Nebula-Internal-Signature
  - RemoveRequestHeader=X-Nebula-Internal-Timestamp
```

- `InternalPathBlockFilter`（`GlobalFilter`，order 早于 `RouteToRequestUrlFilter`）对 `/api/auth/internal/**` 与 `/api/storage-internal/**` **直接返回 404，且不调用过滤链**，下游收不到任何请求；判断前先做 URL 解码与路径归一化，避免 `%2F`、`..` 之类写法绕过前缀匹配。
- `/api/auth/internal/**` 落在既有 `Path=/api/auth/**` 路由内，必须靠过滤器挡住；`/api/storage-internal/**` 不匹配 `Path=/api/storage/**`，此处再挡一层，防止后续误加路由表后静默暴露。
- 剥离头的目的是防止外部伪造签名头透传到下游：即使有人绕过网关直连服务端口，也仍需正确密钥才能通过校验。

## 4. 实现位置

| 组件 | 位置 | 职责 |
| --- | --- | --- |
| `InternalSignatureProperties` | `nebula-base-cloud/.../internal/` | 配置绑定（`nebula.internal-auth.*`）、密钥可用性判断、时间窗归一化 |
| `InternalRequestSigner` | 同上 | 签名纯函数（`buildPayload` / `sign`）+ Feign `RequestInterceptor` 出站加签 |
| `InternalSignatureVerifier` | 同上 | 服务端校验：密钥、缺头、时间戳格式、时间窗、签名比对；日志只记方法/路径/调用方 IP |
| `InternalAuthAutoConfiguration` | 同上 | 装配以上三者；已在 `AutoConfiguration.imports` 注册 |
| `StorageInternalWebConfig` | `nebula-storage-local` | 只对 `/api/storage-internal/**` 装配请求体缓存过滤器与签名拦截器 |
| `InternalUserController` | `nebula-auth-local` | 内部用户批量查询，签名不通过返回 **401** 且不回显失败原因 |
| `InternalPathBlockFilter` | `nebula-gateway-service` | 网关侧 404 拦截 |

失败响应口径刻意区分（便于定位，但都不泄漏细节）：

- storage 侧：HTTP 200 + `ApiResult.code = 24028`（与平台业务异常口径一致，避免调用方按 HTTP 状态猜语义）；
- auth 侧：HTTP **401** + 固定文案「内部调用认证失败」（不区分缺头/过期/不匹配）。

两者的日志都只记录「签名不通过 + 方法 + 路径 + 调用方 IP」，**不记录密钥、签名值或期望值**。

## 5. 部署与排障

### 5.1 部署必配项

| 环境 | 必配 | 不配的后果 |
| --- | --- | --- |
| remote（微服务） | 三个服务的 `NEBULA_INTERNAL_AUTH_SECRET` 同值 | 通知记录接收人名称恒空；头像/企业资料图保存直接失败 |
| local（单体） | 不需要（内部端点在单体下不注册，本地实现不经 Feign） | 无影响 |

`docker/docker-compose.yml` 已为 auth / storage / notify 三个服务透传 `NEBULA_INTERNAL_AUTH_SECRET: "${NEBULA_INTERNAL_AUTH_SECRET:-}"`，编排文件里不写死具体值。

### 5.2 排障顺序

1. 启动日志是否有「内部调用认证未配置」WARN——有则先下发环境变量；
2. 三个服务的密钥是否**完全一致**（含首尾空白：参与 HMAC 的是 `trim()` 后的值）；
3. 服务端时钟是否偏移超过 300 秒（时间戳头超出窗口会被拒，日志会打 `now=` 与 `skew=`）；
4. 请求是否命中内部前缀（`/api/auth/internal`、`/api/storage-internal`）——不在前缀内的请求不会加签，也不会被校验；
5. 若经网关，确认路径被 404 拦下是**预期行为**：内部调用必须直连服务地址，不能走网关。

### 5.3 已知边界

- 签名保证「报文未被篡改 + 调用方持有密钥 + 时间窗内」，**不提供传输加密**：跨不可信网络部署时需自行在服务间启用 TLS。
- 时间窗内重放会被放行（见 §2.3），依赖下游幂等吸收。
- 密钥轮换没有双密钥过渡期：轮换期间内部调用会短暂失败，需安排在同一批次内完成三个服务的下发。
