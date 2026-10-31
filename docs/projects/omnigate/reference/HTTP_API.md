---
title: HTTP API
date: 2026-10-31 20:00
tags: [omnigate, usage, guide]
---

# HTTP API

代理面、管理面与门户面的 HTTP 端点清单。管理面需要管理台会话或 Basic 凭据；代理面与门户面使用虚拟密钥。

## 7. API 设计

第一级 HTTP 命名空间：

| 前缀 | 用途 |
|---|---|
| `/v1/*` | 模型调用（OpenAI 兼容代理，虚拟密钥鉴权） |
| `/api/*` | 管理台前端请求后端的 REST |
| `/portal/*` | 虚拟密钥只读门户（页面 + `/portal/api/*` 按密钥鉴权的只读 REST） |
| `/manage/*` | 管理台页面（React SPA）；`GET /` 302 到 `/manage/` |

### 7.1 代理面（OpenAI 兼容，虚拟密钥鉴权）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/chat/completions` | 聊天补全，支持 `stream:true` SSE |
| POST | `/v1/embeddings` | 文本向量化（OpenAI embeddings 格式） |
| POST | `/v1/rerank` | 文档重排（Cohere rerank 骨架） |
| POST | `/v1/images/generations` | 生图（OpenAI Images 格式，缓冲式直通，`stream` 原样透传） |
| POST | `/v1/audio/speech` | 语音合成 TTS（OpenAI Audio Speech；二进制或 SSE 流式透传） |
| POST | `/v1/audio/transcriptions` | 语音识别 STT（OpenAI Audio Transcriptions；multipart 入站） |
| POST | `/v1/videos` | 视频生成提交（OpenAI Videos/Sora 格式，直通；异步任务，见下） |
| GET  | `/v1/videos/{id}` | 轮询任务状态（按 `video_task` 回查，不落新日志） |
| GET  | `/v1/videos/{id}/content` | 下载成片（按 `video_task` 回查，流式透传字节） |
| GET  | `/v1/models` | 返回所有逻辑路由名（客户端模型列表） |

上游鉴权：代理替换 `Authorization: Bearer <选中的key>`，客户端无需带真实 key。

**端点协议标准说明**（各端点家族跟随的业界事实标准）：

| 端点 | 标准 | 出站路径（baseURL 已含版本前缀，如 `https://api.openai.com/v1`） |
|---|---|---|
| `/v1/chat/completions` | OpenAI Chat Completions —— 官方规范，全行业事实标准 | `baseURL + /chat/completions`（anthropic/responses 协议模型走各自路径） |
| `/v1/embeddings` | OpenAI Embeddings —— 请求/响应格式被 OpenAI/vLLM/Ollama/硅基流动等广泛复制的的事实标准 | `baseURL + /embeddings` |
| `/v1/rerank` | Cohere Rerank 骨架（`{model, query, documents, top_n}` → `results[].relevance_score`）—— OpenAI 无此 API，无官方标准；Jina/硅基流动/vLLM/HF TEI 均近似该形状但字段细节不一 | `baseURL + /rerank` |
| `/v1/images/generations` | OpenAI Images API —— 事实标准，智谱 CogView、Azure OpenAI、硅基流动、OpenRouter Unified Image API 同形状 | `baseURL + /images/generations` |
| `/v1/audio/speech` | OpenAI Audio Speech —— JSON 入、音频字节或 SSE 出；兼容端点（Groq/OpenRouter/SiliconFlow）同形状 | `baseURL + /audio/speech` |
| `/v1/audio/transcriptions` | OpenAI Audio Transcriptions —— multipart `file`+`model` 入、JSON/文本出 | `baseURL + /audio/transcriptions` |
| `/v1/videos` | OpenAI Videos（Sora）—— `{prompt, size, seconds}` 入、任务对象 `{id, status}` 出；跨厂商无标准（Runway/Gemini 路径与字段均不同），故直通不转换 | `baseURL + /videos` |
| `/v1/videos/{id}` | 任务回查：按提交时登记的 `video_task` 定位提供商×密钥，GET 透传 JSON | `baseURL + /videos/{id}` |
| `/v1/videos/{id}/content` | 成片下载：同上，透传 `Content-Type` 与字节流 | `baseURL + /videos/{id}/content` |

实现约定：

- **模型按 `type` 归属端点**：路由内只有同类型后端会被选中（embedding 请求绝不落到 chat 模型上）；请求体仅重写 `model` 字段（逻辑路由名 → 物理模型名），其余字段与响应体**原样直通**——rerank 无标准可归一，改写必踩厂商字段差异（vLLM 另有 `/v2/rerank`、Jina 多 `instruction`、`top_n`/`top_k` 混用），故不做任何转换。音频与视频端点同样只改 `model` + 合并 `body_override`。
- **usage 提取（尽力而为）**：embeddings 读 `usage.prompt_tokens/total_tokens`；rerank 依次尝试 `meta.tokens` → `meta.billed_units` → `usage.total_tokens`；images 读 `usage.input_tokens/output_tokens`（OpenRouter 形状 `prompt_tokens/completion_tokens` 兜底；按图计费的厂商如 CogView 无 token 用量记 0）。TTS 按输入字符数记录（`input_chars`，仅统计用）；STT 优先读上游 `usage.seconds` / `duration`，否则解析 WAV/MP3/FLAC/M4A/Ogg 容器头。视频读任意形态的 `seconds`（字符串或数字）记入 `audio_seconds`（仅统计用）。
- **流式**：embeddings/rerank 忽略 `stream` 字段（业界均无流式语义）；images 将 `stream` 原样透传（上游 gpt-image 系可能返回 SSE 渐进预览），网关为缓冲式转发，响应体与 Content-Type 原样回写，流式响应 usage 记 0。TTS 出站按上游 `Content-Type` 流式透传（`audio/*` 或 `text/event-stream`）；STT 入站全缓冲（`file` 是 multipart 首 part，目标 URL 依赖 `model`）。视频提交为缓冲式 JSON；下载为字节流透传。typed 端点同样走失败转移/熔断/统计/request_log 全链路（视频轮询/下载除外：它们是任务回查，不走选择器、不落 `request_log`），网关自身错误统一以 OpenAI error envelope 返回。
- **视频任务映射**：`GET /v1/videos/{id}` 无法携带 `model`，故提交 2xx 且响应含 `id` 时写入 `video_task`（`video_id` 唯一，重复提交覆盖落点、不改 `created_at`）。未知 id 一律 404，绝不带密钥转发（否则网关退化为开放代理）。`video_task` 跟随 `log.retention_days` 清理，也随 `POST /api/maintenance/clear-logs` 清空。
- **出站路径版本段**：base 由用户填写且必须自带版本前缀（OpenAI 式 `/v1`、智谱 `/v4`），出站一律 `baseURL + /<resource>`：chat `/chat/completions`、messages `/messages`、responses `/responses`、typed `/embeddings` `/rerank` `/images/generations` `/audio/speech` `/audio/transcriptions` `/videos`。网关不推断版本段，故 base 填 `https://api.anthropic.com/v1` 得到 `.../v1/messages`，填 `https://api.anthropic.com` 得到 `.../messages`。

### 7.2 管理面（`/api/*`，按启动层鉴权配置受保护，见 §9.1）

```
# 鉴权（公开端点，引导登录页）
GET   /api/auth-info                    # {"mode":"password"|"open"}，登录页据此渲染表单
POST  /api/login                        # {username,password} → 签发 7 天滑动会话 {token,expires_at}
POST  /api/logout                       # 撤销当前 Bearer 会话
# 管理面放行凭据：Authorization: Bearer <会话令牌> | Basic base64(账号:密码)
# 代理面 /v1/* 一律虚拟密钥鉴权：Authorization: Bearer vk-xxx（管理台"虚拟密钥"页创建），
#   401 附 WWW-Authenticate；虚拟密钥是 /v1 唯一凭据，管理账号密码不用于调用

# 实体 CRUD（均为标准 REST，保存后配置快照原子重建、即时生效）
GET/POST         /api/providers            PUT/DELETE /api/providers/{id}
GET/POST         /api/keys                 PUT/DELETE /api/keys/{id}     # 新增单个 key（名称必填、同提供商内唯一）；GET ?reveal=1 返回明文
GET/POST         /api/models               PUT/DELETE /api/models/{id}
GET/POST         /api/routes               PUT/DELETE /api/routes/{id}

# 配额告警渠道（软告警，见 §8.3）
GET/POST         /api/notify-channels      PUT/DELETE /api/notify-channels/{id}
POST             /api/notify-channels/test            # 未保存草稿的发送测试，返回 {ok,status_code,latency_ms,error}
POST             /api/notify-channels/{id}/test       # 已保存渠道的发送测试，结果写回渠道的 last_*

	# 通知中心（站内通知，见 §8.4）。只读 + 标记/删除，没有创建入口——通知由系统产生
	GET              /api/notifications?unread=1&page=1&size=20   # {total, unread, items}；size 上限 200、默认 20；管理台看见全部
	GET              /api/notifications/unread-count              # {unread}，顶栏角标轮询用
	POST             /api/notifications/{id}/read                 # 单条已读（只标记管理台）；id 不存在返回 404
	POST             /api/notifications/{id}/unread
	POST             /api/notifications/read-all                  # {updated}
	DELETE           /api/notifications/read                      # 清空管理台已读的事实，未读不动
	DELETE           /api/notifications/{id}
	# 门户只读（VK 鉴权，见 §8.4）：配额只看自己的，模型只看白名单路由用得到的；不提供标记与删除
	GET              /portal/api/notifications
	GET              /portal/api/notifications/unread-count

# 健康与恢复
GET              /api/health               # 全量状态：模型熔断态、key 态、冷却倒计时
POST             /api/models/{id}/enable   # 手动解禁（重置 fail_count/status）
POST             /api/models/{id}/disable
POST             /api/models/{id}/test-keys  # 逐密钥并发探测：返回绑定全部 key 的成功/耗时/错误/当前状态
# 密钥启停无独立端点：PUT /api/keys/{id} 可改 name/key_value/status（回传脱敏值则不修改 key_value）

# 统计查询（费用统一为 USD）
GET  /api/stats/overview?from=&to=            # 总次数/成功率/token/费用/平均TTFT/平均耗时/p95（优先走每日预聚合）
GET  /api/stats/timeseries?dim=&from=&to=&bucket=1h   # 时间桶聚合；points 含 avg_ttft_ms/avg_total_ms/avg_tps
GET  /api/stats/breakdown?dim=&from=&to=     # 按维度分组聚合（含错误率、token、费用、延迟分位）；dim: route|model|provider|key|status|error_code

# 请求日志
GET  /api/logs?route=&model=&status=&from=&to=&page=&size=
GET  /api/logs/{request_id}/content           # 查看捕获的请求/响应体与出站请求 URL（request_url）；关闭时失败请求仍可能有记录

# 配置
GET/PUT  /api/settings                        # §9 全部配置项；保存即热生效

# 维护
POST /api/maintenance/cleanup                 # 立即按保留期清理过期日志；返回 {"deleted":{"request_log":N,…}}
POST /api/maintenance/clear-logs              # body {"confirm":true}；清空请求日志/尝试日志/内容捕获/视频任务映射（每日统计保留）
POST /api/maintenance/clear-stats             # body {"confirm":true}；清空请求日志/尝试日志/每日统计（内容日志保留）
```

---

