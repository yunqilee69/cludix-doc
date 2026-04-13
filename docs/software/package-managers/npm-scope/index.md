---
slug: /software/package-managers/npm-scope
title: npm 作用域包与私有仓库配置
---

# npm 作用域包与私有仓库配置指南

## 概述

在企业环境中，通常需要将私有包托管在内部仓库，而公共包从官方 npm registry 下载。npm 的**作用域（scope）**机制提供了一种批量指定包来源的优雅方式，同时也支持单独包的精细控制。

---

## 核心概念：作用域（Scope）

### 什么是作用域？

作用域是 npm 包命名的一种方式，格式为 `@scope-name/package-name`，例如：
- `@mycompany/ui-components`
- `@babel/core`
- `@types/node`

作用域的作用：
1. **命名空间隔离**：避免包名冲突
2. **来源关联**：可将特定作用域绑定到特定 registry
3. **权限控制**：私有仓库通常要求包必须使用作用域

---

## 配置方式

### 1. 批量指定：作用域绑定 registry

将某个作用域的所有包指向私有仓库，其他包仍走全局配置。

#### 方法一：项目级 `.npmrc`

在项目根目录创建 `.npmrc` 文件：

```
# 全局 registry（默认）
registry=https://registry.npmmirror.com

# 将 @mycompany 作用域的所有包指向私有仓库
@mycompany:registry=https://npm.mycompany.com

# 私有仓库认证（如需要）
//npm.mycompany.com/:_authToken=${NPM_TOKEN}
```

#### 方法二：用户级配置

```bash
# 设置全局 registry
npm config set registry https://registry.npmmirror.com

# 将作用域绑定到私有仓库
npm config set @mycompany:registry https://npm.mycompany.com
```

#### 方法三：环境变量（CI/CD 推荐）

```bash
# 通过环境变量设置
NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
NPM_CONFIG__MYCOMPANY_REGISTRY=https://npm.mycompany.com
```

:::note 注意
环境变量中作用域的 `@` 符号需转换为 `_`（双下划线），如 `@mycompany` → `_mycompany`。
:::

#### 配置优先级

npm 配置的优先级（从高到低）：

1. 命令行参数（`--registry`）
2. 项目级 `.npmrc`（项目根目录）
3. 用户级 `.npmrc`（`~/.npmrc`）
4. 全局级 `.npmrc`（`$PREFIX/etc/npmrc`）
5. npm 内置默认值

---

### 2. 单包指定：单独包的 registry 控制

当某个特定包需要走不同仓库时（无论是否属于作用域），可单独配置。

#### 方法一：`.npmrc` 单包映射

```
# 单独指定某个包的 registry
# 格式：//registry/:_authToken 或 package:registry
my-special-package:registry=https://special-registry.example.com

# 或者使用完整路径形式（常用于认证）
//special-registry.example.com/my-special-package/:_authToken=xxx
```

#### 方法二：安装时指定

```bash
# 安装时临时指定 registry
npm install my-package --registry=https://custom-registry.example.com

# 或使用别名安装
npm install my-package@npm:https://custom-registry.example.com/my-package
```

#### 方法三：package.json 依赖声明（npm 7+）

```json
{
  "dependencies": {
    "@mycompany/core": "1.0.0",
    "custom-package": "npm:https://private-registry.com/custom-package@1.2.0"
  }
}
```

---

## 完整配置示例

### 企业项目典型配置

**项目根目录 `.npmrc`：**

```
# 默认使用国内镜像加速公共包
registry=https://registry.npmmirror.com

# 公司私有包走内部仓库
@company:registry=https://npm.company.internal

# 另一个合作方的作用域
@partner:registry=https://npm.partner.com

# 第三方私有包单独指定（不属于任何作用域）
some-private-lib:registry=https://npm.company.internal

# 私有仓库认证
//npm.company.internal/:_authToken=${NPM_TOKEN}
//npm.partner.com/:_authToken=${PARTNER_NPM_TOKEN}
```

### CI/CD 环境变量配置

```yaml
# GitLab CI 示例
variables:
  NPM_CONFIG_REGISTRY: "https://registry.npmmirror.com"
  NPM_CONFIG__COMPANY_REGISTRY: "https://npm.company.internal"
  NPM_TOKEN: "${CI_NPM_TOKEN}"
```

---

## 作用域 vs 单包配置对比

| 特性 | 作用域批量指定 | 单包指定 |
|------|---------------|---------|
| 适用场景 | 多个包来自同一仓库 | 个别特殊包 |
| 配置方式 | `@scope:registry=url` | `package:registry=url` |
| 命名要求 | 包名必须带作用域前缀 | 无命名限制 |
| 管理成本 | 低（一次配置） | 高（逐包配置） |
| 灵活性 | 中 | 高 |

---

## 认证配置

### Token 认证

```
# 方式一：直接写 token（不推荐，有安全风险）
//npm.company.internal/:_authToken=npm_token_here

# 方式二：环境变量引用（推荐）
//npm.company.internal/:_authToken=${NPM_TOKEN}

# 方式三：使用 npmrc 文件并设置权限
# 将 token 存在 ~/.npmrc.user，工作时合并
```

### Basic Auth

```
//npm.company.internal/:username=myuser
//npm.company.internal/:_password=mypasswordbase64
```

:::tip 密码转 Base64
将密码转为 base64：`echo -n 'mypassword' | base64`
:::

---

## 常见问题

### Q1: 作用域包安装失败，提示 404？

**原因**：作用域未正确绑定 registry，npm 尝试从默认 registry 查找。

**解决**：检查 `.npmrc` 中 `@scope:registry` 配置是否正确。

### Q2: 公共作用域包（如 @babel/core）被错误路由到私有仓库？

**原因**：误将公共作用域绑定到私有 registry。

**解决**：只绑定私有作用域，公共作用域（@babel、@types 等）走默认 registry。

### Q3: 如何查看当前包会从哪个 registry 下载？

```bash
npm config get @mycompany:registry
npm config get registry

# 或查看完整配置
npm config list
```

### Q4: 单包配置优先级高于作用域吗？

是的。npm 的 registry 查找顺序：

1. 单包显式指定（`package:registry`）
2. 作用域绑定（`@scope:registry`）
3. 全局默认 registry

---

## 最佳实践

1. **私有包必须使用作用域**：便于批量管理，也符合私有仓库要求
2. **认证信息用环境变量**：避免 token 硬编码在 `.npmrc`
3. **项目级配置优于用户级**：确保团队成员配置一致
4. **CI/CD 使用环境变量**：便于安全和动态配置
5. **验证配置**：`npm config list` 检查生效配置

---

## 附录：常用 registry 地址

| Registry | 地址 |
|----------|------|
| npm 官方 | https://registry.npmjs.org |
| npmmirror（淘宝） | https://registry.npmmirror.com |
| Verdaccio（本地私有） | http://localhost:4873 |
| Artifactory | https://artifactory.company.com/artifactory/api/npm/npm-remote |
| GitHub Packages | https://npm.pkg.github.com |