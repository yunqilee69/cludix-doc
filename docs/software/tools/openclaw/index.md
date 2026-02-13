# OpenClaw 安装与基础配置

本文介绍 OpenClaw 的基础安装流程与初始化注意事项，建议在 Linux 环境中使用：
- 使用 `npm` 安装 OpenClaw 与运行网关（Gateway）
- 使用 `docker` 运行智能体（Agent）以实现隔离

## 前置要求

- 已安装 `Node.js` 22 及以上版本

## 安装 OpenClaw

```bash
npm install -g openclaw@latest
```

## 初始化

```bash
openclaw onboard --install-daemon
```

按提示完成安装时，建议注意以下几点：

1. 安装模式选择“推荐模式”（新手模式）。
2. 渠道、`skills` 等配置能跳过的可先跳过。
3. 模型先使用默认选项，后续再按需求调整。
4. `gateway` 的 token 可在新终端中执行以下命令生成：

```bash
openssl rand -hex 32
```

## 后续配置（待补充）

后续可按需补充以下内容：

1. 配置模型提供商
2. 配置智能体
3. 配置渠道
4. 配置网页访问
