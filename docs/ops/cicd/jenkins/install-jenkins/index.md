# Docker安装Jenkins

## 拉取镜像

拉取jenkins:lts-jdk21镜像，就不会在安装jdk了，容器内已经安装jdk21了


```bash
docker pull jenkins/jenkins:lts-jdk21
```

## 启动镜像

```bash
docker run -d --name jenkins \
  --restart=always \
  -p 31000:8080 \
  -v /opt/jenkins/data:/var/jenkins_home \
  jenkins/jenkins:lts-jdk21
```

:::tip 提示
jenkins容器启动时，默认用jenkins用户启动的，所以需要提前建立/opt/jenkins/data目录，并设置权限

sudo chown -R 1000:1000 /opt/jenkins/data 
:::

## 初始化jenkins

第一次访问时，需要从容器内获取初始化密码，由于已经挂载了目录，所以直接在宿主机上也可以查看

```bash
# 路径以界面为主
cat /opt/jenkins/data/secrets/initialAdminPassword
```

安装的插件直接选择社区推荐的即可，后续按照要求可以进行修改