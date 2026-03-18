---
slug: /nebula/frontend/storage-integration
title: "[草稿] 文件上传接入"
description: 说明前端如何通过共享组件接入 nebula-storage 的两阶段上传流程。
---

# [草稿] 文件上传接入

Nebula 前端并不是把上传文件当成一个“黑盒接口”来处理，而是明确对齐了 `nebula-storage` 的两阶段上传模型。你在 `nebula-portal` 里看到的 `NeFileUploader` 和共享存储类型，都是围绕这个后端模型设计的。

注意：文件上传不是最小启动链路里的默认重点能力。如果你当前只启动了最小单体或基础微服务链路，请先确认 `nebula-storage` 已经按你的环境准备好，再联调上传流程。

## 后端真实流程

`nebula-storage` 的普通文件上传流程是：

1. 创建上传任务
2. 上传普通文件
3. 完成上传任务
4. 绑定上传任务
5. 查询正式文件详情

前端文档和组件都应围绕这条链路理解，而不是假设只传一次 multipart 就结束。

## 前端已经准备好的能力

在 `nebula-portal` 中，以下内容已经对齐这套模型：

- `packages/ui/src/ne-file-uploader/README.md` 已说明推荐接法
- `packages/core/README.md` 已说明 `storage` 能力的对接逻辑
- `README.md` 中已经给出了 `VITE_STORAGE_*` 一组路径配置项

这意味着前端业务页通常只需要：

- 在 `onUpload` 中调用共享上传流程
- 在业务保存成功后传入 `sourceEntity`、`sourceId` 进行绑定
- 保存后使用正式文件信息做展示、预览或下载

## 推荐接法

### 页面层

优先使用 `NeFileUploader` 作为上传入口，避免每个业务页面重复包装拖拽上传、文件列表和错误提示。

### 业务层

把“上传任务创建、上传、完成、绑定、详情查询”封装成可复用方法，不要把五步流程散在页面组件里。

### 配置层

通过环境变量管理存储接口路径，保持 Shell、远端模块和不同环境之间的配置一致性。

## 容易踩的坑

- 业务数据还没保存成功就提前绑定，导致正式文件缺少明确归属
- 只上传不绑定，最终拿不到正式文件记录
- 前端路径配置没有和网关 `/api/storage/**` 保持一致

如果你只是想尽快跑通上传链路，建议直接结合 [后端快速启动](/docs/nebula/backend/quick-start) 和 [单体后台协作示例](/docs/nebula/examples/monolith-collaboration) 一起看。
