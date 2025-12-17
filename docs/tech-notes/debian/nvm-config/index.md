# Debian安装nodejs环境

debian下安装nodejs环境，推荐使用nvm,可以动态切换nodejs版本

## 安装nvm

使用nvm官方的脚本进行安装，会自动添加nvm环境变量至.bashrc中

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash


# 验证安装
nvm --version
```

## 安装nodejs


nvm常用的几个命令如下
```bash
# 查看可下载的LYS版本
nvm ls-remote --lts

# 下载指定版本
nvm install version

# 设置默认版
nvm alias default v20.19.6

# 临时切换版本
nvm usc version
```