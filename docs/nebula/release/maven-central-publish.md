---
title: 发布到 Maven Central 完整流程
tags: [java, spring-boot, ci-cd, deployment]
date: 2026-08-19 13:30
---

# 发布到 Maven Central 完整流程

Nebula 以 `cn.cloudomni:nebula-app-starter` 等坐标发布到 Maven Central，用户在自己的 Spring Boot 工程里引一个依赖即可获得完整中台后端。本文覆盖从命名空间申请到发布验证的完整链路，一次性配置完成后，日常发版只需执行"执行发布"一节。

> 2024 年起 Sonatype 已将 OSSRH（oss.sonatype.org）退役，新项目统一走 **Central Portal**（central.sonatype.com）。本文全部基于 Central Portal 流程，网上大量 OSSRH + Nexus Staging 的旧教程已不适用。

## 0. 总览

| 步骤 | 一次性/每次 | 状态 |
|---|---|---|
| 1. Central Portal 注册账号 | 一次性 | ✅ 已完成 |
| 2. 申请并验证命名空间 `cn.cloudomni` | 一次性 | ✅ 已完成 |
| 3. 生成 GPG 签名密钥并上传公钥 | 一次性 | ⬜ 待操作 |
| 4. 生成 Portal 令牌并配置 settings.xml | 一次性 | ⬜ 待操作 |
| 5. 项目侧 release profile 与 pom 元数据 | 一次性 | ✅ 已就位（主仓 `pom.xml`） |
| 6. 执行发布 | 每次发版 | ⬜ 待操作 |
| 7. 发布验证 | 每次发版 | ⬜ 待操作 |

## 1. Central Portal 账号与命名空间（已完成，备查）

1. 注册：https://central.sonatype.com → Sign up（账号即发布身份，注意保存）。
2. 命名空间：登录后 **Namespaces → Add Namespace**，填 `cn.cloudomni`。
3. 验证：Sonatype 要求证明你拥有反向域名对应的域名（cloudomni.cn）。Portal 会给出一条 DNS TXT 记录，形如：

   ```
   central-verification=xxxxxxxxxxxxxxxxxxxx
   ```

   到 cloudomni.cn 的 DNS 解析中添加该 TXT 记录（主机记录 `@`），回到 Portal 点 **Verify**。DNS 生效通常几分钟到几小时。

4. 状态变为 **Verified** 后，`cn.cloudomni.*` 下的所有 groupId 才允许发布。

命名空间的常见取值：自有域名反写（`cn.cloudomni`，本文所用）、GitHub 账号（`io.github.yunqilee69`，无需 DNS 验证但与域名无关）。**命名空间一旦发布过构件便不可更改归属**，当初选择自有域名是正确决策。

## 2. GPG 签名密钥（待操作）

Central 要求所有构件附带 GPG 分离签名（`.asc` 文件），并用公钥可验签——公钥必须上传到公开 keyserver。

### 2.1 安装 GPG（macOS）

```bash
brew install gnupg pinentry-mac
```

### 2.2 生成密钥

```bash
gpg --full-generate-key
```

交互选择：

| 提示 | 选择 |
|---|---|
| 密钥类型 | `RSA and RSA`（默认，选项 1） |
| 密钥长度 | `4096` |
| 有效期 | `0`（永不过期；过期密钥会导致多年后无法再签名发版） |
| Real name | `yunqi`（或你想公开的身份名） |
| Email | `yunqi@cloudomni.cn`（与 pom 中 developers 一致为宜） |
| Passphrase | **设置强口令并记牢**——每次发版都要输入，忘了等于密钥作废 |

### 2.3 查看密钥 ID

```bash
gpg --list-secret-keys --keyid-format long
```

输出形如：

```
sec   rsa4096/3ABCDEF123456789 2026-08-19 [SC]
```

`sec` 行 `/` 后面的 `3ABCDEF123456789` 就是**密钥 ID**（后续 `-Dgpg.keyname` 用它，或直接用密钥邮箱）。

### 2.4 上传公钥到 keyserver（关键步骤）

```bash
gpg --keyserver keyserver.ubuntu.com --send-keys <密钥ID>
```

Central 校验签名时从 **keyserver.ubuntu.com** 拉取公钥，所以必须传这里（可再传一份到 `keys.openpgp.org` 做冗余）。上传后验证是否可查：

```bash
gpg --keyserver keyserver.ubuntu.com --recv-keys <密钥ID>
```

> keyserver 传播有延迟（分钟级到小时级）。发布时若报 "signature could not be verified"，多半是公钥尚未传播，等一段时间重试即可。

### 2.5 本地自测签名（可选但建议）

```bash
echo test > /tmp/gpg-test.txt
gpg --detach-sign --armor /tmp/gpg-test.txt   # 生成 /tmp/gpg-test.txt.asc 即成功
```

### 2.6 备份私钥（强烈建议）

私钥丢失 = 该身份永远无法再给新构件签名。导出后离线保存（密码管理器/加密盘）：

```bash
gpg --armor --export-secret-keys <密钥ID> > private-key-backup.asc
gpg --armor --export <密钥ID> > public-key-backup.asc
```

## 3. Portal 令牌与 settings.xml（待操作）

发布认证不用登录密码，而是专用令牌：

1. Portal 右上角头像 → **View Account**。
2. **Generate User Token**，弹出的 XML 直接就是 settings.xml 需要的内容，形如：

   ```xml
   <server>
     <id>central</id>
     <username>xxxxxxxx</username>   <!-- 一串随机用户名，不是登录邮箱 -->
     <password>xxxxxxxx</password>   <!-- 一串随机口令 -->
   </server>
   ```

3. 写入 `~/.m2/settings.xml`（文件不存在则新建）。**`<id>central</id>` 必须与主仓 pom 中 central-publishing-maven-plugin 的 `publishingServerId` 完全一致**：

   ```xml
   <settings>
     <servers>
       <server>
         <id>central</id>
         <username>令牌用户名</username>
         <password>令牌口令</password>
       </server>
     </servers>
   </settings>
   ```

## 4. 项目侧配置（已就位，了解即可）

主仓根 `pom.xml` 已包含全部发布配置，无需再改：

- **`release` profile**：
  - `maven-source-plugin` / `maven-javadoc-plugin`：Central 强制要求源码包与文档包（doclint 已关闭，避免注释不规范阻断发布）；
  - `maven-gpg-plugin`：对每个构件生成 `.asc` 签名，keyname 通过 `-Dgpg.keyname` 传入；
  - `central-publishing-maven-plugin`：直接上传 Central Portal（新流程不需要老教程里的 `distributionManagement` + Nexus release 插件），`autoPublish=true` 上传通过校验后自动发布。
- **pom 元数据**：Central 校验强制要求 `name/description/url/licenses/developers/scm`，根 pom 已补齐，子模块自动继承。
- **版本**：统一由 `<revision>` 属性管理（当前 `1.0.0`）。**Central 不接受 SNAPSHOT**，发版前确认是正式版本号；发下一版时改 `revision` 即可。

## 5. 执行发布

```bash
cd /path/to/nebula
mvn -P release deploy -Dgpg.keyname=<密钥ID或密钥邮箱>
```

过程说明：

1. 会先输 passphrase（pinentry 弹窗或终端提示）；
2. 全模块构建 + 打 source/javadoc 包 + GPG 签名 + 上传，40+ 模块预计 10~20 分钟；
3. `autoPublish=true`：Portal 校验（签名可验、pom 规范、校验和一致）通过后**自动转为 Published**，无需手动点发布；校验失败会在 Portal 的 **Publishing** 页列出每个构件的错误明细。

发下一版的三步：改根 pom `<revision>` → 提交打 tag（`v1.0.1`，会联动同步 nebula-template 模板仓）→ 重新执行发布命令。

## 6. 发布验证

三处确认（Portal 显示 Published 后约 30 分钟内可同步到仓库）：

```bash
# 1. 仓库目录直查
open https://repo1.maven.org/maven2/cn/cloudomni/nebula-app-starter/

# 2. Portal 搜索
open https://central.sonatype.com/search?q=cn.cloudomni

# 3. 消费端真实拉取（最硬的验证，backend/ 模板工程就是首个消费者）
cd backend && mvn dependency:resolve
```

backend/ 模板工程的 `pom.xml` 引用 `${nebula.version}`，发布成功后它即可在任意机器上独立构建——这就是最终验收标准。

## 7. 常见问题排查

| 症状 | 原因与处理 |
|---|---|
| `signature could not be verified` / key not found | 公钥未传播到 keyserver.ubuntu.com。`gpg --keyserver keyserver.ubuntu.com --recv-keys <ID>` 自查，未查到就重传并等待。 |
| `Failed to authenticate` / 401 | settings.xml 未配置、`<id>` 与 `publishingServerId` 不一致、或用了登录密码而非 User Token。 |
| `validation failed`，提示缺 license/developers/scm | 该模块 pom 未继承到根 pom 元数据（独立于主仓 reactor 的工程不会继承）。backend/ 模板工程发布自己的坐标时需自带这套元数据。 |
| macOS 上 gpg 签名卡住无反应 | pinentry 配置问题。`brew install pinentry-mac`，并在 `~/.gnupg/gpg-agent.conf` 写入 `pinentry-program /opt/homebrew/bin/pinentry-mac`，然后 `gpgconf --kill gpg-agent`。 |
| javadoc 生成失败 | release profile 已设 `doclint=none`；若仍失败多为非法 HTML 字符（如裸 `<` `>`），修注释或确认走的 release profile。 |
| 发布了但 repo1 搜不到 | Portal Published → repo1 同步最长 30 分钟，先在 Portal 搜到即算成功。 |
| 误发布/需要下架 | Portal → Publishing → 对应版本 → Drop（发布前可撤）；已 Published 的无法删除，只能发新版本覆盖（语义化版本前进）。 |

## 8. 安全清单

- GPG **私钥**与 passphrase 分开离线存放；
- Central Portal 令牌只存 `~/.m2/settings.xml`，不进任何 git 仓库（该文件永远只在本地）；
- 泄露应对：Portal 重新 Generate User Token（旧令牌立即失效）；GPG 密钥泄露则吊销并换新（所以 2.6 的备份要加密保存）。
