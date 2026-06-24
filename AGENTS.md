# 文档新增规范（供后续 Agent 自动执行）

本文件用于约束后续新增/修改文档时的默认行为，目标是：
- 文档包含必要的 tags，方便后续检索和分类
- 目录型文档（`index.md`）清晰说明目录作用和功能
- 内链不因路径调整而频繁失效
- 通过验证脚本确保 tags 符合规范

## 文档与 Blog 的区别

在新增内容前，需要先判断放在哪里：

| 内容类型 | 特征 | 放置位置 |
|---------|------|---------|
| **Blog（专题）** | 一个专题、一条链路、一次完整排查、跨多个工具/系统的解决方案 | `blog/` 目录 |
| **文档** | 一个明确动作、一个清晰配置、一个具体命令、可独立复用 | `docs/tutorials/` 或 `docs/troubleshooting/` |

**判断示例**：
- "Linux 安装 Docker" → 文档（单一动作）
- "Docker 部署 MySQL 完整配置" → 文档（清晰配置）
- "Jenkins + Docker + Git 完整部署链路搭建" → Blog（跨多个工具）
- "WebClient 日志过滤报错解决" → 文档踩坑区（bug 解决）
- "某个方案为什么这样设计，以及中间的取舍" → Blog（方案思考过程）

## 1. 文件与命名

- 文档文件名优先使用中文（如：`文件上传报错.md`、`Nginx部署.md`）
- 目录名保持现有结构，不强制改中文
- 目录型文档统一使用 `index.md`

## 2. Front Matter 规则

每篇文档建议包含 front matter，**tags 和 date 为必填字段**：

```md
---
title: 页面标题
date: 2026-06-22 15:30
tags: [tag1, tag2]
---
```

### 2.1 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `tags` | ✅ 必填 | 用于文档分类和检索，至少包含一个 tag |
| `date` | ✅ 推荐 | 创建日期和时间（格式：yyyy-MM-dd hh:mm），方便后续回忆 |
| `title` | 可选 | 页面标题，未填写时使用文档第一个标题 |
| `slug` | Blog 必填 | 自定义 URL 路径，**仅在 Blog 中使用**，文档不需要填写 |

### 2.2 Tags 规范

- **必须从白名单中选择**：`allowed-tags.json` 中定义的 tag
- **至少包含一个 tag**：方便后续按 tag 查找文档
- **建议包含 2-4 个 tag**：覆盖技术栈和场景
- **格式示例**：
  ```yaml
  tags: [docker, mysql, deployment]  # 数组格式
  # 或
  tags:
    - docker
    - mysql
    - deployment
  ```

### 2.3 Tags 白名单

参考项目根目录的 `allowed-tags.json` 文件，包含：

**技术栈**：
- docker, nginx, mysql, redis, postgresql, mongodb
- nacos, rocketmq, kafka, milvus, elasticsearch
- jenkins, portainer, k8s, rancher, filebrowser
- jellyfin, jellyseerr, newapi, bifrost, deerflow
- java, python, rust, nodejs, typescript
- linux, debian, macos, windows, ubuntu, centos

**场景**：
- installation, deployment, configuration, usage
- concurrency, security, auth, cache, storage
- network, database, middleware, proxy, media
- devops, ci-cd, monitoring, backup, migration
- troubleshooting, tutorial, guide, spec, api

## 3. 侧边栏策略（手动编写）

当前项目使用**手动编写**的侧边栏配置（见 `sidebars/*.ts`）。

### 3.1 新增文档需要手动添加到 sidebar

新增文档后，需要在对应的 sidebar 文件中添加配置项：

```typescript
// sidebars/tutorials.ts 示例
export default {
  tutorialsSidebar: [
    {
      type: 'category',
      label: 'Docker',
      collapsible: true,
      collapsed: true,
      items: [
        'tutorials/docker/index',
        'tutorials/docker/docker-config',
        {
          type: 'category',
          label: '部署',
          items: [
            'tutorials/docker/deployments/index',
            'tutorials/docker/deployments/MySQL部署',
            'tutorials/docker/deployments/Nginx部署',
          ],
        },
      ],
    },
  ],
};
```

### 3.2 Sidebar 配置注意事项

- 使用文档 ID（去掉 docs/ 前缀和 .md 后缀）
- 目录索引页使用 `目录/index` 格式
- 子目录使用嵌套的 `type: 'category'`

## 4. 目录文档（index.md）规范

目录型文档（`index.md`）需要清晰说明当前目录下文档的作用和功能。

### 4.1 必要内容

目录文档应包含：

1. **目录简介**：说明该目录收录什么类型的文档
2. **文档清单**：列出目录下的所有文档及其说明
3. **使用建议**：如有必要，说明推荐阅读顺序或使用方式

### 4.2 示例模板

```md
---
title: 目录标题
date: 2026-06-22 15:30
tags: [tutorial, docker]
---

# 目录标题

本目录收录 [主题] 相关文档，包括 [功能说明]。

## 文档清单

| 文档 | 说明 |
| --- | --- |
| [文档1](./文档1) | 功能说明 |
| [文档2](./文档2) | 功能说明 |

## 使用建议

1. 先阅读 [基础文档](./基础)
2. 根据需求查看具体 [功能文档](./功能)
```

## 5. 文档内链接规则

- 文档互链统一使用**相对文件路径**（不带 `.md`）
- 不使用 `/docs/...` 绝对路径

示例：

```md
[开发工具](./tools/git/index)
[问题解决](./troubleshooting/general/文件上传报错)
```

## 6. 排除目录

以下目录不参与 tags 验证：
- `docs/nebula/` - 后续将独立为单独的文档站

## 7. 新增文档判断流程

在新增文档前，需要按以下步骤判断内容类型和归属分类：

### 7.1 步骤 1：判断内容类型

根据内容的性质，判断应该放在哪里：

| 内容类型 | 特征 | 放置位置 |
|---------|------|---------|
| **Blog（专题）** | 一个专题、一条链路、一次完整排查、跨多个工具/系统的解决方案 | `blog/` 目录 |
| **教程** | 一个明确动作、一个清晰配置、一个具体命令、可独立复用 | `docs/tutorials/` |
| **踩坑** | bug 解决、报错处理、故障排查 | `docs/troubleshooting/` |

**判断示例**：
- "Linux 安装 Docker" → 教程（单一动作）
- "Docker 部署 MySQL 完整配置" → 教程（清晰配置）
- "Jenkins + Docker + Git 完整部署链路搭建" → Blog（跨多个工具）
- "WebClient 日志过滤报错解决" → 踩坑（bug 解决）
- "某个方案为什么这样设计，以及中间的取舍" → Blog（方案思考过程）

### 7.2 步骤 2：判断 tags 选择

选择 tags 时需要考虑：

1. **从白名单选择**：tag 必须在 `allowed-tags.json` 中定义
2. **至少 1-3 个 tag**：覆盖技术栈和场景
3. **白名单中没有时**：
   - 判断是否必要新增（常用技术/场景）
   - 如果必要，先添加到 `allowed-tags.json`
   - 不建议为一次性内容新增 tag

**选择示例**：
- "Docker 部署 MySQL" → `tags: [docker, mysql, deployment]`
  - 技术栈：docker, mysql
  - 场景：deployment
  
- "Linux 安装 Docker" → `tags: [docker, linux, installation]`
  - 注意：虽然涉及 linux，但**偏向 docker**（安装目标是 docker）
  
- "Jenkins 完整部署链路" → `tags: [jenkins, docker, ci-cd]`
  - 技术栈：jenkins, docker
  - 场景：ci-cd

### 7.3 步骤 3：判断分类归属

判断文档应该放在哪个细分类下：

**判断原则**：
- **看文档的核心目标是什么**
- **哪个技术栈是主角**

**分类偏向示例**：

| 文档内容 | 涉及技术 | 倾向分类 | 原因 |
|---------|---------|---------|------|
| Linux 安装 Docker | linux, docker | **docker/install-docker** | 安装目标是 docker |
| Docker 部署 MySQL | docker, mysql | **docker/deployments** | 用 docker 部署 |
| Jenkins 触发 Git Webhook | jenkins, git | **ci/jenkins** | jenkins 是主角 |
| Java Semaphore 并发控制 | java | **java** | 纯 java 内容 |
| Nginx 配置 HTTPS | nginx | **docker/deployments** 或 **network** | 看是否用 docker |

**一般规律**：
- 安装类 → 对应技术的 `install-*` 目录
- 部署类 → 对应技术的 `deployments` 目录
- 使用类 → 对应技术的 `usage` 目录
- 配置类 → 对应技术的根目录或 `usage` 目录

## 8. 新增文档操作清单（必须执行）

### 8.1 判断内容类型

确定是 Blog、教程还是踩坑。

### 8.2 判断分类和 tags

1. 确定归属分类（如 docker、linux、database 等）
2. 选择 tags（从白名单中选择）
3. 如果白名单中没有必要的 tag，先添加到 `allowed-tags.json`

### 8.3 先在侧边栏添加配置

在对应的 sidebar 文件中添加文档配置项：

```typescript
// 示例：添加到 tutorials/docker/deployments
items: [
  'tutorials/docker/deployments/index',
  'tutorials/docker/deployments/MySQL部署',
  'tutorials/docker/deployments/Nginx部署',
  'tutorials/docker/deployments/NewService部署',  // 新增
],
```

### 8.4 创建文档并添加 Front Matter

新建文档，添加必要的 front matter：

```md
---
title: 文档标题
date: 2026-06-22 15:30
tags: [docker, mysql, deployment]
---

# 文档标题

文档正文内容...
```

### 8.5 编写文档内容

根据文档类型编写内容：

**教程文档**：清晰的步骤说明、配置示例、常用命令、注意事项

**踩坑文档**：问题现象、原因分析、解决方案、验证结果

**Blog 文档**：背景/上下文、完整过程、中间的尝试和取舍、最终结论

### 8.6 验证

```bash
npm run check-doc-tags  # 验证 tags（必须通过）
npm run build           # 构建验证
npm run typecheck       # 类型检查
```

## 9. Blog 文档说明

Blog 用于记录跨多个工具、配置和系统的大型问题处理过程。

### 9.1 Blog 与文档的区别

| 特征 | Blog | 文档 |
|------|------|------|
| 内容范围 | 专题、链路、完整过程 | 单一动作、具体配置 |
| 长度 | 较长，包含上下文 | 较短，原子化答案 |
| 可复用性 | 建立理解，不一定复用 | 可直接复用 |
| 读者场景 | 先建立上下文，再落地执行 | 直接搜索、打开、照做 |

### 9.2 Blog 文件命名

使用日期前缀：`YYYY-MM-DD-标题.md`

示例：`2026-06-17-自动化部署链路搭建.md`

### 9.3 Blog Front Matter 示例

```md
---
slug: automated-deployment-pipeline
title: 自动化部署链路搭建
date: 2026-06-17 10:00
tags: [jenkins, docker, ci-cd]
---
```

## 10. 维护约定

- 不随意改已有文档的 URL 路径（避免外链失效）
- 新增 tag 需在 `allowed-tags.json` 中添加
- 日期字段记录创建时间，方便后续回忆和追溯
- 目录结构调整时，同步更新 sidebar 配置和相对链接

## 11. 验证工具

```bash
# 验证所有文档 tags
npm run check-doc-tags

# 输出示例
✅ docs/tutorials/docker/docker-config.md
   tags: docker, config
❌ docs/tutorials/ci/git/commands.md
   错误: 缺少 tags 字段
```

验证失败时退出码为 1，CI/CD 流程中可使用此脚本确保文档规范。
