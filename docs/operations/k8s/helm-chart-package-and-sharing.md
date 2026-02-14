# 从零构建 Helm Chart 包并分享给他人

本文介绍如何把一个 Kubernetes 应用封装成 Helm Chart 包，并通过多种方式分享给团队成员使用。

## 1. Helm Chart 是什么

Helm Chart 可以理解为 Kubernetes 应用的安装包，通常包含以下结构：

- `Chart.yaml`：Chart 元信息（名称、版本、描述）
- `values.yaml`：默认配置参数
- `templates/`：Kubernetes 资源模板
- `charts/`（可选）：依赖的子 Chart

最终会打包成 `.tgz` 文件，供安装或发布到仓库。

## 2. 前置准备

确保环境中已安装 Helm 与 kubectl：

```bash
helm version
kubectl version --client
```

## 3. 创建 Chart

### 3.1 初始化项目

```bash
helm create myapp
```

会生成 `myapp/` 目录及基础模板。

### 3.2 修改 Chart 元信息

编辑 `myapp/Chart.yaml`：

```yaml
apiVersion: v2
name: myapp
description: A Helm chart for deploying my app
type: application
version: 0.1.0
appVersion: "1.0.0"
```

说明：

- `version`：Chart 包版本（Chart 有改动就应递增）
- `appVersion`：应用版本（通常对应镜像版本）

### 3.3 配置默认参数

编辑 `myapp/values.yaml`，将镜像、端口、副本数等做成可配置项：

```yaml
replicaCount: 2

image:
  repository: nginx
  tag: "1.27"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
```

模板中可通过 `{{ .Values.xxx }}` 引用这些值。

## 4. 本地验证

打包前建议先检查语法和渲染结果：

```bash
helm lint myapp
helm template myapp ./myapp
```

如有测试集群，也可以试装：

```bash
helm install myapp-dev ./myapp -n demo --create-namespace
helm list -n demo
```

## 5. 打包 Chart

在 Chart 上级目录执行：

```bash
helm package myapp
```

输出类似：

```text
myapp-0.1.0.tgz
```

## 6. 分享给他人的三种方式

### 方式 A：直接分享 `.tgz` 文件（最快）

适合临时协作或小范围分发。

对方安装：

```bash
helm install myapp ./myapp-0.1.0.tgz
```

### 方式 B：发布到 Helm HTTP 仓库

适合团队长期使用。

发布方操作：

```bash
# 假设将 chart 包放在 repo/ 目录
helm repo index repo/
```

然后将 `repo/`（含 `index.yaml` 和 `.tgz` 文件）发布到可访问的静态站点（如 Nginx、GitHub Pages、对象存储）。

使用方操作：

```bash
helm repo add myrepo https://example.com/charts
helm repo update
helm search repo myrepo/myapp
helm install myapp myrepo/myapp --version 0.1.0
```

### 方式 C：发布到 OCI Registry（推荐）

适合企业和正式环境，具备更好的权限与版本管理能力。

发布方操作（以 GHCR 为例）：

```bash
helm registry login ghcr.io
helm package myapp
helm push myapp-0.1.0.tgz oci://ghcr.io/<org>/charts
```

使用方操作：

```bash
helm registry login ghcr.io
helm pull oci://ghcr.io/<org>/charts/myapp --version 0.1.0
helm install myapp oci://ghcr.io/<org>/charts/myapp --version 0.1.0
```

## 7. 版本管理建议

- 每次修改模板、默认参数或依赖，递增 `version`
- 每次业务版本升级，更新 `appVersion`
- 建议采用语义化版本：`MAJOR.MINOR.PATCH`

## 8. 建议附带给使用方的 README 模板

```markdown
## 安装
helm repo add myrepo https://example.com/charts
helm repo update
helm install myapp myrepo/myapp --namespace demo --create-namespace

## 自定义参数安装
helm install myapp myrepo/myapp -f values-prod.yaml

## 升级
helm upgrade myapp myrepo/myapp -f values-prod.yaml

## 卸载
helm uninstall myapp -n demo
```

## 9. 常见问题

- 打包后忘记升级 `version`，导致同版本冲突
- `values.yaml` 默认值不合理，别人安装后直接失败
- 未先执行 `helm lint` 与 `helm template`，上线才发现模板错误
- 只分享包不分享使用说明，接收方落地成本高

---

如果需要，我可以再补一份适用于生产环境的 Chart 模板（含 Deployment、Service、Ingress、HPA、resources、探针配置和分环境 values 文件）。
