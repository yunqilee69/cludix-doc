# Docker 部署 Jellyfin

本文介绍如何使用 Docker 部署 Jellyfin 媒体服务器。

也可以参考官网的部署步骤：[Docker 部署](https://jellyfin.org/docs/general/installation/container/)

## 环境要求

- Docker

## 目录准备

在部署前，请创建以下目录结构用于数据持久化：

```bash
mkdir -p jellyfin/{config,cache,media}
```

- `config/`：Jellyfin 配置文件
- `cache/`：缓存和临时文件
- `media/`：媒体文件目录（可包含 movies、tv、music 等子目录）

## 部署步骤

### 1. 启动容器

使用以下命令启动 Jellyfin 容器：

```bash
docker run -d \
  --name jellyfin \
  --user 1000:1000 \
  --network host \
  -v /path/to/jellyfin/config:/config \
  -v /path/to/jellyfin/cache:/cache \
  -v /path/to/jellyfin/media:/media \
  --restart unless-stopped \
  jellyfin/jellyfin:latest
```

:::tip
- 将 `/path/to/jellyfin/config`、`/path/to/jellyfin/cache` 和 `/path/to/jellyfin/media` 替换为您实际的目录路径
- 将 `--user 1000:1000` 中的 `1000:1000` 替换为您当前用户的 UID 和 GID，可以通过 `id` 命令查看
- `--network host` 使用主机网络模式，可以避免端口映射和硬件加速问题
- 如果您需要使用桥接网络模式，可以删除 `--network host` 并添加端口映射 `-p 8096:8096`
:::

### 2. 验证服务状态

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs -f jellyfin
```

### 3. 访问服务

服务启动后，访问 http://localhost:8096 进行初始化配置。

## 服务说明

### Jellyfin
免费、开源的媒体服务器软件，提供以下功能：
- 媒体库管理：自动扫描和整理电影、电视剧、音乐等媒体文件
- 元数据获取：自动从网络获取影片信息、海报、背景图等
- 多设备支持：支持 Web、桌面、移动端等多种客户端
- 字幕支持：自动识别和切换字幕文件
- 用户管理：支持多用户、权限控制和家长控制

## 常见问题

### 修改用户权限

如果遇到权限错误（如 `Access to the path '/config/log' is denied`），这是因为容器内的用户与宿主机目录的所有者不匹配。

#### 修改目录所有者为容器用户

1. **查看容器使用的用户ID**
   ```bash
   # 查看当前配置的用户ID（默认为 1000:1000）
   id
   ```

2. **修改目录所有者**
   ```bash
   # 修改目录所有者为 UID 1000:GID 1000
   sudo chown -R 1000:1000 /path/to/jellyfin
   sudo chown -R 1000:1000 /path/to/jellyfin/config
   sudo chown -R 1000:1000 /path/to/jellyfin/cache
   sudo chown -R 1000:1000 /path/to/jellyfin/media
   ```

3. **验证权限修改**
   ```bash
   # 检查目录权限
   ls -la /path/to/jellyfin/
   ```

4. **重启容器**
   ```bash
   docker restart jellyfin
   ```