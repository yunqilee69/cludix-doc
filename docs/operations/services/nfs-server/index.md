# Debian 安装与配置 NFS Server（用于 Kubernetes 共享存储）

本文用于在独立服务器上部署 NFS Server，供 Kubernetes 集群通过 NFS CSI 提供 RWX 存储。

## 1. 规划建议

- 建议使用独立机器部署 NFS Server（避免与集群业务抢资源）
- 示例服务器 IP：`192.168.100.20`
- 示例共享目录：`/data/k8s`
- 允许访问网段：`192.168.100.0/24`

## 2. 安装 NFS 服务

```bash
sudo apt update
sudo apt install -y nfs-kernel-server
```

## 3. 准备共享目录

```bash
sudo mkdir -p /data/k8s
sudo chown -R nobody:nogroup /data/k8s
sudo chmod 0777 /data/k8s
```

> 说明：`0777` 适合快速验证。生产环境建议按业务账号与权限收敛。

## 4. 配置导出目录

编辑 `/etc/exports`：

```bash
sudo vim /etc/exports
```

添加以下内容：

```bash
/data/k8s 192.168.100.0/24(rw,sync,no_subtree_check,no_root_squash)
```

应用配置并重启服务：

```bash
sudo exportfs -rav
sudo systemctl enable nfs-server
sudo systemctl restart nfs-server
sudo systemctl status nfs-server
```

## 5. 防火墙与连通性检查

如果启用了防火墙，放行 NFS 服务：

```bash
sudo ufw allow from 192.168.100.0/24 to any port nfs
sudo ufw reload
```

查看当前导出：

```bash
showmount -e 192.168.100.20
```

## 6. 客户端挂载验证（任意 Linux 机器）

```bash
sudo apt install -y nfs-common
sudo mkdir -p /mnt/nfs-test
sudo mount -t nfs 192.168.100.20:/data/k8s /mnt/nfs-test

echo "nfs ok" | sudo tee /mnt/nfs-test/health.txt
cat /mnt/nfs-test/health.txt
```

若读写正常，说明 NFS Server 可被集群节点访问。

## 7. Kubernetes 对接参数（给 NFS CSI 使用）

后续安装 `nfs-subdir-external-provisioner` 时，需要这两个核心参数：

- `nfs.server=192.168.100.20`
- `nfs.path=/data/k8s`

## 8. 常见问题

## 8.1 `access denied by server while mounting`

- 检查 `/etc/exports` 网段是否覆盖节点 IP
- 执行 `sudo exportfs -rav`
- 检查防火墙规则

## 8.2 挂载超时或连接失败

- 检查节点与 NFS Server 网络连通性（`ping`、路由）
- 检查 `nfs-server` 服务状态
- 检查是否有安全组/ACL 阻断

## 8.3 权限问题（Pod 内无法写入）

- 临时验证可先放宽目录权限
- 生产环境建议按 UID/GID、`fsGroup`、目录 ACL 做精细控制
