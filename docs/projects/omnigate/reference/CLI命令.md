---
title: CLI 命令
date: 2026-10-31 20:00
tags: [omnigate, installation, guide]
---

# CLI 命令

```text
omnigate [command] [flags]
```

不带子命令时等同于 `omnigate start`。

## 子命令

| 命令 | 说明 |
| --- | --- |
| `start` | 启动服务（默认后台模式） |
| `stop` | 停止运行中的服务 |
| `restart` | 先停止，再用相同参数启动 |
| `status` | 查看服务状态 |
| `update` | 检查并更新到最新版本 |
| `autostart` | 安装/卸载/查看开机自启（`install` / `uninstall` / `status`） |
| `help` | 显示帮助 |

## start 标志

| 标志 | 说明 |
| --- | --- |
| `--db <path>` | 数据库文件路径，默认 `~/.omnigate/omnigate.db` |
| `--config <path>` | 配置文件路径，默认 `~/.omnigate/config.yaml` |
| `--log <path>` | 日志输出，默认 `~/.omnigate/omnigate.log`；支持 `stdout` / `stderr` / `off` |
| `--host <addr>` | 覆盖 `server.host` |
| `--port <n>` | 覆盖 `server.port` |
| `--foreground` | 前台运行 |
| `--version` | 显示版本 |

## stop / status 标志

| 标志 | 说明 |
| --- | --- |
| `--db <path>` | 目标实例的数据库路径；PID 文件与它同目录 |

远程数据库实例的 PID 文件落在 `~/.omnigate/`，按数据库目标派生实例名。

## restart 标志

`--db --config --log --host --port --foreground`，其余同 `start`。

## update 标志

| 标志 | 说明 |
| --- | --- |
| `--check` | 只检查是否有新版本，不下载安装 |

CLI 更新成功后不会自动重启：前台/手动启动的实例由用户自行 `omnigate restart`；后台守护进程可以从管理台一键更新并自动重启。

## autostart 标志

`--db --config --log --host --port`，用于选择目标实例。

```bash
omnigate autostart install
omnigate autostart status
omnigate autostart uninstall
```

详情见 [开机自启](../operations/开机自启)。

## 开发实例

开发模式使用仓库内数据库和固定端口：

```bash
./omnigate stop    --db ./data/omnigate.db
./omnigate restart --db ./data/omnigate.db
./omnigate status  --db ./data/omnigate.db
```

## 示例

```bash
omnigate                                 # 后台启动
omnigate start --foreground              # 前台启动
omnigate start --host 0.0.0.0 --port 8080
omnigate start --db ~/work/og.db
omnigate start --config ~/my.yaml
omnigate update --check
```
