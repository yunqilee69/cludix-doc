# Filebrowser

本文提供 Filebrowser 的配置示例与配置原因说明。

## 1. 目录与挂载约定

```text
/app/filebrowser/
├─ docker-compose.yml
├─ srv/
├─ database/
└─ config/
```

说明：

- `srv`：Filebrowser 管理的文件根目录
- `database`：SQLite 数据目录，用于保存账号、权限和元数据
- `config`：配置文件目录，用于固定服务行为

## 2. Compose 配置示例

`/app/filebrowser/docker-compose.yml`：

```yaml
services:
  filebrowser:
    image: filebrowser/filebrowser:v2.37.0
    container_name: filebrowser
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./srv:/srv
      - ./database:/database
      - ./config/settings.json:/.filebrowser.json:ro
```

配置原因：

- `srv` 和 `database` 分离挂载，避免权限和数据互相影响
- 配置文件使用只读挂载，防止运行时误改导致服务行为漂移

## 3. Filebrowser 配置示例

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

## 4. 常用命令

```bash
# 启动 Filebrowser
cd /app/filebrowser && docker compose up -d

# 关闭 Filebrowser
cd /app/filebrowser && docker compose down

# 查看容器日志
docker logs -f filebrowser
```



