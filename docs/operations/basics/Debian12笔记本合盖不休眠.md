---
slug: /operations/debian12-lid-switch-ignore
title: "[草稿] Debian 12 笔记本合盖不休眠配置"
---

# [草稿] Debian 12 笔记本合盖不休眠配置

本文档说明如何在 Debian 12 笔记本上关闭“合盖进入休眠/挂起”行为。下面这组 `systemd-logind` 配置已实测可用，适合需要外接显示器、远程连接或长期后台运行的场景。

## 1. 适用场景

当笔记本合上盖子后，如果系统自动进入挂起，会导致以下问题：

- SSH、Docker、下载任务或后台服务被中断
- 外接显示器工作异常
- 作为轻量服务器使用时无法持续运行

如果您的目标是“合盖后继续运行，不自动休眠”，可以按本文操作。

## 2. 修改 `logind` 配置

先编辑 `systemd-logind` 配置文件：

```bash
sudo vim /etc/systemd/logind.conf
```

找到以下配置项（通常默认被 `#` 注释），修改为下面内容：

```ini
# 电池模式下，合盖忽略休眠
HandleLidSwitch=ignore

# 外接电源时，合盖忽略休眠
HandleLidSwitchExternalPower=ignore

# 接扩展坞时，合盖忽略休眠
HandleLidSwitchDocked=ignore

# 合盖时忽略抑制，确保配置生效
LidSwitchIgnoreInhibited=yes
```

## 3. 使配置生效

保存文件后，重启 `systemd-logind` 服务：

```bash
sudo systemctl restart systemd-logind
```

如果当前为图形界面环境，重启该服务后可能导致当前登录会话短暂中断。这是正常现象，建议提前保存正在编辑的内容。

## 4. 验证配置是否生效

### 方式一：检查最终配置值

```bash
grep -E '^(HandleLidSwitch|HandleLidSwitchExternalPower|HandleLidSwitchDocked|LidSwitchIgnoreInhibited)=' /etc/systemd/logind.conf
```

预期输出应包含：

```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=yes
```

### 方式二：查看 `logind` 服务状态

```bash
sudo systemctl status systemd-logind
```

确认服务已经正常启动，且没有明显报错。

### 方式三：实际合盖测试

可以按以下方式验证：

1. 保持系统开机并开启一个持续输出的任务，例如 `ping` 或 `top`
2. 合上笔记本盖子，等待几十秒到几分钟
3. 重新打开盖子，确认系统没有进入挂起，任务仍在继续运行

## 5. 常见问题排查

### 1. 改完配置仍然休眠

优先检查以下几点：

- 是否已经执行 `sudo systemctl restart systemd-logind`
- 配置项前面是否仍然保留了 `#`
- 是否存在拼写错误或重复配置
- 是否有桌面环境电源管理工具额外接管了合盖行为

部分桌面环境可能还会提供自己的电源管理设置。如果修改 `logind.conf` 后仍然无效，可以继续检查图形界面的“电源”或“节能”配置。

### 2. 只想在某种供电状态下生效

本文配置是“无论电池、外接电源还是扩展坞，合盖都忽略”。如果您只想在特定场景生效，可以只调整对应项，例如：

- 仅改 `HandleLidSwitchExternalPower`
- 保留 `HandleLidSwitch=suspend`
- 按实际使用场景组合配置

## 6. 推荐保留的最终配置

如果您的目标是让 Debian 12 笔记本在所有常见场景下合盖仍保持运行，可以直接采用以下配置：

```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=yes
```

这组配置已经实测有效，适合用作外接屏办公、下载机、开发机或轻量家用服务器。
