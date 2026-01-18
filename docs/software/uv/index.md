# uv 在 macOS/Linux 上的安装与配置

## 什么是 uv

uv 是一个用 Rust 编写的超快速 Python 包管理器和项目管理工具，旨在替代 pip、pip-tools、virtualenv 和 pyenv。它提供了以下特点：

- **极速安装**：比 pip 快 10-100 倍
- **统一工具链**：替代多个 Python 工具
- **兼容性好**：与现有 Python 工作流兼容
- **跨平台**：支持 macOS、Linux 和 Windows

## 安装 uv

### 方法一：使用官方安装脚本（推荐）

打开终端，运行以下命令：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 方法二：使用 Homebrew（macOS）

```bash
brew install uv
```

### 方法三：使用 pip（已安装 Python）

```bash
pip install uv
```

### 方法四：使用 Conda

```bash
conda install -c conda-forge uv
```

### 配置环境变量

安装脚本会自动配置环境变量。如果需要重新加载环境变量：

```bash
source ~/.zshrc
# 或
source ~/.bashrc
```

或重启终端。

### 验证安装

```bash
uv --version
```

如果看到版本信息，说明安装成功。

## 配置镜像源

uv 支持配置镜像源以加速下载。国内用户可以使用清华大学、阿里云等镜像源。

在 `~/.config/uv/uv.toml`（如果目录不存在则创建）中添加：

#### 清华大学镜像源

```toml
[index]
url = "https://pypi.tuna.tsinghua.edu.cn/simple"
```

#### 阿里云镜像源

```toml
[index]
url = "https://mirrors.aliyun.com/pypi/simple/"
```

#### 华为云镜像源

```toml
[index]
url = "https://mirrors.huaweicloud.com/repository/pypi/simple"
```

#### 中科大镜像源

```toml
[index]
url = "https://pypi.mirrors.ustc.edu.cn/simple"
```

### 恢复官方源

删除配置文件中的 `[index]` 部分即可。

## 基本使用

### 创建虚拟环境

```bash
# 创建虚拟环境（使用当前 Python 版本）
uv venv

# 指定 Python 版本创建虚拟环境
uv venv --python 3.11

# 指定虚拟环境目录
uv venv .venv
```

### 激活虚拟环境

```bash
# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 安装包

```bash
# 安装单个包
uv pip install requests

# 安装多个包
uv pip install requests flask numpy

# 从 requirements.txt 安装
uv pip install -r requirements.txt

# 安装特定版本
uv pip install requests==2.31.0

# 安装开发依赖
uv pip install -e ".[dev]"
```

### 管理依赖

```bash
# 查看已安装的包
uv pip list

# 查看包信息
uv pip show requests

# 更新包
uv pip install --upgrade requests

# 卸载包
uv pip uninstall requests

# 导出依赖到 requirements.txt
uv pip freeze > requirements.txt
```

### 运行脚本

```bash
# 使用虚拟环境中的 Python 运行脚本
uv run python script.py

# 直接运行模块
uv run pip --version
```

## 项目管理

### 初始化项目

```bash
# 创建新项目
uv init myproject

# 在现有目录初始化
uv init
```

### 同步依赖

```bash
# 安装 pyproject.toml 中的依赖
uv sync

# 安装开发依赖
uv sync --extra dev
```

### 锁定依赖

```bash
# 生成或更新 uv.lock
uv lock
```

## 常用命令

```bash
# 查看帮助
uv --help

# 查看 pip 子命令帮助
uv pip --help

# 查看虚拟环境信息
uv venv --help

# 清理缓存
uv cache clean

# 查看 Python 版本
uv python find

# 安装 Python 版本
uv python install 3.11
```

## 环境变量配置

除了镜像源，uv 还支持其他有用的环境变量：

```bash
# 设置缓存目录
export UV_CACHE_DIR=$HOME/.cache/uv

# 设置虚拟环境目录
export UV_VENV_DIR=$HOME/.venv

# 禁用进度条
export UV_NO_PROGRESS=1

# 设置超时时间（秒）
export UV_TIMEOUT=300
```

## 与 pip 兼容

uv 提供了 pip 兼容层，可以无缝替换 pip：

```bash
# uv pip 与 pip 命令几乎完全相同
uv pip install <package>
uv pip uninstall <package>
uv pip list
```

## 故障排除

### 问题：命令未找到

确保环境变量已配置。uv 通常安装在 `~/.local/bin/uv`，检查该目录是否在 PATH 中：

```bash
echo $PATH | grep local/bin
```

如果不在 PATH 中，添加到 `~/.zshrc` 或 `~/.bashrc`：

```bash
export PATH="$HOME/.local/bin:$PATH"
source ~/.zshrc
```

### 问题：下载速度慢

配置国内镜像源（见上方"配置镜像源"部分）。

### 问题：SSL 证书错误

```bash
export UV_NO_CERT_VERIFY=1
```

### 问题：权限错误

```bash
# 使用用户安装
uv pip install --user <package>
```

### 问题：虚拟环境激活失败

确保使用正确的激活命令：

```bash
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1

# Windows CMD
.venv\Scripts\activate.bat
```

## 最佳实践

1. **使用镜像源**：国内用户配置镜像源以加速下载
2. **虚拟环境隔离**：为每个项目使用独立的虚拟环境
3. **锁定依赖**：使用 `uv.lock` 确保依赖版本一致
4. **定期更新**：定期运行 `uv pip install --upgrade <package>` 更新包
5. **清理缓存**：定期运行 `uv cache clean` 释放磁盘空间
6. **版本控制**：将 `uv.lock` 提交到版本控制

## 迁移指南

### 从 pip 迁移到 uv

```bash
# 1. 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. 创建虚拟环境
uv venv
source .venv/bin/activate

# 3. 安装现有依赖
uv pip install -r requirements.txt
```

### 从 pip-tools 迁移到 uv

uv 的 `uv pip compile` 命令可以替代 `pip-compile`：

```bash
# 原命令
pip-compile requirements.in

# 新命令
uv pip compile requirements.in
```

## 参考资源

- [uv 官方网站](https://astral.sh/uv)
- [uv GitHub](https://github.com/astral-sh/uv)
- [uv 文档](https://docs.astral.sh/uv/)
- [清华大学 PyPI 镜像源](https://mirrors.tuna.tsinghua.edu.cn/help/pypi/)
- [阿里云 PyPI 镜像源](https://developer.aliyun.com/mirror/pypi)
