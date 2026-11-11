---
title: Fedora GNOME 安装腾讯会议
date: 2026-11-11 15:15
tags: [linux, fedora, installation, flatpak]
---

# Fedora GNOME 安装腾讯会议

腾讯会议官方 Linux 客户端只提供 `.deb`（x86_64 / arm64），没有 rpm，也没有 AppImage。在 Fedora GNOME 上走 Flathub 的 `com.tencent.wemeet` 包安装，装完可直接登录、入会，摄像头、麦克风、共享屏幕都可用。

验证环境：Fedora 45 Workstation + GNOME Shell 51.1（Wayland 会话），Flatpak 1.18.4，腾讯会议 3.26.10.401（Flathub stable）。

## 为什么不用 deb

官方下载页和它的接口（`/web-service/query-download-info`）只回 deb：

| 包格式 | 官方是否提供 |
| --- | --- |
| `.deb`（x86_64 / arm64） | ✅ 3.26.10.401 |
| `.rpm` | ❌ 无 |
| AppImage / tar.gz | ❌ 无 |

而 Fedora 也吃不下 deb：`dnf5` 没有 dpkg 后端（`dnf install ./xxx.deb` 直接报错），`alien` 转出来的 rpm 依赖和路径经常对不上。

Flathub 上的包内置的正是官方 deb，可以直接看到官方 CDN 地址：

```bash
flatpak info --show-metadata com.tencent.wemeet | grep -E 'uri=|checksum='
# uri=https://updatecdn.meeting.qq.com/cos/72e.../TencentMeeting_0300000000_3.26.10.401_x86_64_default.publish.officialwebsite.deb
```

所以 Flathub 版本与官网版本一致，只是把依赖封进了 `org.freedesktop.Platform` 运行时，不用在 Fedora 上手动凑 Qt / GStreamer 那堆库。

## 安装

### 确认 flathub 源可用

Fedora Workstation 默认带一个 filtered 的 flathub，腾讯会议在过滤白名单里，一般开箱可用。先搜一下：

```bash
flatpak search wemeet
# Wemeet  com.tencent.wemeet  3.26.10.401  stable  flathub
```

搜不到说明 flathub 没启用或没添加：

```bash
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

### 安装应用

```bash
flatpak install flathub com.tencent.wemeet
```

首次会顺带下载运行时 `org.freedesktop.Platform/x86_64/25.08`（几百 MB）；应用本体约 16 MB，装完 `/var/lib/flatpak/app/com.tencent.wemeet` 实际占约 690 MB（含解包出来的官方程序目录）。

x86_64 和 aarch64 都有构建，同一台机器上直接装本机架构即可。

安装前也可以先看版本和运行时：

```bash
flatpak remote-info flathub com.tencent.wemeet
```

### 启动

GNOME 应用列表里的名字是「腾讯会议」（英文名 `WemeetApp`，图标分类在办公），点开即可；命令行等价写法：

```bash
flatpak run com.tencent.wemeet
```

desktop 文件还注册了 `wemeet://` 协议，浏览器里点会议邀请链接会直接唤起客户端。

## 权限与数据目录

打包方给的权限（`flatpak info --show-metadata com.tencent.wemeet` 的 `[Context]` 段）已经覆盖会议需要的全部设备：

```
shared=ipc;network;
sockets=pulseaudio;wayland;x11;
devices=all;
filesystems=xdg-run/pipewire-0;
```

网络、PulseAudio 声音、Wayland/X11 显示、摄像头（`--device=all`）、PipeWire 共享都在里面，不需要再额外 `flatpak override` 加权限。

登录态、配置、缓存都落在：

```
~/.var/app/com.tencent.wemeet/
```

换机器或重装前备份这个目录，可以省掉重新登录。卸载时它不会被自动删除，彻底清理要手动 `rm -rf`。

## 常见问题

### Wayland 会话下共享屏幕黑屏

现象：共享窗口正常，共享整个屏幕时黑屏，或只能看到腾讯会议自己的窗口。

原因：腾讯会议是 Qt 应用，默认跑在 XWayland 上；Wayland 会话下抓全屏需要拿到合成器的截屏授权，当前 Flathub 构建（3.26.10.401）并没有内置 Wayland 共享补丁——`/app/lib/wemeet/libhook.so` 在包里不存在：

```bash
flatpak run --command=sh com.tencent.wemeet -c 'ls /app/lib/wemeet'
```

处理方式按成本从低到高：

1. 共享时选择「共享窗口」而不是「共享屏幕」，只共享需要给对方看的那个窗口；
2. 需要共享全屏时，注销后在登录界面右下角齿轮里选「GNOME on Xorg」会话再开会；
3. 想留在 Wayland 又要全屏共享，参考 [wemeet-wayland-screenshare](https://github.com/xuwd1/wemeet-wayland-screenshare) 自己做钩子，但往 flatpak 里注入 `LD_PRELOAD` 要改应用本体，升级会被覆盖，不推荐日常使用。

### 输入法切不出中文

Flatpak 应用跑在独立环境里，看到的是宿主机的输入法总线。腾讯会议是 Qt 应用，切换不出来时显式指定输入法模块（用 fcitx5 就把 `ibus` 换掉）：

```bash
flatpak override --user --env=QT_IM_MODULE=ibus --env=GTK_IM_MODULE=ibus com.tencent.wemeet
flatpak run com.tencent.wemeet
```

要撤销：

```bash
flatpak override --user --unset-env=QT_IM_MODULE com.tencent.wemeet
flatpak override --user --unset-env=GTK_IM_MODULE com.tencent.wemeet
```

### 更新与卸载

```bash
flatpak update com.tencent.wemeet      # 跟随 Flathub 更新
flatpak uninstall com.tencent.wemeet
flatpak uninstall --unused             # 清掉不再被依赖的运行时
```

腾讯会议更新很频繁，Flathub 一般紧跟官方 deb 发版，卡在旧版本时先 `flatpak update` 再确认：

```bash
flatpak remote-info flathub com.tencent.wemeet | grep -E '版本|日期'
```

## 备选：直接从官方 deb 解包

不需要 flatpak、或者想装到 `/opt` 时，可以手工拆官方 deb（仅 x86_64 举例）：

```bash
sudo dnf install -y binutils
curl -LO https://updatecdn.meeting.qq.com/cos/72e0e0023e1d1e6d4123fba28821aea1/TencentMeeting_0300000000_3.26.10.401_x86_64_default.publish.officialwebsite.deb
ar x TencentMeeting_*.deb     # 得到 data.tar.xz
sudo tar -xf data.tar.xz -C / # 程序落在 /opt/wemeet
```

启动脚本是 `/opt/wemeet/wemeetapp.sh`，自己写个 desktop 文件即可。

这条路的代价是：不参与任何包管理，系统里的依赖要自己满足，每次升级都得重新下一遍 deb（链接里的 md5 目录和版本号都会变），不推荐日常用。

## 验证结果

装完按顺序自查：

```bash
flatpak list | grep -i wemeet                  # 版本应为 3.26.10.401
flatpak info com.tencent.wemeet | head -12     # 确认来源 flathub、运行时 25.08
flatpak run com.tencent.wemeet                 # 能登录、入会、出声、出画面
```

在 Fedora 45 + GNOME Wayland 上按本文步骤安装后，登录、进入会议、麦克风与摄像头、窗口共享均正常，无需任何 override 或额外的系统库。
