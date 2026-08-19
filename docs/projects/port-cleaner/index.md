---
title: Port Cleaner
date: 2026-08-19 10:00
tags: [port-cleaner, network, usage, rust]
---

# Port Cleaner

本地桌面工具，用于查看当前机器上的 **TCP/UDP 端口绑定**、检查对应进程，并在明确确认后终止该进程。基于 **Tauri 2 + Rust + React + TypeScript**，所有扫描和终止操作都在本机完成。

典型场景：开发端口被占用时，快速定位占用进程并清理。

## 仓库地址

- 代码仓库：[https://github.com/yunqilee69/port-cleaner](https://github.com/yunqilee69/port-cleaner)

本地自用的桌面应用，**没有线上服务地址**，从源码构建安装包后在本机使用。

## 功能

- 列出本机 TCP 监听和 UDP 绑定，显示地址、端口、PID、进程和访问状态
- 按端口、地址、协议、进程名或 PID 过滤结果
- 查看进程详情（字段受平台和权限限制）
- 终止前要求显式确认，并重新验证目标绑定和进程生命周期身份，防止误杀 PID 复用的进程
- 对受限 / 未知所有者和 PID `0` 的记录禁用终止操作

## 平台支持

| 平台 | 状态 | 主要系统接口 |
| --- | --- | --- |
| macOS | 支持 | `lsof`、`ps`、`/bin/kill -TERM` |
| Linux | 支持 | `ss`、`ps`、`/proc/<pid>/stat`、`/bin/kill -TERM` |
| Windows | 支持 | `netstat.exe`、`tasklist.exe`、`taskkill.exe` |

实际可见范围取决于当前用户权限和操作系统安全策略。

## 使用注意

:::warning 终止进程有风险
终止进程可能导致未保存数据丢失、开发服务中断或系统组件异常。执行前请核对协议、地址、端口、PID 和进程信息。
:::

- **不会自动提权**：应用不请求管理员 / root 权限，权限不足的记录只能查看，不能终止
- Unix 平台发送 `SIGTERM`（不提供 `kill -9`）；Windows 在显式确认后使用 `taskkill /T /F` 强制结束进程树
- 仅处理本机可见的端口和进程，没有远程扫描、遥测或云端服务
- 不负责释放处于 `TIME_WAIT` 等状态的端口，只有拥有进程的活跃绑定才会随进程终止而消失

## 本地构建

**环境要求**：Node.js 20.19+ / 22.12+、Rust stable 工具链、Tauri 2 平台原生编译工具链（macOS 需 Xcode Command Line Tools，Windows 需 C++ Build Tools + WebView2，Linux 需 WebKitGTK 等依赖）。

```bash
npm ci

# 开发调试
npm run tauri dev

# 测试与校验
npm test
npm run check

# 构建当前平台的 release 安装包
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 下。Tauri 只能为当前宿主平台构建对应格式（如 DMG 只能在 macOS 上生成）。

相关文档：[Cludix TOTP](../cludix-totp/) · [项目总览](../)
