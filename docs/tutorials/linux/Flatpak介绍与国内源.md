---
title: Flatpak 是什么与 Fedora 国内源配置
date: 2026-11-11 15:15
tags: [linux, fedora, flatpak, configuration]
---

# Flatpak 是什么与 Fedora 国内源配置

Flatpak 是 Linux 上跨发行版的应用打包与运行时沙箱方案；Fedora Workstation 默认预装它，应用主要来自 Flathub 源。Flathub 官方下载站在国内速度很不稳定，把 `flathub` 远程源的 URL 换成国内镜像（USTC / SJTU）就能明显加速。

一句话版本：

```bash
# 已有 flathub 源时，直接换 URL（系统级安装需要 sudo）
sudo flatpak remote-modify flathub --url=https://mirrors.ustc.edu.cn/flathub
flatpak update --appstream
```

验证环境：Fedora 45 Workstation，Flatpak 1.18.4。

## Flatpak 是什么

Linux 长期的问题是「同一个软件，每个发行版各打一份包」：deb 给 Debian/Ubuntu，rpm 给 Fedora/openSUSE，依赖还要跟着发行版版本走。Flatpak 的做法是把这两件事拆开：

- **应用自带除运行时之外的一切**，装到 `/var/lib/flatpak`（系统级）或 `~/.local/share/flatpak`（用户级），不碰 `/usr`，不用 `dnf`，也不需要为 Fedora 42 / 43 / 44 各编一份；
- **依赖抽成「运行时」（runtime）**，例如 `org.freedesktop.Platform`、`org.gnome.Platform`、`org.kde.Platform`，多个应用共用同一份运行时，应用包里只放自己那点文件；
- **每个应用跑在沙箱里**，默认只能看到自己的文件系统视图，摄像头、麦克风、网络、Home 目录都要由打包方声明权限（或用户 `flatpak override` 手动加）；
- **底层是 OSTree 内容寻址仓库**，和 git 类似：所有文件按内容哈希存储，增量下载、原子更新、可回滚，`flatpak update` 只拉变化的文件。

### 和 rpm/dnf 的区别

| 维度 | rpm + dnf | Flatpak |
| --- | --- | --- |
| 打包者 | 发行版（Fedora 打包团队） | 上游/社区（Flathub）或厂商自己 |
| 依赖 | 共享系统库，容易版本冲突 | 共享「运行时」，与系统库完全隔离 |
| 安装位置 | `/usr`，需要 root | `/var/lib/flatpak`（root）或 `~/.local/share/flatpak`（普通用户） |
| 隔离 | 无 | 有，按权限清单放开 |
| 更新 | `dnf upgrade` 跟系统一起 | `flatpak update` 独立更新 |
| 适合 | 系统组件、驱动、命令行工具、服务 | 桌面 GUI 应用（微信、腾讯会议、Steam、JetBrains、VS Code…） |
| 不适合 | — | 需要深度集成系统的软件、命令行工具链 |

两者是共存关系，不是替代关系。Fedora 上 `dnf` 管系统，`flatpak` 管桌面应用是很常见的组合。

### 几个必懂的术语

| 术语 | 含义 |
| --- | --- |
| remote（远程源） | 软件仓库，Fedora 上默认有 `fedora` 和 `flathub` 两个 |
| app | 应用本身，如 `com.tencent.wemeet` |
| runtime | 应用依赖的运行时，如 `org.freedesktop.Platform/x86_64/25.08` |
| 应用 ID | 反向域名，如 `com.visualstudio.code`，全局唯一 |
| override | 覆盖某个应用的权限或环境变量（`flatpak override`） |
| `~/.var/app/<应用 ID>/` | 应用自己的配置、缓存、数据目录 |

应用的数据都在 `~/.var/app/` 下，卸载不会自动删，重装后登录态还在；要彻底清干净得手动 `rm -rf`。

### Fedora 上的默认状态

Fedora Workstation 开箱带这些：

```bash
flatpak --version          # Flatpak 1.18.4
flatpak remotes -d         # 默认已配好 fedora 与 flathub
```

两个默认 remote 的分工：

| remote | 地址 | 说明 |
| --- | --- | --- |
| `flathub` | `https://dl.flathub.org/repo/` | 应用最全，日常用的就是这个，由 `fedora-flathub-remote` 包 + `fedora-third-party` 工具生成 |
| `fedora` | `oci+https://registry.fedoraproject.org` | Fedora 自己打的 Flatpak（数量少），走 OCI 镜像仓库协议 |

`flathub` 这个 remote 是 Fedora 用 `fedora-third-party` 生成的，所以它带了一个「过滤清单」`/usr/share/flatpak/fedora-flathub.filter`。Fedora 45 里这个文件内容只有 `# Unfiltered`（等于不过滤），老版本 Fedora 里它是一份白名单，只让部分应用出现：

```bash
cat /usr/share/flatpak/fedora-flathub.filter
flatpak remotes -d | grep flathub    # 带 filtered 标记说明启用了过滤清单
sudo flatpak remote-modify flathub --no-filter   # 需要完整目录时去掉过滤
```

## 常用命令速查

```bash
flatpak search wemeet                       # 搜索（按名称/描述）
flatpak remote-ls flathub | head            # 列出源里全部应用
flatpak remote-info flathub com.tencent.wemeet   # 看版本、下载大小、更新日志
flatpak install flathub com.tencent.wemeet  # 安装（运行时会被一并拉下来）
flatpak install --user flathub <app>        # 只给当前用户装，不需要 root
flatpak list --columns=application,origin,size   # 已装清单
flatpak run com.tencent.wemeet              # 启动
flatpak update                              # 更新所有应用与运行时
flatpak uninstall com.tencent.wemeet        # 卸载应用
flatpak uninstall --unused                  # 清掉没人用的运行时
flatpak repair                             # 校验并修复本地仓库
flatpak override --user --show com.tencent.wemeet   # 查看权限覆盖
```

运行时很占地方（一个 `org.freedesktop.Platform` 就几百 MB），装完一堆应用后 `/var/lib/flatpak` 上到 10 GB 很常见，定期 `flatpak uninstall --unused` 能收回来。

## 为什么需要国内源

Flathub 的服务器在国外，单个运行时动辄几百 MB，国内直连经常是几百 KB/s，甚至连接被卡住、报 `Timeout while downloading`。而 Flatpak 的仓库结构和 rpm 仓库不一样，不能用「改 dnf 镜像」那套办法，要单独把 remote 的 URL 指到国内镜像。

国内可用的情况（2026-11 实测）：

| 站点 | 地址 | 性质 | 可用性 |
| --- | --- | --- | --- |
| 中科大 USTC | `https://mirrors.ustc.edu.cn/flathub` | Flathub 缓存 | ✅ 推荐 |
| 上海交大 SJTUG | `https://mirror.sjtu.edu.cn/flathub` | Flathub 智能缓存 | ✅ 可用 |
| 华为云 / 阿里云 / 清华 TUNA / 南大 | — | 目前不提供可用的 Flatpak 仓库 | ❌ 不要写进配置 |

注意华为云那个 `/flathub` 路径返回的是网页 UI，不是 OSTree 仓库，写进 `--url` 只会报错。

同一份 15 MB 的仓库对象，国内镜像与官方站在同一网络下的对比（仅示意量级，实际随地区/时段变化）：

| 源 | 实测速度 |
| --- | --- |
| `mirrors.ustc.edu.cn/flathub` | ≈ 11 MB/s |
| `mirror.sjtu.edu.cn/flathub` | ≈ 12 MB/s |
| `dl.flathub.org/repo` | ≈ 4.7 MB/s |

## 配置国内源

### 第 1 步：确认当前 remote

```bash
flatpak remotes -d
# fedora  Fedora Flatpaks  oci+https://registry.fedoraproject.org  ...  system,oci
# flathub Flathub          https://dl.flathub.org/repo/            ...  system
```

也可以用文件直接看，系统级 remotes 的定义就在这个 ostree 仓库配置里：

```bash
grep -A2 'remote "flathub"' /var/lib/flatpak/repo/config
# [remote "flathub"]
# url=https://mirrors.ustc.edu.cn/flathub
```

### 第 2 步：没有 flathub 源时先添加

Fedora Workstation 一般已经有了。如果 `flatpak remotes` 里没有 `flathub`，先按官方地址添加（镜像站不提供 `.flatpakrepo` 描述文件和 GPG 公钥，首次只能走官方，网络慢就借助代理）：

```bash
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

### 第 3 步：换 URL

系统级（应用装在 `/var/lib/flatpak`，需要 root）：

```bash
sudo flatpak remote-modify flathub --url=https://mirrors.ustc.edu.cn/flathub
```

用户级（应用装在 `~/.local/share/flatpak`）：

```bash
flatpak remote-modify --user flathub --url=https://mirrors.ustc.edu.cn/flathub
```

换 SJTU 就把 URL 换成 `https://mirror.sjtu.edu.cn/flathub`。

关键点：

- URL 只写到仓库根（`.../flathub`），不要带 `/repo`、`summary`、末尾 `/config`；
- **不加 `--user` 就是系统级**，用户级和系统级是两套独立配置，只改了系统级、却用 `flatpak install --user` 装包，走的还是官方源；
- 改动持久化在 `/var/lib/flatpak/repo/config`（或 `~/.local/share/flatpak/repo/config`），`dnf` 升级 flatpak 相关 rpm 不会把它改回去；只有重新执行 `fedora-third-party enable` 之类操作才会重写 remote 定义。

### 第 4 步：刷新元数据并验证

```bash
flatpak remote-modify flathub --url=https://mirrors.ustc.edu.cn/flathub --update-metadata
flatpak update --appstream          # 重新拉一遍应用列表（速度也变快）
flatpak install flathub <应用 ID>
```

确认下载真的走了镜像：

```bash
flatpak remotes -d | grep flathub                  # url 列应为镜像地址
OSTREE_DEBUG_HTTP=1 flatpak install flathub <应用 ID> 2>&1 | grep -E 'GET |HTTP'
# 输出里的主机名应是 mirrors.ustc.edu.cn 或 mirror.sjtu.edu.cn
```

`OSTREE_DEBUG_HTTP=1` 会打印 libcurl 的详细 HTTP 交互，排查「换了源还是慢」时非常有用。

### 回退到官方源

```bash
sudo flatpak remote-modify flathub --url=https://dl.flathub.org/repo
```

## 镜像的局限

这两个镜像都不是 Flathub 的完整镜像，理解它们的同步策略能避免误判：

| 站点 | 元数据（config / summary.idx） | 对象（objects/） |
| --- | --- | --- |
| USTC | 每小时完整同步 | 动态缓存，缓存未命中时 302 回源到 `dl.flathub.org` |
| SJTUG | 直接 301 回源 | 已缓存的对象本地直出，未命中回源 |

由此带来两个现实后果：

1. **仍然需要能连上 `dl.flathub.org`**。镜像只覆盖热门应用和常用运行时；装冷门包时第一次下载可能还是走官方线路，慢是正常的，装过一次后对象进了缓存，重装/回滚就快了。
2. **manifest 里标为 `extra-data` 的文件完全不走镜像**。这类文件（部分闭源商业软件，如 JetBrains 系列、WPS 之类）由打包脚本直接从厂商 CDN 下载，镜像和 Flathub 都不参与，速度取决于厂商。
3. **`fedora` 这个 remote 没有国内镜像**。它走 `oci+https://registry.fedoraproject.org`，国内访问一般还行；如果完全用不到 Fedora 自带的 Flatpak，可以禁用或删掉减少元数据请求：

   ```bash
   sudo flatpak remote-modify --disable fedora   # 只禁用
   sudo flatpak remote-delete fedora             # 彻底删除（注意某些 runtime 可能依赖它）
   ```

## 常见问题

### 换了源速度没变化

按顺序排查：

1. 改的和用的不是同一套安装：系统级 vs 用户级，确认 `flatpak remotes -d` 与 `flatpak install` 是否都带 `--user`；
2. 该包的对象在镜像里没缓存，302 回了官方源 —— 用 `OSTREE_DEBUG_HTTP=1` 看实际主机名；
3. 元数据还是旧的：`flatpak update --appstream`；
4. 应用属于 `extra-data` 类型，下载源根本不是 Flathub。

### `flatpak remote-modify` 报 `Remote "flathub" not found`

本机没有这个 remote（有些精简安装不给装 `fedora-flathub-remote`）。先加：

```bash
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

### 报错 `Can't find ref`、`404`、`summary` 相关

基本都是 URL 写错了。正确写法是仓库根：`https://mirrors.ustc.edu.cn/flathub`。写成 `.../flathub/repo`、`.../flathub/summary`、末尾 `/` 都有可能 404。

可以先手工验证镜像是否正常（应返回 ostree 仓库配置文本）：

```bash
curl -sI https://mirrors.ustc.edu.cn/flathub/config
curl -sI https://mirror.sjtu.edu.cn/flathub/summary.idx
```

### GPG 校验失败

`remote-modify` 只改 URL，不动 GPG 公钥，正常情况下换镜像不影响签名校验。真遇到 `GPG verification enabled, but no signatures found` 这类报错，说明本地信任的公钥缺失或不匹配，最干净的修法是删掉 remote 重新按官方描述文件添加（`.flatpakrepo` 里带着 Flathub 的 `GPGKey`），再换镜像 URL：

```bash
sudo flatpak remote-delete flathub
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
sudo flatpak remote-modify flathub --url=https://mirrors.ustc.edu.cn/flathub
sudo flatpak repair
```

实在要临时跳过校验（不推荐，等于放弃完整性保护）：`sudo flatpak remote-modify --no-gpg-verify flathub`。

### 磁盘占用越来越大

```bash
du -sh /var/lib/flatpak ~/.var/app         # 应用本体 vs 应用数据
flatpak list --columns=application,origin,size | sort -k3 -h | tail
flatpak uninstall --unused                 # 清掉无主运行时
flatpak repair
```

## 参考

- [Flatpak 官方文档](https://docs.flatpak.org/)
- [Flathub](https://flathub.org/)
- [USTC Flathub 缓存使用帮助](https://mirrors.ustc.edu.cn/help/flathub.html)
- [SJTUG Flathub 镜像说明](https://mirrors.sjtug.sjtu.edu.cn/docs/flathub)
- 相关文档：[Fedora 安装腾讯会议](./Fedora安装腾讯会议)（Flathub 实际安装案例）
