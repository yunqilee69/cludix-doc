---
title: Nebula Notify 模块
date: 2026-10-02 10:00
tags: [nebula, notify, guide]
---

# Nebula Notify 模块

本目录用于说明 `nebula-notify` 模块的定位、通道模型、业务能力、接入方式、配置与建表结构。

`nebula-notify` 是 Nebula 中台的统一消息中心，收录**公告、通知模板、模板渠道变体、通知类别、站内信、发送记录、订阅偏好、移动推送与设备注册**等能力。

## 文档清单

| 文档 | 说明 |
| --- | --- |
| [模块总览](./overview) | 模块定位与边界、包结构、三种载体、通道模型、模板 + 变体机制、当前不提供的能力 |
| [设计与实现](./design-and-implementation) | 模板/变体/记录三层数据关系、渠道分发、偏好判定优先级、类别数据模型、推送扇出与 APNs 发送器 |
| [业务功能](./business-capabilities) | 按能力逐条列出能做什么、不能做什么、接口组与权限码 |
| [使用方式](./usage-guide) | 建模板与变体 → 管类别 → 发通知 → 查记录 → 站内信/公告 → 偏好设置 → 设备注册 |
| [配置说明](./configuration) | `nebula.notify.*` 全量配置、邮件系统参数、APNs 凭据环境变量 |
| [建表语句](./ddl) | 13 张表的结构、字段与索引 |

## 推荐阅读顺序

1. [模块总览](./overview)
2. [业务功能](./business-capabilities)
3. [使用方式](./usage-guide)
4. [配置说明](./configuration)
5. [设计与实现](./design-and-implementation)
6. [建表语句](./ddl)
