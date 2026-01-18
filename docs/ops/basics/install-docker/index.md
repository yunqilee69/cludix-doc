# Debian系统安装Docker

本文介绍在Debian系统上，如何安装Docker,并将用户添加到docker组中

## 1.配置Docker下载源

确保目录存在

```bash
sudo mkdir -p /etc/apt/keyrings
```

下载中科大Docker GPG密钥并导入

```bash
# 下载gpg公钥，不存在gpg命令，执行sudo apt install gpg
curl -fsSL https://mirrors.ustc.edu.cn/docker-ce/linux/debian/gpg \
| sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 将docker下载源，添加到apt的镜像源中
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://mirrors.ustc.edu.cn/docker-ce/linux/debian \
$(lsb_release -cs) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

## 2. 更新apt索引并下载

```bash
sudo apt update

sudo apt install docker-ce docker-ce-cli docker-compose-plugin docker-buildx-plugin

# 安装完成查看版本，确认安装成功
sudo docekr --version
```

## 3. 用户添加至docker组

用户添加至docker组后，就不再需要使用sudo命令了。

```bash
sudo usermod -aG docker $USER

# 重新登陆
su - $USER
```

## 4. 配置docker自启动

```bash
sudo systemctl enable docker
```

## 4. 配置docker镜像源

由于dockerhub被墙，所需要需要使用代理或镜像源实现快速下载，推荐镜像源，安全稳定

```bash
# 创建目录
sudo mkdir -p /etc/docker

# 写入镜像源
sudo tee /etc/docker/daemon.json >/dev/null <<EOF
{
  "registry-mirrors": ["https://xxxx.xuanyuan.run/"]
}
EOF

# xxxx需要注册轩辕账号后，充值流量后，可以生成专属域名

# 重载并重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# 验证是否生效，正确的会末尾输出刚刚配置的镜像源
sudo docker info
```

## 5. 注册轩辕镜像账号

国内开发者在直接从海外仓库（如 Docker Hub、谷歌容器镜像仓库、Kubernetes 官方仓库）拉取 docker镜像 时，常常遇到速度缓慢、网络中断甚至超时失败的问题。这些问题不仅影响个人开发效率，更可能拖慢企业级 CI/CD 流程。为破解这一瓶颈，docker加速、docker镜像加速 与 docker下载加速 成为刚需，而选择高质量的 docker加速源 是关键。

轩辕镜像 专注于公共仓库的 docker加速 服务，致力于为国内开发者提供高效、稳定、安全的 docker镜像加速 解决方案。依托智能 CDN 全球加速网络，平台通过动态路由优化与节点负载均衡技术，让用户在国内也能享受流畅的 docker下载加速 体验。

[轩辕镜像](https://xuanyuan.cloud/?code=5EGSZC)

