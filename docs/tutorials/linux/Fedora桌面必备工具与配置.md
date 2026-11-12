---
title: Fedora GNOME 桌面必备工具与配置
date: 2026-11-12 17:30
tags: [linux, fedora, guide, configuration]
---

# Fedora GNOME 桌面必备工具与配置

Fedora Workstation 装完能跑，但日常用起来还差一层：托盘图标、最小化按钮、电池百分比、剪贴板历史都在 GNOME 默认之外；Flatpak 应用的权限管理和残留清理也需要专门工具。

本文按「先装工具、再配桌面」的顺序走，命令都可以直接复制执行。

验证环境：Fedora 45 Workstation，GNOME Shell 51.1（Wayland 会话），dnf5 5.4.7.0，Flatpak 1.18.4。

## 全文速览

```bash
# 第一步：系统层工具
sudo dnf install gnome-tweaks dconf-editor timeshift gnome-shell-extension-appindicator

# 第二步：桌面应用层（Flatpak）
flatpak install flathub com.mattjakeman.ExtensionManager \
                       com.github.tchx84.Flatseal \
                       io.github.flattool.Warehouse
```

装完跳到「配置 GNOME 桌面」一节逐条过一遍配置，桌面才算顺手。

## 为什么分 dnf 和 Flatpak

| 层 | 装什么 | 包管理器 | 安装位置 |
| --- | --- | --- | --- |
| 系统层 | 驱动、固件、系统设置类 GUI | `dnf` | `/usr`，随系统升级 |
| 桌面应用层 | 浏览器、IDE、会议软件、沙箱管理工具 | `flatpak` | `/var/lib/flatpak`，独立更新 |
| 桌面外壳层 | GNOME Shell 扩展 | Extension Manager | `~/.local/share/gnome-shell/extensions/` |

判断标准：**要深度接触系统的（驱动、文件系统、防火墙、系统设置）走 dnf；纯 GUI 应用走 Flatpak。**

Flatpak 与 dnf 的分工细节、国内镜像配置见 [Flatpak 是什么与 Fedora 国内源配置](./Flatpak介绍与国内源)。

## 第一步：装系统层工具

```bash
sudo dnf install gnome-tweaks dconf-editor timeshift gnome-shell-extension-appindicator
```

### gnome-tweaks

GNOME 的「高级设置」，装完系统第一件事就干这个。

```bash
sudo dnf install gnome-tweaks
gnome-tweaks
```

必改项：

| 设置 | 位置 | 作用 |
| --- | --- | --- |
| 标题栏按钮加最小化/最大化 | 窗口 → 标题栏按钮 | 默认只有关闭按钮 |
| 显示电池百分比 | 顶栏 → 电池百分比 | 默认只显示图标 |
| 触摸板轻触即点击 | 键盘和鼠标 → 鼠标点击模拟 | 部分机型默认需按压 |
| 字体与缩放比例 | 字体 | 高分屏按整数比例调 |

对应的 gsettings 写在「配置 GNOME 桌面」一节，适合写进装机脚本。

### dconf-editor

Tweaks 覆盖常用项，剩下隐藏开关在这里：概览动画、搜索范围、文件管理器行为、Shell 内部超时。

```bash
sudo dnf install dconf-editor
dconf-editor
```

按路径搜比按名字搜快：

| 路径 | 可改什么 |
| --- | --- |
| `org/gnome/desktop/wm/preferences` | 窗口焦点模式、工作区数量 |
| `org/gnome/desktop/interface` | 字体、缩放、时钟格式 |
| `org/gnome/shell` | 概览与搜索行为、扩展开关 |
| `org/gnome/mutter` | 动画速度、分数缩放实验特性 |

改错想还原：`dconf reset -f /org/gnome/<路径>/`，或在 dconf-editor 里点「恢复默认值」。

### Timeshift

系统快照与回滚。装驱动、换内核、折腾主题之前拍一张，出问题能回滚，比修系统快得多。

```bash
sudo dnf install timeshift
sudo timeshift-gtk
```

配置建议：

1. 模式选 **RSYNC**（Btrfs 用户可选 BTRFS，更快）
2. 位置选**系统盘之外**的磁盘或分区
3. 计划保留每日 5 份、每周 2 份

注意 RSYNC 模式的快照不包含 `/home`，个人文件另配 Déjà Dup 或 `restic`。

### fwupd（Fedora 默认已装）

固件更新。笔记本 BIOS/EC、扩展坞、部分 SSD 固件都能通过它更新，不必去厂商官网找工具。

```bash
fwupdmgr get-devices        # 列出可更新设备
fwupdmgr refresh            # 刷新固件元数据
fwupdmgr get-updates        # 查看可用更新
fwupdmgr update             # 安装
```

虚拟机里通常查不到可更新设备，属正常。

### 另外两个按需装

```bash
sudo dnf install gparted          # 真正要改分区表时用
sudo dnf install firewall-config  # firewalld 的图形前端
```

`gnome-disks` 默认已装，看 SMART、改挂载选项、做基准测试都够用，只有要动分区表才需要 gparted。`firewalld` 默认在跑，命令行 `sudo firewall-cmd --list-all` 就能看规则。

> `gufw` 是 Ubuntu 生态的 ufw 前端，Fedora 源里没有，别照抄网上的 `dnf install gufw`。

## 第二步：装桌面应用层（Flatpak）

```bash
flatpak install flathub com.mattjakeman.ExtensionManager \
                       com.github.tchx84.Flatseal \
                       io.github.flattool.Warehouse
```

### Extension Manager

图形化管理 GNOME 扩展。比 extensions.gnome.org 网页版可靠，关键是**会自动过滤掉与当前 Shell 版本不兼容的扩展**，不会出现「装了发现被系统禁用」的情况。

| 用途 | 说明 |
| --- | --- |
| 搜索安装卸载 | 按 Shell 版本过滤结果 |
| 启停扩展 | 出问题先禁掉最近装的那个 |
| 打开配置界面 | 各扩展自己的设置页 |
| 检查更新 | 批量更新已装扩展 |

手工装进 `~/.local/share/gnome-shell/extensions/` 的扩展也能被识别管理，不必重装。

### Flatseal

Flatpak 应用权限管理器。装完任何 Flatpak 应用都该过一眼。

遇到「选不了某目录的文件」「读不到 U 盘」「下载目录写不进去」「没有网络」，八成是权限没开，不是软件坏了。

图形化操作：

1. 左侧选中应用
2. 勾选需要的权限：`Filesystem` 下的 `home`、`host`、`/run/media`（U 盘），`Network` 下的 `share`
3. 或在 `Environment` 里加变量

命令行等价写法：

```bash
# 允许某应用访问主目录
flatpak override --user --filesystem=home com.visualstudio.code

# 允许访问可移动介质
flatpak override --user --filesystem=/run/media com.visualstudio.code

# 查看当前权限
flatpak info --show-permissions com.visualstudio.code

# 全部重置
flatpak override --user --reset com.visualstudio.code
```

### Warehouse

Flatpak 应用管家：查看已装应用与运行时、清理残留、降级版本、查依赖。

`flatpak uninstall` 不会删 `~/.var/app/<应用 ID>/`，那是应用数据（登录态、配置、缓存），积攒久了几个 GB 很正常。Warehouse 能一次看清「哪些应用已卸载但数据还留着」。

命令行版：

```bash
flatpak uninstall --unused          # 清掉不再被使用的运行时
du -sh ~/.var/app/* | sort -h       # 看数据目录实际占用
```

## 配置 GNOME 桌面

以下命令执行即生效，无需重启。全部是当前用户的 gsettings，不影响其他用户。

### 窗口按钮

GNOME 默认只留关闭按钮，从 Windows 转过来会很难受。

```bash
# 最小化、最大化、关闭
gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'

# 放到左侧（类比 macOS）：把 appmenu 挪到冒号右边
# gsettings set org.gnome.desktop.wm.preferences button-layout 'close,minimize,maximize:appmenu'
```

查看当前值：`gsettings get org.gnome.desktop.wm.preferences button-layout`

### 触摸板

```bash
# 轻触即点击
gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true

# 双指滚动（默认已开，如需确认）
gsettings set org.gnome.desktop.peripherals.touchpad two-finger-scrolling-enabled true
```

### 顶栏时钟

```bash
gsettings set org.gnome.desktop.interface clock-show-seconds true
gsettings set org.gnome.desktop.interface clock-show-weekday true
gsettings set org.gnome.desktop.interface clock-show-date true
```

### 电池百分比

```bash
gsettings set org.gnome.desktop.interface show-battery-percentage true
```

台式机和虚拟机没有电池，设了也不显示，可跳过。

### 深色主题与外观

```bash
# 系统级深色（GNOME 42+ 的官方开关，优先用它）
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
```

要让 GTK3 老应用也跟上 libadwaita 的圆角与配色，装 adw-gtk3：

```bash
sudo dnf install adw-gtk3-theme papirus-icon-theme

gsettings set org.gnome.desktop.interface gtk-theme 'adw-gtk3-dark'
gsettings set org.gnome.desktop.interface icon-theme 'Papirus-Dark'
```

### 字体

```bash
# 等宽字体（终端、代码）
sudo dnf install jetbrains-mono-fonts-all
gsettings set org.gnome.desktop.interface monospace-font-name 'JetBrains Mono 11'
```

界面字体按需调整，例如：

```bash
gsettings set org.gnome.desktop.interface font-name 'Adwaita Sans 11'
gsettings set org.gnome.desktop.interface document-font-name 'Adwaita Sans 11'
```

### 动画

虚拟机、远程桌面、核显机器上动画会明显掉帧，关掉后跟手感立刻正常：

```bash
gsettings set org.gnome.desktop.interface enable-animations false

# 想恢复
# gsettings set org.gnome.desktop.interface enable-animations true
```

### 热区

```bash
# 左上角触发概览（默认开启）
gsettings set org.gnome.desktop.interface enable-hot-corners true
```

### 托盘图标

微信、QQ、Steam、腾讯会议的托盘图标需要 AppIndicator 扩展支持，否则会完全消失——这是新装 Fedora 最常见的「软件坏了」误判。

```bash
sudo dnf install gnome-shell-extension-appindicator
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com

# 确认已启用
gnome-extensions list --enabled | grep appindicator
```

### 截图快捷键

GNOME 51 的 `Print` 已绑到内置截图 UI，带框选、箭头、文字标注，日常截图够用，不必额外装 Flameshot。

```bash
gsettings get org.gnome.shell.keybindings show-screenshot-ui   # ['Print']
gsettings get org.gnome.shell.keybindings screenshot            # ['<Shift>Print']
```

需要更强调的标注（马赛克、序号、贴图到屏幕）时再考虑第三方工具：

```bash
flatpak install flathub io.github.gutopardini.wayshot    # Wayland 原生截图标注
flatpak install flathub org.flameshot.Flameshot          # Flameshot
sudo dnf install flameshot                               # 上游 RPM
```

**Wayland 下的关键坑**：Flameshot 自带的「开机自启 + 注册全局热键」只对 X11 有效，Wayland 下静默失效。必须先在 GNOME 设置里建自定义快捷键指向 `flameshot gui`，并把 `Print` 从内置截图解绑：

```bash
gsettings set org.gnome.shell.keybindings show-screenshot-ui "[]"
```

然后在 设置 → 键盘 → 查看及自定义快捷键 → 自定义快捷键 添加命令 `flameshot gui`。

### 分数缩放

部分应用未适配分数缩放，125% 下会发虚。优先用整数比例（100%/200%）：

```bash
# 启用分数缩放支持（GNOME 46+ 一般已默认可用）
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']"
```

然后在 设置 → 显示器 → 缩放 里会出现 125%、150% 等选项。

### 配置总表

一次性执行：

```bash
# 窗口与输入
gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'
gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true

# 顶栏
gsettings set org.gnome.desktop.interface clock-show-seconds true
gsettings set org.gnome.desktop.interface clock-show-weekday true
gsettings set org.gnome.desktop.interface clock-show-date true
gsettings set org.gnome.desktop.interface show-battery-percentage true

# 外观
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
gsettings set org.gnome.desktop.interface monospace-font-name 'JetBrains Mono 11'

# 性能（虚拟机/低配机）
# gsettings set org.gnome.desktop.interface enable-animations false

# 扩展
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com || true
```

## Wayland 会话注意事项

Fedora Workstation 默认 Wayland。它在安全性和流畅度上更好，但一批 X11 时代的做法不再适用。

查看当前会话：

```bash
echo $XDG_SESSION_TYPE     # wayland 或 x11
```

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 全局快捷键不生效 | 应用无法自行注册全局热键 | 统一用 GNOME 设置的「自定义快捷键」 |
| 截图/录屏工具行为异常 | 拿不到屏幕内容，要走 `xdg-desktop-portal` | 用内置截图，或支持 portal 的工具 |
| 屏幕共享选不到窗口 | 同上 | 会议软件里选「整个屏幕」，见 [Fedora 安装腾讯会议](./Fedora安装腾讯会议) |
| 分数缩放下界面模糊 | 部分应用未适配 | 优先整数比例缩放；确需分数缩放见上一节 |
| `xdotool`/`wmctrl` 类脚本失效 | 模拟输入受限 | 换 Wayland 原生方案，或临时切 X11 会话 |

截图与屏幕共享依赖的 portal 组件 Fedora 默认已装：

```bash
rpm -qa | grep xdg-desktop-portal
# xdg-desktop-portal-1.22.1
# xdg-desktop-portal-gnome-51.0
# xdg-desktop-portal-gtk-1.15.3
```

切换会话：GDM 登录界面点用户名后，右下角齿轮里选「GNOME」或「GNOME on Xorg」。

## 相关文档

- [Flatpak 是什么与 Fedora 国内源配置](./Flatpak介绍与国内源) — Flatpak 概念、常用命令、USTC/SJTU 镜像
- [Fedora 安装腾讯会议](./Fedora安装腾讯会议) — Flatpak 装 GUI 应用与 Wayland 屏幕共享问题
- [tmux 使用指南](./tmux使用指南) — 终端会话管理
- [kitty 终端安装与配置](./kitty/) — 终端字体、配色、快捷键
