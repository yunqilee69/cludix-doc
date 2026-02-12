# SDKMAN! 在 macOS 上的安装与 Java 多版本管理

## 什么是 SDKMAN!

SDKMAN! 是一个用于管理多个软件开发套件的并行版本的工具。它提供了一个便捷的命令行界面，可以轻松安装、切换和管理各种 SDK（Software Development Kit），包括 Java、Groovy、Scala、Kotlin 等。

## 安装 SDKMAN!

### 前置要求

- macOS 系统
- `curl` 命令行工具
- `zip` 和 `unzip` 工具
- Bash 或 Zsh shell

### 安装步骤

打开终端，运行以下命令：

```bash
curl -s "https://get.sdkman.io" | bash
```

安装完成后，按照提示执行以下命令使环境变量生效：

```bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

或者重启终端。

### 验证安装

```bash
sdk version
```

如果看到版本信息，说明安装成功。

## 安装 Java

### 查看可用的 Java 版本

```bash
sdk list java
```

这将列出所有可用的 Java 发行版和版本。

### 安装指定版本的 Java

#### 安装最新的 LTS 版本（推荐）

```bash
sdk install java
```

#### 安装特定版本

```bash
sdk install java 17.0.17-tem
sdk install java 21.0.9-tem
```

常用 Java 发行版标识：
- `tem` - Temurin（AdoptOpenJDK 的继任者）
- `amzn` - Amazon Corretto
- `librca` - Liberica JDK
- `zulu` - Azul Zulu

## 管理 Java 版本

### 查看已安装的 Java 版本

```bash
sdk list java | grep installed
```

或

```bash
sdk current java
```

### 切换 Java 版本（临时）

```bash
sdk use java 17.0.9-tem
```

此切换仅在当前终端会话有效。

### 切换 Java 版本（永久）

```bash
sdk default java 17.0.9-tem
```

此切换将设置全局默认版本。

### 在特定目录使用特定 Java 版本

在项目根目录创建 `.sdkmanrc` 文件：

```bash
echo "java=17.0.9-tem" > .sdkmanrc
```

进入该目录后运行：

```bash
sdk env
```

## 安装 Maven

### 查看可用的 Maven 版本

```bash
sdk list maven
```

这将列出所有可用的 Maven 版本。

### 安装指定版本的 Maven

#### 安装最新的 Maven 版本（推荐）

```bash
sdk install maven
```

#### 安装特定版本

```bash
sdk install maven 3.9.9
sdk install maven 3.9.8
```

### Maven 与 Java 版本兼容性

| Maven 版本 | 最低 Java 版本 | 推荐Java版本 |
|------------|---------------|-------------|
| Maven 3.9.x | Java 8 | Java 11+ |
| Maven 4.0+ | Java 17 | Java 17+ |
| Maven 3.8.x | Java 7 | Java 8+ |

> **注意**：使用 SDKMAN! 可以方便地为不同项目切换 Java 和 Maven 版本的组合。

## 管理 Maven 版本

### 查看已安装的 Maven 版本

```bash
sdk list maven | grep installed
```

或

```bash
sdk current maven
```

### 切换 Maven 版本（临时）

```bash
sdk use maven 3.9.9
```

此切换仅在当前终端会话有效。

### 切换 Maven 版本（永久）

```bash
sdk default maven 3.9.9
```

此切换将设置全局默认版本。

### 在特定目录使用特定 Maven 版本

在项目根目录创建 `.sdkmanrc` 文件：

```bash
echo "java=17.0.9-tem" > .sdkmanrc
echo "maven=3.9.9" >> .sdkmanrc
```

进入该目录后运行：

```bash
sdk env
```

## 验证 Maven 安装

```bash
mvn -version
```

输出示例：

```
Apache Maven 3.9.9
Maven home: /Users/username/.sdkman/candidates/maven/3.9.9
Java version: 17.0.9, vendor: Eclipse Adoptium
Default locale: zh_CN, platform encoding: UTF-8
OS name: "Mac OS X", version: "14.0", arch: "aarch64"
```

## Maven 配置

### 配置国内镜像源（加速依赖下载）

编辑 Maven 配置文件 `~/.m2/settings.xml`（如果不存在则创建）：

```xml
<settings>
  <mirrors>
    <!-- 阿里云镜像 -->
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <name>Aliyun Maven Mirror</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

其他可选镜像源：

| 提供商 | URL |
|--------|-----|
| 华为云 | `https://repo.huaweicloud.com/repository/maven/` |
| 腾讯云 | `https://mirrors.cloud.tencent.com/nexus/repository/maven-public/` |
| 网易云 | `https://mirrors.163.com/maven/repository/maven-public/` |

### 配置本地仓库位置

在 `settings.xml` 中添加：

```xml
<settings>
  <localRepository>/path/to/your/local/repo</localRepository>
</settings>
```

## 常用命令

### SDKMAN! 命令

```bash
# 更新 SDKMAN!
sdk update

# 更新所有已安装的 SDK
sdk upgrade

# 卸载 Maven 版本
sdk uninstall maven 3.8.8

# 设置 Maven 主目录环境变量
sdk home maven 3.9.9

# 离线模式（避免网络请求）
sdk offline enable
sdk offline disable
```

### Maven 命令

```bash
# 创建新项目
mvn archetype:generate -DgroupId=com.example -DartifactId=my-app

# 编译项目
mvn compile

# 运行测试
mvn test

# 打包项目
mvn package

# 清理构建
mvn clean

# 安装到本地仓库
mvn install

# 跳过测试打包
mvn package -DskipTests

# 查看依赖树
mvn dependency:tree

# 查看有效 POM
mvn help:effective-pom
```

### Maven 环境变量

```bash
# 设置 Maven 内存（在 ~/.mavenrc 或环境变量中）
export MAVEN_OPTS="-Xms256m -Xmx1024m"

# 设置 Maven 仓库镜像
# 通过 settings.xml 配置（推荐）
```
