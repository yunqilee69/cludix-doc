# 服务器配置 WebHook

由于服务器配置仅为 1C2G 的小水管服务器，无法部署重量级的 CI/CD 工具（如 Jenkins）。因此在 GitHub 上寻找轻量级的 WebHook 解决方案，发现了一款长时间运行内存消耗仅几十 MB 的工具。

通过此工具，可以在本地构建项目，将构建产物推送到服务器的网盘，然后触发服务器的 WebHook 调用 Shell 脚本。脚本会拉取最新构建产物并执行部署流程，从而实现轻量化的自动化部署操作。

## 下载 Webhook

从 [Webhook 官方发布页面](https://github.com/adnanh/webhook/releases) 下载对应服务器架构的 tar.gz 包，以 amd64 架构为例：

```bash
# 下载 Webhook
wget https://github.com/adnanh/webhook/releases/download/2.8.2/webhook-linux-amd64.tar.gz

# 解压
tar -zxvf webhook-linux-amd64.tar.gz

# 移动到 /opt 目录
sudo mv webhook-linux-amd64/webhook /opt/webhook
```

## 配置 Hooks

首先创建一个测试 Hook 进行验证，后续可根据实际需求添加更多 Hooks。

```bash
# 在 /opt/webhook 目录下创建配置文件
sudo mkdir -p /opt/webhook

sudo tee /opt/webhook/hooks.json <<EOF
[
  {
    "id": "test",
    "execute-command": "/opt/webhook/scripts/test.sh",
    "command-working-directory": "/opt/webhook"
  }
]
EOF
```

:::tip
配置文件中的 `id` 和 `execute-command` 字段为必填项，其他可选字段可参考[官方文档](https://github.com/adnanh/webhook)。
:::

当此 Hook 被触发时，将执行 `/opt/webhook/scripts/test.sh` 脚本。Hook 的调用路径为：`http://ip:port/hooks/{id}`

## 配置 Systemd 服务

创建 `/etc/systemd/system/webhook.service` 文件，配置 Webhook 为系统服务：

```bash
sudo tee /etc/systemd/system/webhook.service <<EOF
[Unit]
Description=Webhook Server
After=network.target

[Service]
ExecStart=/opt/webhook/webhook -hooks /opt/webhook/hooks.json -port 9000 -verbose -logfile /opt/webhook/webhook.log
Restart=always
User=webhook
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### 创建专用用户

为了遵循最小权限原则，创建专用的 webhook 用户：

```bash
# 创建系统用户
sudo adduser -r -s /bin/false -d /var/lib/webhook -c "Webhook service" webhook

# 设置目录权限
sudo chown -R webhook:webhook /opt/webhook
```

### 启动服务

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启用开机自启
sudo systemctl enable webhook

# 启动服务
sudo systemctl start webhook
```

:::warning 注意
在 `hooks.json` 中配置的所有脚本文件都必须具有执行权限。如遇问题，可查看 `/opt/webhook/webhook.log` 日志文件排查。
:::