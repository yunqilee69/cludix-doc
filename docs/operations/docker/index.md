# Docker 部署规范

本目录下的容器部署文档（如 Nginx、MySQL、Redis、Nacos）统一遵循同一套 Docker Compose 模式，便于运维管理与按需启停。

## 1. 统一原则

- 每个 `docker compose` 文件只定义一个应用服务
- 所有应用都加入同一个外部网络 `app-net`
- 网络使用 `external: true`，不在 compose 内重复创建

这样可以让不同 compose 文件启动的容器之间直接通过容器名互通。

## 2. 首次部署前：手动创建共享网络

```bash
docker network create app-net
```

只需创建一次，后续所有应用复用该网络。

## 3. 服务器目录约定

以 `/app` 作为基础目录：

```text
/app
├─ docker-compose.nginx.yml
├─ docker-compose.mysql.yml
├─ docker-compose.redis.yml
├─ docker-compose.nacos.yml
├─ docker-compose.rocketmq.yml
├─ docker-compose.filebrowser.yml
├─ nginx/
├─ mysql/
├─ redis/
├─ nacos/
├─ rocketmq/
└─ filebrowser/
```

说明：

- `docker-compose.<应用名>.yml`：单应用启动文件
- `/app/<应用名>`：该应用的数据、配置、日志等持久化目录

## 4. /app 目录权限初始化

所有应用在部署前必须先完成以下初始化，后续 compose 一律按该规则配置：

```bash
# 1) 创建应用组（若已存在可忽略报错）
sudo groupadd appgroup

# 2) 设置 /app 所有者和所属组
sudo chown root:appgroup /app

# 3) 为 /app 及子目录设置统一组和 SGID
sudo chgrp -R appgroup /app
sudo chmod -R 2775 /app

# 4) 将运维用户加入 appgroup
sudo usermod -aG appgroup $USER

# 5) 获取 appgroup 的 GID（写入 compose 的 group_add）
getent group appgroup | cut -d: -f3
```

可选（推荐）：如果希望新建文件默认具有组写权限，避免受 umask 影响，可增加 ACL：

```bash
sudo setfacl -R -m g:appgroup:rwx /app
sudo setfacl -R -d -m g:appgroup:rwx /app
```

说明：

- `2775` 中的 `2` 是 SGID 位，确保后续新建内容保持 `appgroup` 归属
- `group_add` 推荐使用 GID（数字）而不是组名，兼容性更好
- 组名写法依赖容器内是否存在同名组，不同镜像行为可能不一致
- 需要重新登录会话后，用户组变更才会生效

## 5. Compose 写法

将上一步命令输出替换到 `group_add`（下方用 `<APPGROUP_GID>` 占位）。

```yaml
services:
  app-name:
    image: your-image:latest
    group_add:
      - "<APPGROUP_GID>"
    networks:
      - app-net

networks:
  app-net:
    external: true
```

说明：

- 容器写入挂载目录时可直接继承组协作能力，减少权限冲突
- 网络统一接入 `app-net`，确保跨 compose 服务可互通

## 6. 按应用启停

```bash
# 启动指定应用
docker compose -f /app/docker-compose.nginx.yml up -d

# 停止并删除指定应用容器
docker compose -f /app/docker-compose.nginx.yml down

# 查看指定应用状态
docker compose -f /app/docker-compose.nginx.yml ps
```

通过 `-f` 指定文件，可单独启停某个应用，不影响其他应用。

## 7. 目录内文档说明

- [Nginx 部署示例](./nginx-compose)
- [MySQL 部署示例](./mysql-compose)
- [Redis 部署示例](./redis-compose)
- [Nacos 部署示例](./nacos-compose)
- [RocketMQ 部署示例](./rocketmq-compose)
- [Filebrowser 部署示例](./filebrowser-compose)

后续新增其他容器文档时，均按本规范编排。
