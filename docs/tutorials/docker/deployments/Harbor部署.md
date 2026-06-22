# Harbor

Harbor 是 CNCF 旗下的企业级镜像仓库，底层基于 Docker Distribution，并额外提供项目隔离、用户权限、镜像复制、漏洞扫描、镜像保留策略和 Web 管理界面等能力。本文将用户提到的 `haobar` 按常见镜像仓库产品 `Harbor` 理解，提供基于官方安装包和 Docker Compose 的单节点部署示例。

## 1. 适用场景

Harbor 适合以下场景：

- 需要 Web 管理界面的私有镜像仓库
- 需要按项目、用户、角色控制镜像推送和拉取权限
- 需要在内网环境统一管理业务镜像和基础镜像
- 需要镜像复制、保留策略、审计日志或漏洞扫描等企业级能力

如果只需要一个轻量私有仓库，可以使用 [Docker Registry](./DockerRegistry部署)；如果需要团队级镜像仓库平台，优先选择 Harbor。

## 2. 目录与挂载约定

```text
/app/harbor/
├─ harbor.yml
├─ install.sh
├─ prepare
├─ docker-compose.yml
├─ common/
└─ data/
```

说明：

- `harbor.yml`：Harbor 主配置文件，用于设置域名、端口、管理员密码、数据目录和组件参数
- `install.sh`/`prepare`：官方安装包自带脚本，用于生成 Compose 配置并初始化组件配置
- `docker-compose.yml`：由 Harbor 安装脚本生成，不建议手工从零编写
- `common`：安装脚本生成的组件配置目录
- `data`：Harbor 持久化数据目录，保存镜像层、数据库、Redis、任务日志等数据

## 3. 前置条件

部署前确保服务器已安装：

- Docker Engine
- Docker Compose 插件
- `openssl`、`tar` 等基础工具

建议服务器配置：

| 资源 | 测试环境 | 生产环境建议 |
| --- | --- | --- |
| CPU | 2 核 | 4 核及以上 |
| 内存 | 4 GB | 8 GB 及以上 |
| 磁盘 | 40 GB | 按镜像规模预留，建议独立数据盘 |
| 端口 | 80/443 | 443，必要时开放 80 做跳转 |

## 4. 下载 Harbor 安装包

Harbor 官方提供在线安装包和离线安装包：

- 在线安装包体积小，部署时需要从镜像仓库拉取 Harbor 组件镜像
- 离线安装包体积大，内置组件镜像，适合内网或离线环境

示例以离线安装包为例：

```bash
mkdir -p /app/harbor
cd /app/harbor

# 根据实际版本替换下载地址和文件名
wget https://github.com/goharbor/harbor/releases/download/v2.12.0/harbor-offline-installer-v2.12.0.tgz
tar -zxf harbor-offline-installer-v2.12.0.tgz --strip-components=1
```

说明：

- 版本号建议固定到明确的小版本，避免部署行为随版本漂移
- 离线环境可以先在有网络的机器下载安装包，再复制到目标服务器
- 生产环境升级前应阅读对应版本的 Release Notes 和升级说明

## 5. Harbor 配置示例

官方安装包会提供 `harbor.yml.tmpl`，先复制为 `harbor.yml`：

```bash
cd /app/harbor
cp harbor.yml.tmpl harbor.yml
```

`/app/harbor/harbor.yml` 关键配置示例：

```yaml
hostname: harbor.example.com

http:
  port: 80

https:
  port: 443
  certificate: /app/harbor/certs/harbor.example.com.crt
  private_key: /app/harbor/certs/harbor.example.com.key

harbor_admin_password: 请替换为强密码

database:
  password: 请替换为数据库强密码
  max_idle_conns: 100
  max_open_conns: 900

data_volume: /app/harbor/data

trivy:
  ignore_unfixed: false
  skip_update: false
  offline_scan: false

log:
  level: info
  local:
    rotate_count: 50
    rotate_size: 200M
    location: /var/log/harbor
```

配置原因：

- `hostname` 必须与客户端访问域名一致，建议使用域名而不是 IP
- `https` 直接在 Harbor 中启用 TLS，Docker 客户端可以使用可信 HTTPS 访问
- `harbor_admin_password` 只在首次安装初始化管理员密码时生效，安装后修改该字段不会重置密码
- `data_volume` 指向 `/app/harbor/data`，方便统一备份和扩容
- `trivy` 用于镜像漏洞扫描；离线环境可将 `skip_update`、`offline_scan` 按实际情况调整
- 日志轮转避免 Harbor 组件日志长期增长占满磁盘

:::tip
如果已经通过外部 Nginx、Traefik 或负载均衡统一做 HTTPS 终止，也可以移除 `harbor.yml` 中的 `https` 段，只保留内部 HTTP。但 Docker 客户端最终访问 Harbor 的入口仍建议是可信 HTTPS。
:::

## 6. 证书准备

生产环境建议使用受信任 CA 签发的证书。测试环境可使用自签名证书：

```bash
mkdir -p /app/harbor/certs

openssl req -x509 -nodes -newkey rsa:4096 \
  -keyout /app/harbor/certs/harbor.example.com.key \
  -out /app/harbor/certs/harbor.example.com.crt \
  -days 3650 \
  -subj "/CN=harbor.example.com" \
  -addext "subjectAltName=DNS:harbor.example.com,IP:<服务器IP>"
```

如果使用自签名证书，需要在每台 Docker 客户端主机信任该证书：

```bash
mkdir -p /etc/docker/certs.d/harbor.example.com
cp /app/harbor/certs/harbor.example.com.crt /etc/docker/certs.d/harbor.example.com/ca.crt
systemctl restart docker
```

说明：

- Docker 客户端按 `/etc/docker/certs.d/<Harbor域名>/ca.crt` 查找仓库证书
- 如果 Harbor 使用非标准端口，例如 `harbor.example.com:8443`，目录名也需要包含端口
- 生产环境不建议使用 `insecure-registries` 绕过证书校验

## 7. 安装与启动

基础安装：

```bash
cd /app/harbor
./install.sh
```

如果需要启用 Trivy 漏洞扫描：

```bash
cd /app/harbor
./install.sh --with-trivy
```

安装完成后，Harbor 会生成并启动多个 Compose 服务。常见组件包括：

| 组件 | 说明 |
| --- | --- |
| `nginx` | Harbor 入口代理 |
| `harbor-core` | 核心 API 与业务逻辑 |
| `registry` | 镜像存储服务 |
| `harbor-db` | PostgreSQL 数据库 |
| `redis` | 缓存与任务队列 |
| `harbor-jobservice` | 后台任务服务 |
| `harbor-portal` | Web 管理界面 |
| `trivy-adapter` | 漏洞扫描适配器，可选 |

## 8. 初始化与登录

浏览器访问：

```text
https://harbor.example.com
```

默认管理员账号：

```text
用户名：admin
密码：harbor.yml 中的 harbor_admin_password
```

首次登录后建议立即完成以下操作：

- 修改管理员密码或接入统一身份认证
- 创建项目，例如 `library`、`dev`、`prod`
- 为项目配置成员和角色
- 根据需要开启漏洞扫描、镜像保留策略和镜像复制规则

## 9. 推送和拉取镜像

登录 Harbor：

```bash
docker login harbor.example.com
```

推送测试镜像：

```bash
docker pull alpine:3.20
docker tag alpine:3.20 harbor.example.com/library/alpine:3.20
docker push harbor.example.com/library/alpine:3.20
```

拉取测试镜像：

```bash
docker rmi harbor.example.com/library/alpine:3.20
docker pull harbor.example.com/library/alpine:3.20
```

说明：

- Harbor 镜像地址格式为 `<Harbor域名>/<项目名>/<镜像名>:<标签>`
- 推送前必须先在 Harbor Web 页面创建对应项目，或开启自动创建项目能力
- 项目可以设置为公开或私有，私有项目拉取时需要登录认证

## 10. 常用运维命令

```bash
# 查看 Harbor 服务状态
cd /app/harbor && docker compose ps

# 启动 Harbor
cd /app/harbor && docker compose up -d

# 停止 Harbor
cd /app/harbor && docker compose down

# 重启 Harbor
cd /app/harbor && docker compose restart

# 查看入口代理日志
docker logs -f nginx

# 查看核心服务日志
docker logs -f harbor-core
```

修改 `harbor.yml` 后，需要重新生成配置并重启：

```bash
cd /app/harbor
./prepare
docker compose down
docker compose up -d
```

## 11. 备份与恢复建议

Harbor 的关键数据主要包括：

- `/app/harbor/harbor.yml`
- `/app/harbor/data`
- 证书目录，例如 `/app/harbor/certs`
- 安装包和生成的 `docker-compose.yml`、`common` 目录

备份前建议停止 Harbor，确保数据库和镜像存储处于一致状态：

```bash
cd /app/harbor && docker compose down
tar -zcf /backup/harbor-$(date +%F).tgz /app/harbor
cd /app/harbor && docker compose up -d
```

说明：

- 生产环境可结合存储快照、数据库备份和对象存储生命周期策略
- 恢复时应保持 Harbor 版本、配置文件和数据目录匹配
- 升级或迁移前必须先完成完整备份

## 12. 安全建议

- 生产环境必须使用 HTTPS，不建议长期使用 HTTP 或 `insecure-registries`
- 管理员密码、数据库密码和复制账号密码应使用强密码
- 按项目分配最小权限，不要让普通用户使用管理员账号推送镜像
- 对公网访问的 Harbor 增加防火墙、WAF、VPN 或反向代理访问控制
- 定期清理无用镜像标签，并配置镜像保留策略，避免存储无限增长
- 升级 Harbor 前先阅读官方升级文档，并完整备份数据目录

## 13. 参考资料

- [Harbor 官方文档](https://goharbor.io/docs/)
- [Harbor GitHub Releases](https://github.com/goharbor/harbor/releases)
- [Harbor 安装与配置说明](https://goharbor.io/docs/latest/install-config/)
- [Harbor 配置 HTTPS](https://goharbor.io/docs/latest/install-config/configure-https/)
