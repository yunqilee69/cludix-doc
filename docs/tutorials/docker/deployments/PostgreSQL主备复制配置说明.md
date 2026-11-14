---
title: PostgreSQL 主备复制配置说明
date: 2026-11-14 10:20
tags: [postgresql, docker, deployment]
---

# PostgreSQL 主备复制配置说明

本文逐项说明 PostgreSQL 18 流复制（physical streaming replication）相关配置字段的含义、默认值和配置错误后的表现。

适用前提：

- 主库、备库均为 PostgreSQL 18，且大版本一致
- 使用基于 WAL 的物理流复制，不是逻辑复制
- 两台服务器通过 TCP 5432 互通

完整的搭建步骤见博客《PostgreSQL 18 两台服务器主备搭建》，本文只做字段参考。

## 1. 复制链路概览

一次 WAL 传输经过四个环节：

```text
主库写入 WAL
  └─ walsender（由 max_wal_senders 限制数量）
       └─ 网络传输
            └─ walreceiver（备库，由 primary_conninfo 指定主库）
                 └─ 备库回放（hot_standby 决定回放期间能否查询）
```

判断复制是否正常，本质上就是确认这四个环节都没有断。

## 2. 主库参数

修改方式：优先使用 `ALTER SYSTEM SET ...`，写入 `postgresql.auto.conf`，再执行 `SELECT pg_reload_conf();` 或重启容器。

| 参数 | 默认值 | 作用 | 配置建议与错误后果 |
| --- | --- | --- | --- |
| `listen_addresses` | 编译默认为 `localhost`；官方镜像的配置为 `*` | 指定 PostgreSQL 监听的地址 | 要让备库连过来必须监听对方可达的地址；只监听 `localhost` 时备库会连接超时 |
| `wal_level` | `replica` | 决定写入 WAL 的信息量，物理复制至少需要 `replica` | 改成 `minimal` 后物理复制无法工作；需要逻辑解码时用 `logical` |
| `max_wal_senders` | `10` | 同时允许的 walsender 连接数 | 必须大于备库数量；`pg_basebackup -Xs` 会额外占用 1 个连接。设为 0 时备库无法连接 |
| `max_replication_slots` | `10` | 允许创建的复制槽数量 | 小于实际槽数量时创建槽会失败 |
| `wal_keep_size` | `0` | 无条件保留的 WAL 大小，单位 MB | `0` 表示不额外保留；没有复制槽时容易在备库短暂断开后追不上。建议 `1GB` 作为兜底 |
| `wal_sender_timeout` | `60s` | walsender 等待备库响应的超时时间 | 设得过小会误判断开；设为 `0` 表示不超时，不建议 |
| `password_encryption` | `scram-sha-256` | 设置角色密码时的加密方式 | 保持 `scram-sha-256`；18 已弃用 `md5`，设置 md5 密码会产生告警 |
| `synchronous_commit` | `on` | 事务提交时需要等待的 WAL 落盘级别 | 异步复制下保持默认即可；开启同步复制后才需要调整，见第 6 节 |
| `synchronous_standby_names` | 空 | 指定哪些备库参与同步复制 | 为空表示纯异步复制；配置错误会让主库写入被阻塞，见第 6 节 |

### 2.1 wal_level

取值：

| 值 | 是否支持物理复制 | 说明 |
| --- | --- | --- |
| `minimal` | 否 | 只记录崩溃恢复必需的信息，空间最省 |
| `replica` | 是 | 物理复制和只读备库所需，默认值 |
| `logical` | 是 | 在 `replica` 基础上增加逻辑解码信息，逻辑复制或 CDC 需要 |

修改 `wal_level` 需要重启数据库，不是 reload。

### 2.2 max_wal_senders 与 max_replication_slots

这两个参数都是 postmaster 级，修改后必须重启。经验值是：

- `max_wal_senders` ≥ 备库数量 + 2（预留 `pg_basebackup` 和人工连接）
- `max_replication_slots` ≥ 物理槽 + 逻辑槽数量

如果备库连接时报 `no more connections allowed` 或 `number of requested standby connections exceeds max_wal_senders`，优先检查这里。

### 2.3 wal_keep_size

没有使用复制槽时，主库会按 checkpoint 回收旧 WAL，备库断开时间稍长就可能因为 WAL 已被删除而无法追平。`wal_keep_size` 会强制保留指定大小的 WAL。

使用复制槽后，槽会负责保留 WAL，但槽本身也可能无限堆积。因此推荐组合是：

- 创建物理复制槽，保证备库断线后还能追上
- 设置 `max_slot_wal_keep_size` 给槽的保留量封顶，避免磁盘被写满
- 再设置一个较小的 `wal_keep_size` 作为兜底

## 3. 备库参数

备库参数大部分由 `pg_basebackup -R` 自动写入 `postgresql.auto.conf`，一般不需要手工编辑。

| 参数 | 默认值 | 作用 | 配置建议与错误后果 |
| --- | --- | --- | --- |
| `hot_standby` | `on` | 备库回放 WAL 期间是否允许只读查询 | 保持 `on`；设为 `off` 后备库无法提供读服务 |
| `primary_conninfo` | 空 | 备库连接主库的连接串 | 必填。写错主机、端口、账号或密码时，`pg_stat_wal_receiver` 会一直处于连接失败状态 |
| `primary_slot_name` | 空 | 备库使用的物理复制槽名称 | 为空时不使用槽；名字写错会报 `replication slot does not exist` |
| `recovery_target_timeline` | `latest` | 备库恢复到哪条时间线 | 保持 `latest`。主备切换后新备库要跟随新时间线，改成固定值会导致找不到 WAL |
| `hot_standby_feedback` | `off` | 备库是否把查询需要的最老事务快照反馈给主库 | 开启可以减少备库查询与主库 VACUUM 的冲突，代价是主库表膨胀加快 |
| `wal_receiver_timeout` | `60s` | walreceiver 等待主库消息的超时时间 | 一般保持默认；网络不稳定时可适当调大 |
| `wal_retrieve_retry_interval` | `5s` | 获取 WAL 失败后重试的间隔 | 默认即可；主库短暂不可用时备库会按这个间隔重试 |

### 3.1 primary_conninfo

`pg_basebackup -R` 写入的内容形如：

```ini
primary_conninfo = 'host=10.0.0.11 port=5432 user=replicator password=change_me application_name=standby1'
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `host` | 主库地址，必须是备库可达的 IP 或域名 |
| `port` | 主库端口，默认 5432 |
| `user` | 具有 `REPLICATION` 权限的角色 |
| `password` | 角色密码，明文保存在 `postgresql.auto.conf` 中 |
| `application_name` | 备库名称，同步复制和监控时用来识别备库 |
| `sslmode` | 需要 TLS 时设置，例如 `sslmode=require` |

由于密码是明文，务必保证数据目录权限为 `0700`，并且不要让普通用户读取 `postgresql.auto.conf`。

### 3.2 hot_standby_feedback 的取舍

默认关闭。开启后，备库会告诉主库“我的查询还需要这些旧版本”，主库的 VACUUM 会因此保留更多死元组。

- 备库有长查询，且不能容忍 `canceling statement due to conflict with recovery`：开启
- 备库只做容灾、不承载读流量：保持关闭

## 4. pg_hba.conf 复制条目

物理复制连接使用特殊的 `replication` 数据库关键字，和普通业务连接分开授权。

示例：

```conf
# TYPE  DATABASE       USER         ADDRESS         METHOD
host    replication    replicator   10.0.0.12/32    scram-sha-256
```

五个字段的含义：

| 字段 | 说明 |
| --- | --- |
| 连接类型 | `local` 表示 Unix socket；`host` 表示 TCP（SSL 与非 SSL 都允许）；`hostssl` 只允许 SSL；`hostnossl` 只允许非 SSL |
| database | 物理复制固定写 `replication`；`all` 不匹配复制连接，这一点容易写错 |
| user | 允许连接的角色名，多个用逗号分隔；`all` 表示所有角色 |
| address | 客户端地址，使用 CIDR 或“IP + 掩码”；`0.0.0.0/0` 表示所有 IPv4 地址 |
| method | 认证方式。推荐 `scram-sha-256`；`trust` 不校验密码，只适合受控内网调试 |

注意事项：

- 规则**从上到下匹配，第一条命中即生效**，新增规则要放在合适的位置
- 只改 `pg_hba.conf` 不需要重启，执行 `SELECT pg_reload_conf();` 即可
- 逻辑复制走普通数据库连接，不使用 `replication` 关键字，这是和物理复制的区别
- 主备切换后，新主库的 `pg_hba.conf` 是从原主库复制来的，必须补上旧主库地址的复制规则，否则旧主库接不回来

## 5. 复制槽

物理复制槽解决两个问题：备库断线后主库不删除它还没收到的 WAL；以及让主库知道备库的进度。

### 5.1 相关字段

| 字段 | 说明 |
| --- | --- |
| `slot_name` | 槽名称，备库的 `primary_slot_name` 必须与之一致 |
| `slot_type` | `physical` 或 `logical` |
| `active` | 当前是否有备库正在使用该槽 |
| `restart_lsn` | 槽还需要保留的 WAL 起点 |
| `wal_status` | `reserved`、`extended`、`unreserved`、`lost`；出现 `lost` 表示槽已失效 |
| `safe_wal_size` | 距离槽失效还剩多少 WAL 空间 |

### 5.2 max_slot_wal_keep_size

默认 `-1`，表示不限制。这个默认值很危险：备库长时间离线时，槽会把主库磁盘写满。

建议按磁盘容量设置一个上限，例如 `10GB`：

```sql
ALTER SYSTEM SET max_slot_wal_keep_size = '10GB';
SELECT pg_reload_conf();
```

超过上限后槽会失效，`wal_status` 变成 `lost`，备库必须重新做基础备份才能恢复复制。这是“宁可重建备库，也不能撑爆主库”的取舍。

## 6. 异步复制与同步复制

默认是异步复制：主库提交事务不等待备库确认，主库故障时可能丢失最后一段尚未传输的 WAL。同步复制可以保证“主库提交成功的数据，备库也收到”，代价是写入延迟增加，并且备库故障会影响主库写入。

### 6.1 synchronous_commit

| 值 | 行为 |
| --- | --- |
| `off` | 不等待本地 WAL 落盘，性能最高，故障时可能丢数据 |
| `local` | 等待本地 WAL 落盘，不等待备库 |
| `remote_write` | 等待备库把 WAL 写入操作系统缓存 |
| `on` | 等待备库把 WAL 刷到磁盘，默认值 |
| `remote_apply` | 等待备库完成回放，备库查询能立即看到已提交数据 |

### 6.2 synchronous_standby_names

为空表示不同步。常见写法：

```conf
# 等待任意 1 个名为 standby1 或 standby2 的备库确认
synchronous_standby_names = 'ANY 1 (standby1, standby2)'

# 按优先级等待第 1 个可用的备库
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
```

这里的名字匹配的是备库 `primary_conninfo` 中的 `application_name`，不是槽名，也不是主机名。

配置错误的风险：

- 名称与实际 `application_name` 不一致，主库会一直等待，所有写入被阻塞
- 只有一台备库且它离线时，同步复制会直接阻塞主库写入

因此启用同步复制前，至少准备两台备库，或者明确接受单备库故障时写入不可用。

## 7. 验证复制的常用查询

### 7.1 主库：查看备库状态

```sql
SELECT pid,
       usename,
       application_name,
       client_addr,
       state,
       sync_state,
       sent_lsn,
       write_lsn,
       flush_lsn,
       replay_lsn,
       replay_lag,
       pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replay_lag_bytes
FROM pg_stat_replication;
```

关注点：

- 有记录且 `state = streaming`：备库已正常连接
- `replay_lag` 或 `replay_lag_bytes` 持续增大：备库回放跟不上
- 查询结果为空：没有任何备库连接成功，去备库看 `pg_stat_wal_receiver` 和日志

### 7.2 备库：查看接收状态

```sql
SELECT status,
       sender_host,
       sender_port,
       slot_name,
       latest_end_lsn,
       last_msg_send_time,
       last_msg_receipt_time
FROM pg_stat_wal_receiver;

SELECT pg_is_in_recovery() AS is_standby,
       pg_last_wal_receive_lsn() AS received_lsn,
       pg_last_wal_replay_lsn() AS replayed_lsn,
       now() - pg_last_xact_replay_timestamp() AS replay_delay;
```

关注点：

- `pg_is_in_recovery()` 为 `true` 表示当前是备库
- `status = streaming` 表示 WAL 正在传输
- `last_msg_receipt_time` 长时间不更新，说明主库没有发送或网络中断

### 7.3 主库：查看复制槽

```sql
SELECT slot_name,
       slot_type,
       active,
       restart_lsn,
       wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
```

关注点：

- `active = false` 且 `restart_lsn` 持续落后：备库离线，WAL 正在堆积
- `wal_status = lost`：槽已失效，需要重建备库

## 8. 常见错误对照表

| 现象 | 优先检查 |
| --- | --- |
| 备库日志报 `no pg_hba.conf entry for replication connection` | `pg_hba.conf` 是否使用 `replication` 关键字、地址网段是否正确 |
| 备库日志报 `password authentication failed` | `primary_conninfo` 中的用户名密码、主库 `password_encryption` |
| 备库日志报 `replication slot "xxx" does not exist` | 主库是否创建了同名物理槽，`primary_slot_name` 是否拼写正确 |
| 主库 `pg_stat_replication` 为空 | 备库是否启动、网络和防火墙、`max_wal_senders` 是否大于 0 |
| 备库追不上且主库 WAL 已删除 | 是否使用复制槽，`wal_keep_size` 是否过小 |
| 主库磁盘被 WAL 写满 | `pg_replication_slots` 中是否有长期 inactive 的槽，检查 `max_slot_wal_keep_size` |
| 备库报 `requested timeline ... is not in the history` | 主备时间线已经分叉，需要 `pg_rewind` 或重新做基础备份 |
| 同步复制下主库写入卡住 | `synchronous_standby_names` 中的名字是否与备库 `application_name` 一致 |
| 备库启动报数据目录权限错误 | 数据目录属主是否为容器内的 `postgres` 用户（官方镜像通常为 UID 999，以 `id postgres` 为准） |
