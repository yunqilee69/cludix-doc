---
title: macOS 配置 Android 最小开发环境
date: 2026-07-21 15:30
tags: [macos, android, installation, configuration]
---

# macOS 配置 Android 最小开发环境

本文只安装 Android 真机开发与 APK 构建需要的最小组件，预计占用约 1.5–2 GB 磁盘空间。

本文**不安装** Android Studio 或 Android Emulator：它们属于可选工具，不影响命令行构建和真机调试。后续如需在 VS Code 中管理模拟器，可通过 Caspian Devices 扩展接入本机 Android SDK。APK 签名、发包与发布流程会在独立文档中说明。

## 必要组件

| 组件 | 用途 | 是否必须 |
| --- | --- | --- |
| JDK | 编译 Java/Kotlin 代码 | 是，推荐 JDK 17 或 21 |
| Android SDK Command-line Tools | 提供 `sdkmanager`，用于管理 SDK 组件 | 是 |
| Android SDK Platform-Tools | 提供 `adb`，用于连接和调试真机 | 是 |
| Android SDK Build-Tools | 提供 APK 构建与打包工具 | 是 |
| Android SDK Platform | 提供特定 Android API 的编译库 | 是 |

> 不下载 Emulator 的 system image，即可避免安装模拟器相关组件。

## 1. 准备 JDK

Android 构建需要 JDK。推荐使用 JDK 17 或 JDK 21。

如果尚未安装 JDK，请先阅读 [SDKMAN! 在 macOS 上的安装与 Java 多版本管理](./sdkman-java)。

安装完成后，验证 Java 编译器可用：

```bash
java -version
javac -version
```

## 2. 安装 Android SDK Command-line Tools

Command-line Tools 建议手动下载并放入 Android SDK 目录。这样目录结构保持为官方工具和 VS Code 扩展更容易识别的形式：

```text
sdk/cmdline-tools/latest/bin/sdkmanager
```

打开 [Android Developers 下载页](https://developer.android.com/studio#command-tools)，在 **Command line tools only** 区域下载与 Mac 架构对应的压缩包：

- Apple 芯片（M 系列）：选择 `Mac (ARM)`
- Intel 芯片：选择 `Mac (Intel)`

默认将 SDK 安装到 `~/Library/Android/sdk`。将压缩包下载到 `~/Downloads` 后，在终端执行：

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"

mkdir -p "$ANDROID_HOME/cmdline-tools"
unzip ~/Downloads/commandlinetools-mac_*.zip \
  -d "$ANDROID_HOME/cmdline-tools"
mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" \
  "$ANDROID_HOME/cmdline-tools/latest"
```

官方压缩包解压后目录名通常是 `cmdline-tools`，里面直接包含 `bin`、`lib`、`NOTICE.txt` 和 `source.properties`，不会自动生成 `latest` 这一层。因此需要手动改成 `$ANDROID_HOME/cmdline-tools/latest/`，让 `sdkmanager` 位于 `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager`。

### 将 SDK 存储到外置硬盘（可选）

`ANDROID_HOME` 是 Android SDK 组件的根目录。通过 `sdkmanager` 下载的 `adb`、Build-Tools、SDK Platform 和许可证记录都会存放在该目录中；Android 项目代码和构建产物不会存放在这里。

Command-line Tools 位于 `$ANDROID_HOME/cmdline-tools/latest/`，其余 SDK 组件也会下载到同一个 SDK 根目录。只要 `ANDROID_HOME` 指向外置硬盘路径，就可以把 Android SDK 放到外置硬盘。

如果内置磁盘空间不足，可以将 SDK 放到外置硬盘。假设外置硬盘在 Finder 中的名称为 `DevDisk`，先确认它已挂载：

```bash
ls /Volumes/DevDisk
```

将 `ANDROID_HOME` 设为外置硬盘路径，再继续执行手动解压或后续的 SDK 组件安装命令：

```bash
export ANDROID_HOME="/Volumes/DevDisk/Android/sdk"
```

建议使用 APFS 格式的外置 SSD。Android SDK 包含可执行文件，其他跨平台文件系统可能出现权限、文件名大小写或执行兼容性问题。

使用外置硬盘时请注意：

- 每次执行 `sdkmanager`、`adb` 或构建项目之前，硬盘都必须已挂载。
- 不要在下载 SDK 或构建过程中拔出硬盘。
- `/Volumes/DevDisk` 中的 `DevDisk` 是硬盘卷名；如果改名，需要同步修改 `~/.zshrc` 中的路径。
- 低速 U 盘或机械硬盘会拖慢 SDK 解压和项目构建，建议使用 USB 3.x 或更高规格的 SSD。

手动安装完成后，`sdkmanager` 的路径应为：

```text
$HOME/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager
```

> 如果下载目录中存在多个 Command-line Tools 压缩包，请将命令中的通配符替换为实际文件名。

## 3. 配置环境变量

macOS 默认使用 Zsh。将以下内容追加到 `~/.zshrc`：

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

如果 SDK 位于外置硬盘，将第一行替换为实际卷名对应的路径：

```bash
export ANDROID_HOME="/Volumes/DevDisk/Android/sdk"
```

如果希望外置硬盘未连接时终端仍可正常启动，可使用下面的配置替换上面的两行。硬盘未挂载时，`adb` 和构建命令不可用；连接并挂载后，重新打开终端或执行 `source ~/.zshrc` 即可：

```bash
if [ -d "/Volumes/DevDisk" ]; then
  export ANDROID_HOME="/Volumes/DevDisk/Android/sdk"
  export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
fi
```

重新加载配置并验证 `sdkmanager`：

```bash
source ~/.zshrc
sdkmanager --version
```

因为本文将 Command-line Tools 放在 `$ANDROID_HOME/cmdline-tools/latest/`，`sdkmanager` 可以从自身位置识别 SDK 根目录。下面的命令默认省略 `--sdk_root="$ANDROID_HOME"`；如果本机存在多个 Android SDK，或 `which sdkmanager` 指向了其他位置，再临时补充该参数。

> `ANDROID_HOME` 是 Android 工具常用的 SDK 路径变量。`ANDROID_SDK_ROOT` 已被官方标记为弃用，不建议在新的配置中添加。

## 4. 安装必要的 SDK 组件

先接受 Android SDK 许可证：

```bash
sdkmanager --licenses
```

随后安装 Platform-Tools、Build-Tools 和 SDK Platform：

```bash
sdkmanager \
  "platform-tools" \
  "build-tools;36.0.0" \
  "platforms;android-36"
```

上面的 Android 36 和 Build-Tools 36.0.0 是示例。应以项目的 `compileSdk` 和构建配置为准：

- 项目使用 `compileSdk = 36`：安装 `platforms;android-36`
- 项目使用 API 34：改为安装 `platforms;android-34`
- 项目指定其他 Build-Tools 版本：使用对应的 `build-tools;<版本号>`

通常无需根据手机当前的 Android 版本选择 SDK Platform；编译时关键是与项目的 `compileSdk` 保持一致。

可用版本和已安装组件可通过下面的命令查看：

```bash
sdkmanager --list
```

## 5. 可选：下载模拟器并安装 VS Code 管理扩展

如果后续需要在 VS Code 中直接管理模拟器，需要额外下载 Android Emulator 和 system image。先查看可用的模拟器镜像：

```bash
sdkmanager --list | grep "system-images;android"
```

Apple 芯片（M 系列）建议下载 `arm64-v8a` 镜像，例如 Android 36：

```bash
sdkmanager \
  "emulator" \
  "system-images;android-36;google_apis;arm64-v8a"
```

Intel 芯片使用 `x86_64` 镜像：

```bash
sdkmanager \
  "emulator" \
  "system-images;android-36;google_apis;x86_64"
```

如果下载较慢，可以给 `sdkmanager` 临时指定代理。下面以本机 HTTP 代理 `127.0.0.1:7890` 为例：

```bash
sdkmanager \
  --proxy=http \
  --proxy_host=127.0.0.1 \
  --proxy_port=7890 \
  "emulator" \
  "system-images;android-36;google_apis;arm64-v8a"
```

如果本机代理是 SOCKS 代理，将 `--proxy=http` 改成 `--proxy=socks`，并按实际代理端口调整 `--proxy_port`。

下载完成后，可以创建一个 AVD，后续 VS Code 扩展会读取这个模拟器配置：

```bash
avdmanager create avd \
  -n Pixel_8_API_36 \
  -k "system-images;android-36;google_apis;arm64-v8a" \
  -d pixel_8
```

Intel 芯片创建 AVD 时，将 `-k` 后面的镜像名称改成 `system-images;android-36;google_apis;x86_64`。如需命令行验证，可执行：

```bash
emulator -list-avds
emulator -avd Pixel_8_API_36
```

### 安装 VS Code 模拟器管理扩展

如果后续希望在 VS Code 中直接查看和管理 Android 模拟器，可以安装 **Caspian Devices** 扩展。

安装完成后，在扩展设置中配置 Android SDK 目录，直接填写 SDK 根目录即可，例如：

```text
/Users/<用户名>/Library/Android/sdk
```

如果 SDK 放在外置硬盘，则填写对应的 SDK 根目录：

```text
/Volumes/DevDisk/Android/sdk
```

不要填写 `cmdline-tools/latest`、`platform-tools` 或 `emulator` 子目录；扩展需要的是完整 Android SDK 根目录。前面手动补齐的 `cmdline-tools/latest` 目录，是为了让扩展和命令行工具都能按标准结构找到 `sdkmanager`。

本小节只配置 VS Code 侧的管理入口；真正创建或启动模拟器前，需要先按上面的命令安装 Android Emulator 和对应的 system image。

## 6. 连接 Android 真机并验证

在 Android 手机上完成以下操作：

1. 打开“设置”，连续点击“版本号”以启用开发者选项。
2. 在“开发者选项”中开启“USB 调试”。
3. 使用支持数据传输的 USB 线连接 Mac。
4. 在手机弹出的 RSA 调试授权对话框中选择“允许”。

然后在 Mac 终端执行：

```bash
adb version
adb devices
```

当输出包含设备序列号和 `device` 状态时，说明 `adb` 已成功连接真机：

```text
List of devices attached
XXXXXXXX	device
```

## 常见问题

### `sdkmanager: command not found`

检查 Command-line Tools 目录是否正确：

```bash
ls "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
```

如果文件存在，重新加载环境变量：

```bash
source ~/.zshrc
```

如果文件不存在，确认压缩包解压后的 `bin`、`lib`、`NOTICE.txt` 和 `source.properties` 位于 `$ANDROID_HOME/cmdline-tools/latest/` 下。

### `adb devices` 未显示设备或显示 `unauthorized`

- 确认手机已开启 USB 调试。
- 使用支持数据传输的 USB 线，并尝试重新插拔。
- 解锁手机，在 RSA 调试授权提示中选择“允许”。
- 重启 ADB 服务后重试：

  ```bash
  adb kill-server
  adb start-server
  adb devices
  ```

### 构建提示 Android SDK 许可证未接受

重新执行许可证确认命令，并逐项输入 `y`：

```bash
sdkmanager --licenses
```

### 构建提示缺少某个 Android API 或 Build-Tools 版本

查看项目的 `compileSdk` 与构建配置，然后使用 `sdkmanager --list` 查找并安装匹配版本。例如，项目要求 API 34 时：

```bash
sdkmanager \
  "build-tools;34.0.0" \
  "platforms;android-34"
```
