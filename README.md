# 云寰文档站

基于 [Docusaurus 3](https://docusaurus.io/) 搭建的个人技术文档站，收录教程、踩坑记录与专题 Blog。

## 环境要求

- Node.js `>=20`
- pnpm `>=9`（`corepack enable` 或 `npm install -g pnpm`）

## 常用命令

```bash
pnpm install            # 安装依赖
pnpm start              # 本地开发（默认 http://localhost:3000）
pnpm build              # 构建静态产物到 build/
pnpm serve              # 本地预览构建产物
pnpm typecheck          # TypeScript 类型检查
pnpm check-doc-tags     # 校验文档 front matter 与 tags（CI 必须通过）
```

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `docs/tutorials/` | 教程：一个动作、一个配置、一个命令 |
| `docs/troubleshooting/` | 踩坑：报错处理与问题排查 |
| `docs/projects/` | 自研项目文档（OmniTOTP、Port Cleaner） |
| `docs/finance/` | 投资理财专题 |
| `docs/nebula/` | Nebula 平台文档（后续独立成站，不参与 tags 校验） |
| `blog/` | 跨工具的完整链路与方案思考 |
| `sidebars/` | 侧边栏配置，**全部手写**，一个项目一个 sidebar |
| `scripts/check-doc-tags.js` | 文档 front matter / tags 校验脚本 |
| `allowed-tags.json` | tags 白名单（即实际在用词表） |

## 文档规范

新增或修改文档前，先读 [`AGENTS.md`](./AGENTS.md)，要点：

1. 每篇文档必须有 front matter：`title`、`date`，正文页必须写 `tags`（目录索引页 `index.md` 可省略 tags）
2. `tags` 必须取自 `allowed-tags.json` 白名单
3. 新增 / 改名 / 移动 / 删除文档后，必须同步更新 `sidebars/` 里对应的条目
4. 文档互链使用相对路径，不带 `.md`

提交前至少跑通：

```bash
pnpm check-doc-tags
pnpm build          # onBrokenLinks: "throw"，死链会直接导致构建失败
```

## 部署

由 Jenkins 自动部署（完整链路见 [Jenkins 全链路部署实战](./blog/2026-06-22-jenkins全链路部署实战.md)）：

```
GitHub push → webhook 触发 Jenkins → pnpm install → pnpm build
→ SSH 上传 build/ 到云服务器 /var/www/cludix-doc → nginx -t → systemctl reload nginx
```

服务器上由 nginx 托管 `/var/www/cludix-doc` 的静态产物，每次部署前会先备份上一版目录。
