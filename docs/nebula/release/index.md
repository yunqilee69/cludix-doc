---
slug: /nebula/release
title: 发布管理
tags: [java, spring-boot, ci-cd, deployment]
date: 2026-08-19 13:30
---

# 发布管理

本目录沉淀 Nebula 项目对外发布相关的文档：Maven Central 命名空间申请、GPG 签名密钥、发布流水线与验证方法。

## 文档列表

- [发布到 Maven Central 完整流程](./maven-central-publish.md) - 从 `cn.cloudomni` 命名空间申请、GPG 密钥生成与上传，到 `mvn -P release deploy` 发布与消费端验证的完整操作手册。

## 使用建议

首次操作按文档顺序执行即可：命名空间（一次性）→ GPG 密钥（一次性）→ settings.xml 凭据（一次性）→ 发布（每次发版）。日常发版只需看"执行发布"一节。
