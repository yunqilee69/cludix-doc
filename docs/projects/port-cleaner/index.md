---
title: Port Cleaner
date: 2026-08-19 10:00
tags: [port-cleaner, network, rust, usage]
---

# Port Cleaner

本地桌面工具，用于查看当前机器上的 **TCP/UDP 端口绑定**、检查对应进程，并在明确确认后终止该进程。基于 **Tauri 2 + Rust + React + TypeScript**，所有扫描和终止操作都在本机完成。

典型场景：开发端口被占用时，快速定位占用进程并清理。

## 仓库地址

- 代码仓库：[https://github.com/yunqilee69/PortCleaner](https://github.com/yunqilee69/PortCleaner)

本地自用的桌面应用，**没有线上服务地址**，从源码构建安装包后在本机使用。

## 功能

- 列出本机 TCP 监听和 UDP 绑定，显示地址、端口、PID、进程和访问状态
- 按端口、地址、协议、进程名或 PID 过滤结果
- 查看进程详情（字段受平台和权限限制）
- 终止前要求显式确认，并重新验证目标绑定和进程生命周期身份，防止误杀 PID 复用的进程
- 对受限 / 未知所有者和 PID `0` 的记录禁用终止操作

## 使用流程

1. 先确认运行平台和可见范围：[平台支持](./平台支持)
2. 终止进程前务必阅读 [使用注意](./使用注意)
3. 自行编译安装包见 [本地构建](./本地构建)

相关文档：[OmniGate](../omnigate/) · [OmniTOTP](../omnitotp/)
