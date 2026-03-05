---
slug: /operations/ghcr-upload
title: GHCR 镜像上传指南
---

# GHCR 镜像上传指南

本文仅说明如何将 Docker 镜像上传到 GitHub Container Registry（`ghcr.io`），并按公有镜像方式发布。

适用账号：`yunqilee69`

## 1. GHCR 是什么

GHCR（GitHub Container Registry）是 GitHub 提供的容器镜像仓库。

命名空间格式：`ghcr.io/yunqilee69/<package>:<tag>`

## 2. 前置准备

请先准备：

- 已登录 GitHub 账号 `yunqilee69`
- 本机安装 Docker
- 创建 GitHub Personal Access Token（classic），至少包含：
  - `write:packages`（上传必需）
  - `read:packages`（本地验证拉取建议）
  - `delete:packages`（可选）

公有镜像场景下，其他用户拉取镜像通常不需要登录。

建议将 PAT 放到环境变量中，避免明文暴露在命令历史里。

## 3. 登录 GHCR

PowerShell：

```powershell
$env:GHCR_TOKEN = "<你的PAT>"
$env:GHCR_TOKEN | docker login ghcr.io -u yunqilee69 --password-stdin
```

Bash：

```bash
export GHCR_TOKEN="<你的PAT>"
echo "$GHCR_TOKEN" | docker login ghcr.io -u yunqilee69 --password-stdin
```

登录成功会显示 `Login Succeeded`。

## 4. 上传 Docker 镜像

以下示例将当前目录镜像上传为 `demo-app:v1.0.0`。

1) 构建镜像

```bash
docker build -t ghcr.io/yunqilee69/demo-app:v1.0.0 .
```

2) 推送镜像

```bash
docker push ghcr.io/yunqilee69/demo-app:v1.0.0
```

3) 拉取验证

```bash
docker pull ghcr.io/yunqilee69/demo-app:v1.0.0
```

## 5. 设置为公有镜像

首次推送后，建议立即将包可见性设置为 Public：

1) 打开包页面：`https://github.com/users/yunqilee69/packages`
2) 进入对应包（例如 `demo-app`）
3) 打开 `Package settings`
4) 在 `Danger Zone` 中将可见性改为 `Public`

设置完成后，其他用户可直接拉取：

```bash
docker pull ghcr.io/yunqilee69/demo-app:v1.0.0
```

## 6. 页面查看与权限说明

上传后可在 GitHub 页面查看：

- `https://github.com/users/yunqilee69/packages`

权限补充：

- 公有包可匿名拉取；私有包才要求登录并具备 `read:packages`
- 推送报 `denied: permission` 时，优先检查 PAT scopes 与账号名是否正确

## 7. 常见问题排查

1) `denied: permission` 或 `unauthorized`

- 检查 PAT 是否包含 `write:packages`
- 确认登录地址是 `ghcr.io`
- 确认用户名是 `yunqilee69`

2) 推送路径错误

- 正确格式是 `ghcr.io/yunqilee69/<package>:<tag>`

3) 拉取失败

- 检查包可见性是否已切换为 Public
- 若仍为 private，拉取端需要登录并具备读取权限

## 8. 推荐命名规范

- 包名使用小写短横线：`demo-app`、`ml-model`
- tag 建议语义化：`v1.0.0`、`v1.0.1`
- 可同时维护 `latest` 标签

示例：

```bash
docker tag ghcr.io/yunqilee69/demo-app:v1.0.0 ghcr.io/yunqilee69/demo-app:latest
docker push ghcr.io/yunqilee69/demo-app:latest
```
