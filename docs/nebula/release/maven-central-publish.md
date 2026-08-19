---
title: Nebula 发布到 Maven Central
tags: [java, spring-boot, ci-cd, deployment]
date: 2026-08-19 13:30
---

# Nebula 发布到 Maven Central

Nebula 以 `cn.cloudomni:nebula-app-starter` 等坐标发布到 Maven Central。

账号注册、命名空间验证、GPG 签名、Portal 令牌、pom 要求与发布插件配置等**通用流程见 [发布管理](../../tutorials/other/发布管理)**，本文只记录 nebula 特有信息与当前进度。

## 当前状态

| 步骤 | 通用流程章节 | 状态 |
|---|---|---|
| Central Portal 账号 + `cn.cloudomni` 命名空间验证 | 发布管理 §2.1–2.4 | ✅ 已完成 |
| GPG 密钥 + Portal 令牌 | 发布管理 §2.5–2.6 | ⬜ 待操作 |
| release profile 与 pom 元数据 | 发布管理 §2.7 | ✅ 已就位（主仓根 `pom.xml`） |
| 执行发布与验证 | 发布管理 §2.8–2.9 | ⬜ 待操作 |

## 项目侧配置（已就位）

主仓根 `pom.xml` 已包含全部发布配置，无需再改：

- **`release` profile**：sources / javadoc（doclint 已关闭）/ GPG 签名 / `central-publishing-maven-plugin`（`autoPublish=true`，上传通过校验后自动发布）
- **pom 元数据**：`name/description/url/licenses/developers/scm` 齐全，子模块自动继承
- **版本**：统一由 `<revision>` 属性管理（当前 `1.0.0`），Central 不接受 SNAPSHOT，发版前确认是正式版本号

## 执行发布

```bash
cd /path/to/nebula
mvn -P release deploy -Dgpg.keyname=<密钥ID或密钥邮箱>
```

发下一版的三步：改根 pom `<revision>` → 提交打 tag（`v1.0.1`，会联动同步 nebula-template 模板仓）→ 重新执行发布命令。

## 发布验证

三处确认（Portal 显示 Published 后约 30 分钟内可同步到仓库）：

```bash
# 1. 仓库目录直查
open https://repo1.maven.org/maven2/cn/cloudomni/nebula-app-starter/

# 2. Portal 搜索
open https://central.sonatype.com/search?q=cn.cloudomni

# 3. 消费端真实拉取（最硬的验证，backend/ 模板工程就是首个消费者）
cd backend && mvn dependency:resolve
```

backend/ 模板工程的 `pom.xml` 引用 `${nebula.version}`，发布成功后它即可在任意机器上独立构建——这就是最终验收标准。

## nebula 特有排查

通用问题（签名认证、javadoc、同步延迟等）见 [发布管理 §2.10](../../tutorials/other/发布管理)，此处只列 nebula 特有项：

| 症状 | 原因与处理 |
|---|---|
| `validation failed`，提示缺 license/developers/scm | backend/ 模板工程独立于主仓 reactor，不会继承根 pom 元数据，发布自己的坐标时需自带这套元数据。 |
