---
title: OmniTOTP
date: 2026-08-19 10:00
tags: [omnitotp, auth, security, usage]
---

# OmniTOTP

轻量级 TOTP（Time-based One-Time Password，基于时间的一次性密码）桌面工具，基于 **Tauri 2 + React + Rust** 构建，用于管理多账号的两步验证码。

定位是"简单够用"：不追求加密保险库等重型功能，只做 TOTP 密码的本地生成与管理。纯本地运行，无网络请求、无数据上传。

## 仓库地址

- 代码仓库：[https://github.com/yunqilee69/OmniTOTP](https://github.com/yunqilee69/OmniTOTP)

本地自用的桌面应用，**没有线上服务地址**，从源码构建安装包后在本机使用。

## 功能特性

- 解析标准 `otpauth://totp` URI，也支持从二维码图片导入
- 实时显示 TOTP 验证码，按账号周期（默认 30 秒）自动刷新
- 倒计时进度条显示剩余有效时间
- 多账号管理（添加 / 编辑 / 删除），删除需二次确认
- 验证码显示策略：跟随全局设置 / 始终隐藏 / 始终显示，全局可设为「打开应用时默认隐藏验证码」
- 点击验证码一键复制到剪贴板
- 配置以本地 JSON 文件存储

## 使用流程

1. 按 [使用方式](./使用方式) 录入账号（粘贴 `otpauth://` URI 或用二维码图片导入）
2. 账号卡片实时显示验证码，点击即可复制
3. 需要批量维护账号时，直接改 [配置存储](./配置存储) 中的 `config.json`
4. 自行编译安装包见 [本地构建](./本地构建)

## 安全说明

- 密钥仅存储在本地
- 无网络请求
- 无数据上传

相关文档：[OmniGate](../omnigate/) · [Port Cleaner](../port-cleaner/)
