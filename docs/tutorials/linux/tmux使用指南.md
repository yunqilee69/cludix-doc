---
title: tmux 使用指南
date: 2026-11-12 11:20
tags: [linux, usage, guide]
---

# tmux 使用指南

tmux 是终端复用器（terminal multiplexer）：它在终端里再套一层「服务端 + 会话」，程序跑在会话里而不是直接挂在 SSH 连接或终端窗口上。所以断线不丢任务、一个窗口里能分屏、多台客户端能接到同一个会话。

本文覆盖概念、日常命令、快捷键全表、一份可直接用的 `~/.tmux.conf` 和常见坑。

验证环境：Fedora 45 Workstation，tmux 3.8，kitty 终端。

## 解决什么问题

| 场景 | 不用 tmux | 用 tmux |
| --- | --- | --- |
| SSH 跑长任务，网络断了 | 进程收到 SIGHUP，任务死掉 | 会话留在服务端，重连 `tmux a` 回到现场 |
| 笔记本合盖、切网、Wi-Fi 重连 | 同上 | 同上 |
| 一边看日志一边改配置 | 开多个终端窗口/标签 | 一个窗口分屏，或同一会话多个窗口 |
| 想让同事看你正在敲什么 | 靠截图或录屏 | `tmux a -t 会话名` 多人接同一会话 |
| 一台机器上同时跑三四个项目 | 一堆无标题终端 tab | 一个项目一个命名会话，`tmux s` 切换 |

和两个常见替代方案的区别：

- **`nohup` / `setsid`**：只能让进程不因挂断退出，看不到现场，也不能交互。
- **`screen`**：功能重叠，但分屏、状态栏、窗口命名的体验都不如 tmux；tmux 默认前缀是 `Ctrl+b`，screen 是 `Ctrl+a`。

## 安装

| 发行版 | 命令 |
| --- | --- |
| Fedora / RHEL | `sudo dnf install tmux` |
| Debian / Ubuntu | `sudo apt install tmux` |
| Arch / Manjaro | `sudo pacman -S tmux` |
| macOS | `brew install tmux` |

```bash
tmux -V
# tmux 3.8
```

建议直接用 3.7 以上（浮窗是 3.7 新增，`mouse` 默认开启、模态浮窗是 3.8 才有的）。老版本也能用，只是本文标了「3.7+」「3.8+」的章节用不了。

## 三个概念

```
client（你的终端窗口/SSH 连接，可以有多个）
  └── session（会话，一个项目/一个任务，服务端进程）
        └── window（窗口，相当于 tab，编号 0 起）
              └── pane（窗格，窗口里分割出来的矩形区域）
```

- **session 存活在 tmux 服务端**，客户端断开只是 detach，会话本身还在
- **window 是会话内的「标签页」**，一个会话可以有多个 window
- **pane 是真正跑 shell 的地方**，分屏就是在同一个 window 里切出多个 pane
- 关掉最后一个 window 或 `kill-session`，会话才消失

状态栏（默认在底部）三块：左边 `[会话名]`，中间是窗口列表 `1:bash* 2:vim-`，右边是当前窗格标题和系统时间。`*` 是当前窗口，`-` 是上一个窗口，`#` 表示窗口有活动。`prefix i` 可看当前窗格的信息（编号、pid、路径）。

## 日常命令

会这些就够日常用，不用记快捷键：

```bash
tmux                        # 新建匿名会话（名字自动编号）
tmux new -s work            # 新建并命名，推荐
tmux new -A -s work         # 有就接入、没有就新建（幂等写法，别名用得多）
tmux ls                     # 列出所有会话
tmux a                      # 接入最近一个会话
tmux a -t work              # 接入指定会话
tmux a -d -t work           # 抢占式接入：把其他客户端踢掉
tmux kill-session -t work   # 干掉指定会话
tmux kill-server            # 干掉全部会话和 tmux 服务端（慎用）
```

脚本里判断会话是否存在，用 `has-session` 的退出码（存在 0，不存在 1）：

```bash
if ! tmux has-session -t work 2>/dev/null; then
  tmux new -d -s work
fi
tmux a -t work
```

把上面的 `new -A` 做成 shell 别名，`ta work` 就是「有则接入、无则新建」：

```bash
# ~/.bashrc 或 ~/.zshrc
ta() { tmux new -A -s "${1:-main}"; }
```

**脚本化创建**（一次拉起「编辑器 + 服务日志 + shell」三窗格），比手敲快捷键稳：

```bash
tmux new -d -s dev -c ~/project/foo   # -d 后台建会话，-c 指定起始目录
tmux split-window -h -t dev           # 左右分屏
tmux send-keys -t dev 'npm run dev' Enter
tmux a -t dev
```

## 快捷键

前缀键（prefix）默认是 `Ctrl+b`：按下 `Ctrl+b` 松开，再按下面的键。忘记键位时按 `prefix ?` 看全表，`prefix /` 反查某个键绑定到了什么命令。

### 会话

| 按键 | 作用 |
| --- | --- |
| `prefix d` | detach，分离出去，会话留后台 |
| `prefix s` | 树形列出会话/窗口，回车切换 |
| `prefix $` | 重命名当前会话 |
| `prefix (` / `)` | 上一个 / 下一个会话 |
| `prefix L` | 回到上一次的客户端（多终端场景） |
| `prefix D` | 选择要断开的客户端 |
| `prefix :` | 命令行，`kill-session`、`kill-server` 等都在这敲 |

### 窗口

| 按键 | 作用 |
| --- | --- |
| `prefix c` | 新建窗口 |
| `prefix ,` | 重命名窗口（默认会跟随前台命令自动改名，见配置） |
| `prefix 0`~`9` | 跳到第 n 个窗口 |
| `prefix n` / `p` | 下一个 / 上一个窗口 |
| `prefix l` | 回到上一个窗口 |
| `prefix w` | 窗口列表（可预览内容） |
| `prefix f` | 按内容搜窗口 |
| `prefix &` | 关闭窗口（要确认） |
| `prefix .` | 移动窗口到别的编号 |

### 窗格

| 按键 | 作用 |
| --- | --- |
| `prefix %` | 左右分屏 |
| `prefix "` | 上下分屏 |
| `prefix 方向键` | 在窗格间跳 |
| `prefix o` | 循环切窗格 |
| `prefix ;` | 回到上一个窗格 |
| `prefix z` | 当前窗格全屏 / 还原（最好用的一条） |
| `prefix q` | 窗格上短暂显示编号，按数字直接跳 |
| `prefix x` | 关闭当前窗格（要确认） |
| `prefix !` | 把当前窗格拆成独立窗口 |
| `prefix 空格` | 切换预置布局 |
| `prefix {` / `}` | 与上一个 / 下一个窗格换位置 |
| `prefix M-方向键` | 调整窗格大小（步长 5） |
| `prefix C-方向键` | 调整窗格大小（步长 1，可连按） |

### 复制模式（翻历史、复制文本）

tmux 默认的复制模式是 **emacs 键位**（`mode-keys emacs`）：

| 按键 | 作用 |
| --- | --- |
| `prefix [` | 进入复制模式，方向键 / `PageUp` 翻历史 |
| `prefix PageUp` | 直接进复制模式并上翻一页 |
| `q` 或 `Esc` | 退出复制模式 |
| `C-Space` 开始选择 → 移动 → `M-w` 或 `C-w` | 选中并复制（复制完自动退出） |
| `M-v` / `C-v` | 上一页 / 下一页 |
| `M-<` / `M->` | 到历史最顶 / 最底 |
| `C-s` / `C-r` | 向下 / 向上增量搜索 |
| `prefix ]` | 粘贴 tmux 缓冲区 |
| `prefix #` | 查看缓冲区列表 |
| `prefix t` | 显示大时钟 |

改成 vi 键位（`setw -g mode-keys vi`）后：

| 按键 | 作用 |
| --- | --- |
| `空格` 开始选择 → 移动 → `回车` | 选中并复制并退出 |
| `V` | 选整行 |
| `/` / `?` | 向下 / 向上搜索，`n` 重复 |
| `g` / `G` | 到历史最顶 / 最底 |
| `C-u` / `C-d` | 半页上翻 / 下翻 |

> ⚠️ 两个坑：
> 1. **`y` 不是默认复制键**。vi 键位下 `Enter` 才是「复制并退出」，`y` 需要自己绑（见下面的配置）。
> 2. 默认的 `v` 是**矩形选择开关**（`rectangle-toggle`），不是 Vim 里的「开始选择」，容易误按。
>
> 另外，默认的复制动作只把内容放进 **tmux 缓冲区**（只有 `prefix ]` 能粘），不进系统剪贴板。要直接进系统剪贴板得用 `copy-pipe-and-cancel` 并指定剪贴板命令，见[配置文件](#配置文件)。

### 3.7+ 的浮窗

浮动窗格（floating pane）叠在分屏布局之上，像弹窗但不是模态，鼠标点一下外面的窗格就能切走：

| 按键 | 作用 |
| --- | --- |
| `prefix *` | 新建浮窗（默认半个窗口宽、四分之一高，从左上角层叠排布） |
| `prefix Tab` / `BTab` | 新建一个停在底部居中、占 75%×30% 的浮窗 |
| `prefix @` | 在浮窗和普通窗格之间互转（浮窗 → 铺进布局，普通窗格 → 浮起来） |
| `prefix g` 然后 `1`~`4` / 方向键 | 把浮窗挪到四个角 / 四条边 |
| `prefix g` 然后 `M-1`~`M-4` | 挪到角上并缩成 50%×50% |
| `prefix g` 然后 `M-方向键` | 挪到边上并占满一条边 |
| `prefix g` 然后 `0` | 铺满整个窗口 |
| `prefix z` | 浮窗同样可以放大 / 还原 |
| `prefix x` | 关闭浮窗 |

浮窗也能直接用鼠标拖拽移动、拖边框缩放；3.8 里按住 `Ctrl` 拖拽分屏边界会新建一个浮窗。`new-pane -O` 可以建**模态**浮窗（激活期间其他窗格不可操作），适合临时开个大文件编辑或菜单。

## 配置文件

默认配置文件是 `~/.tmux.conf`。改完执行 `tmux source-file ~/.tmux.conf` 生效；下面的配置里绑了 `prefix r` 做热重载。所有配置项都在 tmux 3.8 上验证过。

```bash
cat > ~/.tmux.conf <<'EOF'
# ── 基础行为 ────────────────────────────────
set -g mouse on                  # 3.8 起默认为 on，旧版本必须显式打开
set -g focus-events on           # 焦点变化通知给 vim 等内部程序
set -g escape-time 10            # 降低 vim 退出插入模式的延迟
set -g history-limit 50000       # 回滚行数，默认 2000 看日志不够
set -g base-index 1              # 窗口编号从 1 开始
setw -g pane-base-index 1        # 窗格编号从 1 开始
set -g renumber-windows on       # 关掉窗口后自动重排编号
set -g set-clipboard on          # 复制时通过 OSC 52 写入系统剪贴板

# ── 终端能力 ────────────────────────────────
set -g default-terminal "tmux-256color"
set -as terminal-features ",*:RGB"

# ── 状态栏 ──────────────────────────────────
set -g status-interval 5
set -g status-left-length 40
set -g status-left "#[fg=colour45,bold] #S #[default]| "
set -g status-right "#[fg=colour45] %m-%d %H:%M "
setw -g window-status-current-style "fg=colour45,bold"
set -g pane-border-status top
set -g pane-border-format "#{pane_index} #{pane_current_command}"

# ── 复制模式（vi 键位）─────────────────────
setw -g mode-keys vi
bind -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi V send-keys -X select-line
bind -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "wl-copy"

# ── 更顺手的分屏与切换 ─────────────────────
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
bind -n M-Left  select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up    select-pane -U
bind -n M-Down  select-pane -D

# ── 重载配置 ────────────────────────────────
bind r source-file ~/.tmux.conf \; display-message "tmux.conf 已重新加载"
EOF
```

### 关键配置项说明

| 配置项 | 默认值 | 为什么改 |
| --- | --- | --- |
| `mouse on` | 3.8 起默认 `on`，3.7 及更早默认 `off` | 打开后滚轮翻历史、点击切窗格、拖拽调大小；想用终端原生选择按住 `Shift` 拖 |
| `history-limit` | 2000 | 看服务日志两屏就满了，50000 更实际 |
| `base-index` / `pane-base-index` | 均 0 | 键盘上 `1`~`9` 更好按，比 `0` 起直观 |
| `set-clipboard` | `external` | `on` 让 tmux 复制走 OSC 52 写系统剪贴板；`external` 会忽略程序自己设的缓冲区 |
| `escape-time` | 3.5 起默认 10ms，更早版本 500ms | 旧版本 `Esc` 要等超时才传给 vim，退出插入模式明显卡顿；新版本可不设，写上是为了兼容老机器 |
| `default-terminal` | 新版默认已是 `tmux-256color` | 老系统/老版本仍需显式设置，否则 vim/less 里颜色和按键异常 |
| `terminal-features ",*:RGB"` | 无 | 声明真彩色，避免 24-bit 配色被降级成 256 色 |
| `focus-events on` | off | vim 里 `autoread`、部分 TUI 需要焦点事件才会自动重载文件 |
| `renumber-windows on` | off | 关掉中间某个窗口后编号补空，不会留 1、3、5 的洞 |

`copy-pipe-and-cancel "wl-copy"` 那一行是 Wayland 写法：

- Wayland：`wl-copy`（`wl-clipboard` 包）
- X11：把 `wl-copy` 换成 `xclip -selection clipboard -i`
- macOS：换成 `pbcopy`

只写了 `-X begin-selection` 而不配 `copy-pipe` 的话，复制只进 tmux 缓冲区，系统剪贴板拿不到。

### 两条容易踩的规则

- **`~/.tmux.conf` 只在服务端启动时读一次**。改完必须 `tmux source-file ~/.tmux.conf`（或配了 `prefix r` 后按 `prefix r`），新开窗口不会重读配置。想让另一个配置文件生效，用 `tmux -f /path/to/conf`。
- **`set` 不带 `-g` 只作用于当前窗口/会话**。写 `set mode-keys vi` 只改了当前窗口，新开的窗口还是 `emacs`；要全部生效必须 `set -g`（全局）或 `setw -g`（全局窗口级）。用 `set -g` 还是 `setw -g` 都能达到全局效果，区别只是 tmux 归类时的语义标签；`show -gv <项>` 查全局值，`show -wv <项>` 查当前窗口的本地值。

### 验证配置生效

```bash
tmux new -d -s test && tmux source-file ~/.tmux.conf
tmux show -gv base-index        # 1
tmux show -gv history-limit     # 50000
tmux show -gv mouse             # on
tmux show -gwv mode-keys        # vi
tmux list-keys -T copy-mode-vi | grep -E ' (v|V|y) '
tmux kill-session -t test
```

`tmux source-file` 遇到错误行会往 stderr 打印（`invalid option`、`bad value`、`unknown command`），返回码为 1，但**后面的行仍然会继续执行**——所以只看有没有报错不够，改完务必用 `tmux show` 抽查几项。

## 典型工作流

### 远程开发：断线不丢任务

```bash
ssh dev-server
tmux new -A -s work        # 每天第一步固定这句
# …… 干活，随时可以 Ctrl+b d 或直接关窗口
```

下次连上去，`tmux a -t work` 就是原来的现场：编辑器还开着，日志还在刷，`vim` 的 undo 历史也在。

> 注意：tmux 会话跟着**机器和用户**走，不跨机器。换机器连不上原会话，只能重新建。

### 排查线上问题：一屏看三样

```bash
tmux new -s debug
# prefix c 建第二个窗口跑 tail -f，prefix % 左右分屏看应用日志和 curl 结果
```

`prefix z` 把正在看的那个窗格临时放大，看完 `prefix z` 还原，比 `Ctrl+W` 关来关去省事。

### 保留现场给同事看

```bash
tmux new -s pair            # 自己先建
# 同事：ssh 上来后 tmux a -t pair
```

多人接同一会话时，窗口尺寸默认跟随**最近有操作的那个客户端**（`window-size latest`），所以你在自己终端里一敲键盘，其他人那边画面就会跟着变成你的尺寸。想避免这种来回跳，把它固定成 `smallest`（始终按最小的客户端）或 `largest`：

```tmux
set -g window-size smallest
```

### 退出 tmux 但保留进程

正确姿势是 **detach**（`prefix d`）而不是退出 shell。在 tmux 里 `exit` 掉最后一个 pane 会让会话终止，会话里的其他进程一并被收走。

## 常见问题

### `Ctrl+b` 被别的程序占了

fzf、emacs 习惯、某些 TUI 会抢 `Ctrl+b`。改成 `Ctrl+a`（和 screen 一致）或 `Ctrl+Space`：

```tmux
set -g prefix C-a
unbind C-b
bind C-a send-prefix      # 让内层程序也能收到 Ctrl+a，需要按两次
```

改完后 `source-file` 生效，别改到一半就重开终端。

### 套娃 tmux 快捷键失效

在 tmux 里再 ssh 到另一台机器跑 tmux，前缀会先被外层吃掉。两种解法：

- 用 `send-prefix`：外层 `prefix` 按两次（如 `Ctrl+b Ctrl+b`）把前缀透传给内层；
- 或者干脆用 `tmux -L <socket名>` 起第二套服务端，内外互不干扰。

### 滚轮没反应 / 翻不了历史

三件事按顺序查：

1. `mouse` 是否 `on`（3.7 及更早默认 `off`）；
2. 当前是不是在 vim / less 这类全屏程序里——它们的滚轮由程序自己处理，tmux 不接管；
3. 想翻 tmux 历史就 `prefix [`（或配置后在普通 shell 里直接滚）。

### 复制到系统剪贴板拿不到

`prefix [` 选中回车后只能粘在 tmux 里（`prefix ]`）——这是默认行为，因为默认用的是 `copy-selection`，只进 tmux 缓冲区。要写系统剪贴板必须 `copy-pipe-and-cancel`，并在参数里给一个剪贴板命令（见上文配置）。另外 `set-clipboard off` 时 OSC 52 完全失效。

### 状态栏不刷新 / 时间不走

`status-interval` 默认 15 秒。改成 `5` 更灵敏。如果整个状态栏卡住，通常是客户端断连没恢复，`prefix r` 刷新客户端（`refresh-client`）试试。

### vim 里颜色发暗、按键卡顿

- 颜色：`default-terminal` 不是 `tmux-256color`，或 `$TERM` 被外层改成 `screen`；补上 `terminal-features ",*:RGB"`。
- 卡顿：`escape-time` 太大（老版本默认 500ms），`Esc` 后 tmux 要等超时才把键传给 vim。

### 会话不见了

按可能性排查：

1. 换了用户或换了机器连——tmux 会话不跨用户、不跨机器；
2. 在 tmux 里 `exit` 掉了最后一个 pane——会话已终止；
3. 机器重启——tmux 不做持久化，重启后全没了；
4. 服务端被 `kill-server` 清了。

### 想开机/重登录后会话还在

tmux 本身不持久化。要让重启后恢复，得用 TPM（tmux plugin manager）+ resurrect：

```bash
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

`.tmux.conf` 末尾追加（`@plugin` 是 tpm 约定的用户选项，`run` 必须放在文件最后一行）：

```tmux
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-resurrect'    # 手动保存/恢复
set -g @plugin 'tmux-plugins/tmux-continuum'    # 自动保存，可开机恢复

run '~/.tmux/plugins/tpm/tpm'
```

然后 `tmux source-file ~/.tmux.conf`，再 `prefix I` 拉取插件。默认 `prefix Ctrl-s` 手动保存、`prefix Ctrl-r` 恢复。

注意它恢复的是「窗口布局 + 在跑的命令」，不是进程内存状态：编辑器内的未保存缓冲可能丢，数据库连接会重连。

## 相关文档

- [kitty 终端安装与配置](./kitty/)：终端本体配置，tmux 只是渲染层，两者互补
- [SSH 免密登录](./SSH免密登录)：免密登录后再用 `tmux new -A -s work`，远程工作流就齐了
