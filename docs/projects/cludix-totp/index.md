---
title: Cludix TOTP
date: 2026-08-19 10:00
tags: [cludix-totp, auth, security, usage]
---

# Cludix TOTP

轻量级 TOTP（Time-based One-Time Password，基于时间的一次性密码）桌面工具，基于 **Tauri 2 + React + Rust** 构建，用于管理多账号的两步验证码。

定位是"简单够用"：不追求加密保险库等重型功能，只做 TOTP 密码的本地生成与管理。纯本地运行，无网络请求、无数据上传。

## 仓库地址

- 代码仓库：[https://github.com/yunqilee69/cludix-totp](https://github.com/yunqilee69/cludix-totp)

本地自用的桌面应用，**没有线上服务地址**，从源码构建安装包后在本机使用。

## 功能特性

- 解析标准 `otpauth://totp` URI
- 实时显示 TOTP 验证码，每 30 秒自动刷新
- 倒计时进度条显示剩余有效时间
- 多账号管理（添加 / 删除）
- 点击验证码一键复制到剪贴板
- 配置以本地 JSON 文件存储

## 使用方式

### 添加账号

点击右上角「添加账号」按钮，粘贴从认证服务获取的 `otpauth://totp` URI。

**URI 格式**：

```text
otpauth://totp/[服务商]:[账号]?secret=[密钥]&issuer=[服务商]&algorithm=SHA1&digits=6&period=30
```

**参数说明**：

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `secret` | Base32 编码的密钥（必需） | - |
| `issuer` | 服务提供商名称 | - |
| `algorithm` | HMAC 算法：SHA1 / SHA256 / SHA512 | SHA1 |
| `digits` | 密码位数：6 或 8 | 6 |
| `period` | 有效周期（秒） | 30 |

### 查看与复制验证码

添加成功后，账号卡片会实时显示 6 位验证码和剩余时间进度条，点击数字即可复制到剪贴板。

### 删除账号

点击卡片底部的「删除」按钮移除账号。

### 批量导入

可直接编辑配置文件批量添加账号（见下节），编辑后重启应用生效。

## 配置存储

配置文件位置（各平台统一）：

| 系统 | 路径 |
| --- | --- |
| Windows | `C:\Users\<用户名>\.config\cludix-totp\config.json` |
| macOS | `~/.config/cludix-totp/config.json` |
| Linux | `~/.config/cludix-totp/config.json` |

**配置文件格式**：

```json
{
  "accounts": [
    {
      "id": "ExampleCorp:user@example.com:JBSW",
      "issuer": "ExampleCorp",
      "account": "user@example.com",
      "uri": "otpauth://totp/ExampleCorp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ExampleCorp",
      "config": {
        "secret": "JBSWY3DPEHPK3PXP",
        "digits": 6,
        "period": 30,
        "algorithm": "SHA1"
      }
    }
  ]
}
```

:::warning 注意
Secret 是敏感信息，请妥善保管 `config.json`，不要提交到公开仓库。
:::

## 本地构建

**环境要求**：Node.js 18+、Rust 1.70+。

```bash
npm install

# 开发调试
npm run tauri:dev

# 构建安装包（在对应操作系统上执行）
npm run build:win         # Windows x64
npm run build:win-arm64   # Windows ARM64
npm run build:mac         # macOS Universal（Intel + Apple Silicon）
npm run build:mac-x64     # macOS Intel
npm run build:mac-arm64   # macOS Apple Silicon
npm run build:linux       # Linux x64
npm run build:linux-arm64 # Linux ARM64
```

构建产物位于 `src-tauri/target/release/bundle/` 下（Windows 为 `.exe`，macOS 为 `.dmg`，Linux 为 `.deb` / `.rpm` / `.AppImage`）。

## 安全说明

- 密钥仅存储在本地
- 无网络请求
- 无数据上传

相关文档：[Port Cleaner](../port-cleaner/) · [项目总览](../)
