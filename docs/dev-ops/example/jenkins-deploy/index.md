# jenkins实现自动部署

本文介绍如何通过jenkins实现自动部署，以前端部署为例。

前提说明，本文会使用到内网穿透、jenkins、python脚本、科学上网（可选）

大致流程为
1. 用户push代码到github仓库中
2. github调用webhook,执行jenkins自动部署
3. jenkins拉取代码到内网机器，执行构建操作，将构建产物防止外网机器上，并通过ssh调用外网机器上的python脚本实现部署
4. 最终通知用户部署完成
