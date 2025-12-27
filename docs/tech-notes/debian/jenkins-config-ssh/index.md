# Jenkins 生成目标机用户密钥与免密配置
本文演示如何在 Jenkins 容器里一次性生成 Ed25519 密钥对，把公钥写入目标机普通用户（如 deploy）的 ~/.ssh/authorized_keys，并在目标机 sudoers 中给该用户开白名单，实现 Pipeline 全程无交互登录与提权。
## 1. 在 Jenkins 容器内生成密钥
```bash
# 第二个jenkins是容器名称
docker exec -u jenkins jenkins \
  ssh-keygen -t ed25519 -f /var/jenkins_home/.ssh/id_deploy -N ""
```

:::tip 提示
容器重启后 /var/jenkins_home 已挂载到宿主机，私钥不会丢失

本文挂载的目录为 -v /opt/jenkins/data:/var/jenkins_home 后续注意修改
:::

## 2. 公钥分发到目标机
在 Jenkins 容器宿主机执行
```bash
# 注意挂载的目录
cat /opt/jenkins/data/.ssh/id_deploy.pub | \
  ssh deploy@10.0.0.20 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

目标机侧需要确保，拥有home目录，即 cd ~ 是可以正常跳转的

## 3. 目标机 sudo 免密配置

在目标机中使用 `sudo visudo` 命令，进行编辑，在文件末尾添加下面的内容
```bash
deploy ALL=(ALL) NOPASSWD: ALL
```

:::warning 注意
若希望所有命令都免密，把命令部分写成 ALL：

deploy ALL=(ALL) NOPASSWD:ALL

若只想让特定命令免密，可枚举路径，例如：

deploy ALL=(ALL) NOPASSWD:/bin/systemctl,/usr/bin/docker
:::

## 4. Jenkins 凭据录入

Manage Jenkins → Credentials → Global → Add

Kind: SSH Username with private key

ID: deploy-ssh-key

Username: deploy

Private Key: 粘贴 /var/jenkins_home/.ssh/id_deploy 全文

## 5. Pipeline 示例

```groovy
pipeline {
    agent any

    stages {
        stage('test') {
            steps {
                sshagent(['deploy-ssh-key']) {
                    sh """ssh -o StrictHostKeyChecking=no deploy@10.0.0.20 \
                            'echo 123 | sudo tee ~/test.txt > /dev/null'"""
                }
            }
        }
    }
}
```
至此，容器内生成的私钥仅保存在 Jenkins 凭据库，目标机通过白名单完成免密登录与免密 sudo，流水线全程无需人工干预。