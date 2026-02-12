# Debian 13 离线安装 Docker / Docker Compose（二进制）

本文介绍在 `Debian 13 (x86_64)` 环境下，如何通过二进制包离线安装 Docker Engine 与 Docker Compose（CLI 插件方式）。

Docker 运行时链路说明：

- `docker`：客户端命令行
- `dockerd`：Docker 守护进程
- `containerd`：容器生命周期与镜像分发管理
- `runc`：OCI 低层运行时

> 说明：二进制安装方式适合离线或受限网络环境，但不具备自动安全更新能力，需要手动升级。

## 1. 在线机器准备安装包

以下文件在可联网机器下载后，拷贝到离线机（例如 `/opt/pkg/docker-offline`）。

### 1.1 Docker Engine

- 版本：`29.2.1`
- 下载地址：`https://download.docker.com/linux/static/stable/x86_64/docker-29.2.1.tgz`
- 官方索引：`https://download.docker.com/linux/static/stable/x86_64/`

### 1.2 Docker Compose（推荐：CLI 插件）

- 版本：`v5.0.2`
- 二进制地址：`https://github.com/docker/compose/releases/download/v5.0.2/docker-compose-linux-x86_64`
- 校验文件：`https://github.com/docker/compose/releases/download/v5.0.2/docker-compose-linux-x86_64.sha256`
- 发布页：`https://github.com/docker/compose/releases/tag/v5.0.2`

### 1.3 传输到离线机

确保离线机目录存在并已放入安装包：

```bash
sudo mkdir -p /opt/pkg/docker-offline
ls -lh /opt/pkg/docker-offline
```

目录内至少应包含：

- `docker-29.2.1.tgz`
- `docker-compose-linux-x86_64`
- `docker-compose-linux-x86_64.sha256`

## 2. 离线机环境准备

```bash
# 解压命令通常由 tar 提供
tar --version

# 建议确认架构
uname -m
```

`uname -m` 输出应为 `x86_64`。

## 2.1 containerd 运行时说明（重点）

是的，当前 Docker Engine 体系就是基于 `containerd`。

- 从 Docker Engine `29.0+` 开始，新安装默认使用 containerd image store。
- 本文方案使用 `dockerd` 拉起并管理其内部 containerd
- 如需对接“系统级独立 containerd”，再通过 `--containerd=/run/containerd/containerd.sock` 指向外部 socket。

版本建议（本文固定）：

- Docker Engine：`29.2.1`
- Docker Compose（CLI 插件）：`v5.0.2`
- BuildKit：`v0.27.1`（Docker Engine 29.2.1 发布说明）

`containerd/runc` 的精确版本建议以安装后实机输出为准（不同发行包会随 Engine 小版本变化）。

## 3. 安装 Docker Engine（二进制）

```bash
cd /opt/pkg/docker-offline

# 解压
tar -xzf docker-29.2.1.tgz

# 拷贝二进制到系统路径
sudo cp docker/* /usr/local/bin/

# 验证版本
/usr/local/bin/docker --version
/usr/local/bin/dockerd --version
```

## 4. 配置 systemd 服务

二进制安装不会自动生成 `docker.service`，需手动创建。

```bash
sudo tee /etc/systemd/system/docker.service >/dev/null <<'EOF'
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutStartSec=0
Restart=always
RestartSec=2

# 与官方包行为保持一致的限制
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

# 避免 systemd 与 cgroup 竞争
Delegate=yes
KillMode=process

[Install]
WantedBy=multi-user.target
EOF
```

> 如果你已经部署了独立 `containerd.service`，可改为：
> `ExecStart=/usr/local/bin/dockerd --containerd=/run/containerd/containerd.sock`

## 5. 安装 Docker Compose（CLI 插件方式）

```bash
cd /opt/pkg/docker-offline

# 校验 compose 二进制
sha256sum -c docker-compose-linux-x86_64.sha256

# 安装到全局 CLI 插件目录
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo cp docker-compose-linux-x86_64 /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

## 6. 启动并设置开机自启

```bash
sudo systemctl daemon-reload
sudo systemctl enable docker
sudo systemctl start docker

# 查看服务状态
sudo systemctl status docker --no-pager
```

## 7. 验证安装

```bash
docker version
docker info
docker compose version

# 查看运行时组件版本（containerd / runc）
docker info | grep -E "containerd|runc"
```

如需当前用户免 `sudo` 使用 Docker：

```bash
sudo usermod -aG docker $USER
su - $USER
```

## 8. 参考链接

- Docker 二进制安装说明：`https://docs.docker.com/engine/install/binaries/`
- Docker Compose 插件安装说明：`https://docs.docker.com/compose/install/linux/`
- Docker Compose Standalone（仅兼容场景）：`https://docs.docker.com/compose/install/standalone/`
