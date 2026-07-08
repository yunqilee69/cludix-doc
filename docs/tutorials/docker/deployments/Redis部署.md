# Redis

本文提供 Redis 的配置示例与配置原因说明。

## 1. 目录与挂载约定

```text
/app/redis/
├─ docker-compose.yml
├─ data/
└─ users.acl
```

说明：

- `data`：Redis 持久化数据目录（RDB/AOF）
- `users.acl`：Redis ACL 用户配置文件

## 2. ACL 配置文件

`/app/redis/users.acl`：

```text
user default on >change_me ~* &* +@all
```

说明：

- `default`：Redis 默认用户名
- `on`：启用该用户
- `>change_me`：设置密码，生产环境务必修改为强密码
- `~*`：允许访问所有 key
- `&*`：允许访问所有 Pub/Sub 频道
- `+@all`：允许执行所有命令

## 3. Compose 配置示例

`/app/redis/docker-compose.yml`：

```yaml
services:
  redis:
    image: redis:7.2-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes", "--aclfile", "/etc/redis/users.acl"]
    volumes:
      - ./data:/data
      - ./users.acl:/etc/redis/users.acl:ro
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "change_me", "ping"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 30s
```

配置原因：

- 通过 ACL 文件配置用户认证，比 `--requirepass` 更灵活，后续可扩展多用户和权限控制
- ACL 文件只读挂载，避免运行时意外篡改
- `--appendonly yes` 开启 AOF，提升数据持久化可靠性
- 增加 `healthcheck`，可及时发现 Redis 无响应或启动异常

## 4. 验证连接

启动后可通过 `redis-cli` 验证密码认证是否生效：

```bash
# 无密码连接会被拒绝
docker exec -it redis redis-cli ping
# 输出: (error) NOAUTH Authentication required.

# 使用密码连接
docker exec -it redis redis-cli -a change_me ping
# 输出: PONG

# 写入测试
docker exec -it redis redis-cli -a change_me set test_key "hello"
# 输出: OK

# 读取测试
docker exec -it redis redis-cli -a change_me get test_key
# 输出: "hello"

# 查看 ACL 用户列表
docker exec -it redis redis-cli -a change_me acl list
# 输出: user default on #... ~* &* +@all
```

## 5. 常用命令

```bash
# 启动 Redis
cd /app/redis && docker compose up -d

# 关闭 Redis
cd /app/redis && docker compose down

# 查看容器日志
docker logs -f redis
```
