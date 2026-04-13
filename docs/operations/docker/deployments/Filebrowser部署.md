---
slug: /operations/filebrowser-compose
title: Filebrowser Docker Compose 配置
---

# Filebrowser

本文提供 Filebrowser 的配置示例与配置原因说明，遵循本目录统一规范（单应用 compose + 复用 `app-net`）。

## 1. 目录与挂载约定

```text
/app
├─ docker-compose.filebrowser.yml
└─ filebrowser/
   ├─ srv/
   ├─ database/
   └─ config/
```

说明：

- `srv`：Filebrowser 管理的文件根目录
- `database`：SQLite 数据目录，用于保存账号、权限和元数据
- `config`：配置文件目录，用于固定服务行为

## 2. 目录权限设置

建议以非 root 用户运行 Filebrowser。容器内默认用户 UID 为 `1000`：

```bash
# 创建目录
mkdir -p /app/filebrowser/{srv,database,config}

# 设置目录所有者
sudo chown -R 1000:1000 /app/filebrowser

# 创建配置文件
touch /app/filebrowser/config/settings.json
```

:::tip
如果需要宿主机其他用户也能访问 `/app/filebrowser/srv` 目录，可适当放宽权限：`sudo chmod -R 755 /app/filebrowser/srv`。
:::

## 3. Compose 配置示例

`/app/docker-compose.filebrowser.yml`：

```yaml
services:
  filebrowser:
    image: filebrowser/filebrowser:v2.37.0
    container_name: filebrowser
    restart: unless-stopped
    user: "1000:1000"
    ports:
      - "8080:80"
    volumes:
      - /app/filebrowser/srv:/srv
      - /app/filebrowser/database:/database
      - /app/filebrowser/config/settings.json:/.filebrowser.json:ro
    networks:
      - app-net

networks:
  app-net:
    external: true
```

配置原因：

- 复用 `app-net`，便于与其他业务容器协同（如共享导入导出目录）
- `srv` 和 `database` 分离挂载，避免权限和数据互相影响
- 配置文件使用只读挂载，防止运行时误改导致服务行为漂移
- 显式指定运行用户，降低 root 运行带来的安全风险

## 4. Filebrowser 配置示例

`/app/filebrowser/config/settings.json`：

```json
{
  "port": 80,
  "baseURL": "",
  "address": "",
  "log": "stdout",
  "database": "/database/filebrowser.db",
  "root": "/srv"
}
```

配置原因：

- `database` 指向挂载目录，保证容器重建后账号和配置不丢失
- `root` 固定为 `/srv`，与宿主机目录映射保持一致
- `log` 输出到标准输出，便于统一容器日志采集

## 5. 常用命令

```bash
# 启动 Filebrowser
docker compose -f /app/docker-compose.filebrowser.yml up -d

# 关闭 Filebrowser
docker compose -f /app/docker-compose.filebrowser.yml down

# 查看容器日志
docker logs -f filebrowser
```