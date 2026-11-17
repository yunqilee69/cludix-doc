---
title: SELinux 是什么
date: 2026-11-14 16:00
tags: [linux, security, guide]
---

# SELinux 是什么

SELinux（Security-Enhanced Linux）是 Linux 内核里的强制访问控制（MAC）。传统的用户/组/其他权限只能回答「这个进程的属主能不能读写这个文件」；SELinux 在这之上再问一层：「这个进程的**类型**，按策略，允不允许对这个**类型**的对象做这个操作」。

一句话看当前状态：

```bash
getenforce
# Enforcing   策略生效，违规被拒绝
# Permissive  只记日志，不拦截
# Disabled    没启用
```

本文讲它解决什么问题、几个必懂概念、日常怎么看状态和日志。不写某台机器上的定制策略。

## 解决什么问题

DAC（自主访问控制，也就是 `chmod` / `chown`）有两个缺口：

- **进程一旦以某用户身份跑起来，就拥有这个用户的全部权限。** `nginx` 以 `nginx` 用户运行，只要文件属主或权限允许，它就能读家目录、写任意 `nginx` 可写路径，不区分「网站根目录」和「别的数据」。
- **被攻破后权限跟着进程走。** Web 进程被注入后，攻击者继承的是这个进程能做的所有事，DAC 挡不住「httpd 去读 `/etc/shadow`」这类越界，因为判断依据只有 UID。

SELinux 把判断从「你是谁」改成「你被允许扮演什么角色、访问哪一类对象」：

| 维度 | DAC（chmod / chown） | SELinux |
| --- | --- | --- |
| 依据 | 用户、组、其他 | 主体类型与对象类型，由策略定义 |
| 谁定规则 | 文件属主可以 `chmod` 放宽 | 策略由系统定义，普通进程改不了自己的类型 |
| 默认 | 没写禁止就允许 | 没写允许就拒绝 |
| 被攻破后 | 继承该 UID 的全部权限 | 仍被限制在该域允许的操作里 |
| 违规表现 | `Permission denied`，看权限位 | 同样是 `Permission denied`，但 `ls -l` 看起来正常，原因在审计日志 |

两者同时生效：DAC 先拦一道，SELinux 再拦一道。权限位不对时，SELinux 允许也没用。

## 和 AppArmor 的关系

| | SELinux | AppArmor |
| --- | --- | --- |
| 常见发行版 | Fedora、RHEL、CentOS、Rocky、AlmaLinux | Debian、Ubuntu、openSUSE |
| 标识对象 | 给文件、端口、进程打类型标签 | 按程序路径写配置 |
| 粒度 | 细，能区分同一程序的不同实例 | 相对粗，按可执行文件 |
| 默认策略 | targeted：只约束有策略的服务，其余走宽松域 | 按包提供 profile，可投诉或强制 |

Debian/Ubuntu 上遇到的通常是 AppArmor，不是 SELinux。下文命令以 Fedora / RHEL 系为准，包名是 `policycoreutils`。

## 几个必懂的概念

一条上下文长这样，用 `ls -Z`、`ps -Z`、`id -Z` 都能看到：

```text
system_u:object_r:httpd_sys_content_t:s0
用户:角色:类型:级别
```

日常排障几乎只看第三段 **类型**。

| 术语 | 含义 |
| --- | --- |
| 主体 / 对象 | 主体是发起访问的进程；对象是文件、目录、端口、套接字等 |
| 类型（type） | 策略里的分类标签。进程的类型习惯叫 **域（domain）**，例如 `httpd_t`；文件的类型例如 `httpd_sys_content_t` |
| 策略 | 规则集合，写明「`httpd_t` 可以读 `httpd_sys_content_t`」。targeted 是服务器默认策略 |
| 上下文 | 贴在进程和文件上的那串 `用户:角色:类型:级别` |
| Enforcing | 强制模式，违规直接拒绝并写审计日志 |
| Permissive | 宽容模式，违规放行，只记日志，用来确认是不是 SELinux 在拦 |
| Disabled | 内核未启用 SELinux。Fedora / RHEL 8 起不建议在运行中关掉，要关得改启动参数并重建标签 |
| 布尔值（boolean） | 策略里预留的开关，例如是否允许 httpd 连网，不用自己写策略 |
| AVC | Access Vector Cache，拒绝记录的名字。日志里搜 `avc: denied` |

级别 `s0` 属于 MLS/MCS（多级/多类别安全）。普通服务器用不到，Docker 的 `:Z` / `:z` 挂载会用到类别，让容器之间的卷默认互不可见。

## 它实际在拦什么

targeted 策略下，常见服务各自待在自己的域里：

- `httpd_t` 可以读标成 `httpd_sys_content_t` 的网站文件，不能读用户家目录里的 `user_home_t`。
- `sshd_t` 只接受标成 `ssh_home_t` 的 `~/.ssh`。家目录从别处拷过来、上下文没带上时，公钥权限位全对仍会登录失败。
- 网络端口也有类型。`http_port_t` 默认是 80、443、8080 等；httpd 去听 8081，策略没允许就会被拒。
- 容器运行时（Podman / 开启 SELinux 的 Docker）给容器单独的类型，bind mount 默认不放行，需要在挂载项上声明。

所以「`chmod 777` 了还是 Permission denied」时，先看是不是 SELinux，而不是继续放宽权限位。

## 查看状态

```bash
getenforce
sestatus
```

`sestatus` 会多给出策略名（一般是 `targeted`）、策略版本，以及当前是强制还是宽容。

看文件和进程的类型：

```bash
ls -Z /var/www/html
ps -eZ | grep httpd
id -Z
```

临时切换模式（重启后失效，回到配置文件里的取值）：

```bash
sudo setenforce 0    # 切到 Permissive
sudo setenforce 1    # 切回 Enforcing
```

开机默认值在 `/etc/selinux/config` 的 `SELINUX=`，可取 `enforcing` 或 `permissive`。改这个文件不会立刻生效，只影响下次启动。不要为了图省事把它改成 `disabled`：关掉后文件不再维护标签，再打开要全盘重打标签，耗时长，而且这段时间服务是没有这层限制的。

## 出错时怎么确认

现象几乎总是 `Permission denied`，同时 `ls -l` 的权限位看起来没问题。

1. 看是不是 SELinux 开着：`getenforce` 得到 `Enforcing`。
2. 看拒绝记录：

```bash
sudo ausearch -m AVC -ts recent
# 或者
sudo journalctl -t setroubleshoot --since "10 min ago"
```

一条典型记录里会有 `avc: denied { read }`、主体类型（`scontext=...:httpd_t:...`）和对象类型（`tcontext=...:user_home_t:...`）。这就是「httpd 域不允许读家目录类型」。

3. 临时验证：`sudo setenforce 0` 后再做一次操作。通了，就可以确定是策略问题，而不是权限位、属主或服务配置。**确认完立刻 `sudo setenforce 1` 切回去**，Permissive 只适合定位，不适合当修复。

Fedora / RHEL 装了 `setroubleshoot-server` 时，拒绝日志里会附一段建议，例如「执行 `restorecon`」或「打开某个布尔值」。那是提示，不是必须照做：先看它建议的动作是否符合你的目录用途。

## 三种常见处理

按「标签错了 → 策略开关没开 → 真要扩权限」的顺序，不要一上来写自定义策略。

### 1. 恢复文件标签

从别处拷来、解压出来、或者在 SELinux 关闭时创建的文件，类型往往是 `default_t` 或 `user_home_t`，不是这个目录应有的类型。策略是按目录约定类型的，用 `restorecon` 按约定刷回去：

```bash
# 先看会改什么，不真改
restorecon -Rvn /var/www/html
# 确认后再执行
sudo restorecon -Rv /var/www/html
```

`~/.ssh` 登录失败、网站根目录 403、数据目录挪位置后服务读不到文件，多数是这一类。

目录用途和默认约定不一致时（例如网站根目录不在 `/var/www/html`），用 `semanage fcontext` 把约定改掉，再 `restorecon`。这样以后重建文件、重打标签都按新约定走，而不是只改当前这一批文件：

```bash
sudo semanage fcontext -a -t httpd_sys_content_t "/srv/www(/.*)?"
sudo restorecon -Rv /srv/www
```

只对当前文件临时改类型用 `chcon`。它经不起 `restorecon` 和全盘重打标签，重启策略重建后会丢，所以只适合验证，不适合当最终配置。

### 2. 打开策略布尔值

功能被策略默认关掉时，标签是对的也会拒绝。例如允许 httpd 发起网络连接：

```bash
# 列出和 httpd 相关的开关
getsebool -a | grep httpd

# -P 写入，重启后仍生效
sudo setsebool -P httpd_can_network_connect on
```

先用 `getsebool -a` 或 `semanage boolean -l` 看有没有现成开关，有就不要写模块。

### 3. 端口不在默认类型里

```bash
# 查看 http 允许监听的端口
sudo semanage port -l | grep http_port_t

# 让 httpd 可以监听 8081
sudo semanage port -a -t http_port_t -p tcp 8081
```

### 自定义策略是最后一步

上面都对不上（主体和对象类型都合理，只是策略没写这条允许）时，才用 `audit2allow` 把拒绝记录转成策略模块。它会把日志里的拒绝原样放行，日志里夹着不相关的拒绝也会一起放进去，所以：

- 只喂刚复现出来的那几条 AVC，不要把历史日志 whole-file 丢进去；
- 生成后看一眼 `.te` 规则是不是你预期的那一次访问；
- 能用布尔值或修正标签解决的，不要留一个本地模块。

## 和容器的关系

开启 SELinux 的 Docker、以及默认启用的 Podman，容器里的进程跑在独立类型（常见 `container_t`）下，不能随便读宿主机目录。bind mount 要显式声明：

```text
# :Z  给这个卷打上仅该容器可读写的类别，多个容器不要共用同一目录
# :z  共享类别，多个容器可以一起读写
./data:/data:Z
```

属主、权限位都正确，容器里仍然 `Permission denied`，先 `getenforce` 和 `ls -Z` 看宿主机目录类型，再决定加 `:Z` 还是 `:z`。细节见 [容器挂载权限](../docker/容器挂载权限)。

## 使用建议

- 服务器保持 `Enforcing`。定位问题时短时间切 `Permissive`，确认后立刻切回。
- 先 `restorecon` 和布尔值，再考虑端口类型，最后才是本地策略模块。
- `chmod 777`、给服务加 `sudo`、把 SELinux 设成 `Disabled` 都不是修复，只是把这层限制拆掉。
- Debian/Ubuntu 默认没有这套机制；在那些系统上排查 `Permission denied` 不要套用本文命令，先看 AppArmor（`aa-status`）。

## 相关文档

- [SSH 免密登录](./SSH免密登录)：`~/.ssh` 上下文不对时的 `restorecon`
- [容器挂载权限](../docker/容器挂载权限)：SELinux 下 bind mount 的 `:Z` / `:z`
