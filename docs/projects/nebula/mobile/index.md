---
title: Nebula 移动端基座
date: 2026-10-02 10:40
tags: [nebula, guide]
---

# Nebula 移动端基座

本目录说明 nebula 仓库 `mobile/` 目录下的**移动端基座工程**（React Native 新架构 + TypeScript，一套代码输出 iOS / Android / 鸿蒙），以及与之配套的端无关共享契约包 `packages/client-sdk/`。

基座是**客户端工程**，与后端模块并列，不是「前端模块」的子集——它提供能力与约定，**不提供业务页面**。

## 文档清单

| 文档 | 说明 |
| --- | --- |
| [基座总览](./overview) | 定位与能力边界、目录结构逐项说明、与后端契约的关系、当前交付边界 |
| [使用方式](./usage-guide) | 如何在其上写业务工程、三端构建步骤、模板仓如何拿到 `mobile/` |
| [共享契约 client-sdk](./client-sdk) | `packages/client-sdk` 的边界、导出内容与 token 语义 |

## 推荐阅读顺序

1. [基座总览](./overview)
2. [共享契约 client-sdk](./client-sdk)
3. [使用方式](./usage-guide)

## 相关文档

- 移动端能力对应的服务端实现：[Notify 模块 · 移动推送与设备注册](../notify/overview)、[Frontend 模块 · 应用版本与升级检查](../frontend/app-release)
- 通知偏好（消息设置页的数据来源）：[Notify 模块 · 业务功能](../notify/business-capabilities)
- 项目分层与包设计：[设计说明](../design/index.md)
