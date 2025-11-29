
介绍如何快速的将MD文档转化为PDF格式

使用vscode中的Markdown PDF扩展，可直接将md文档导出为多种格式的文件，其中就有pdf

## 安装扩展

在vscode扩展商店中，搜索 `Markdown PDF`，作者为 `yzane`

## 配置扩展

扩展在导出pdf时，使用的字体默认是繁体字，需要切换简体字体，例如，微软雅黑

vscode有多级配置，有用户级别和项目级别，下面直接以项目级别的进行说明

打开一个文件夹后，在根目录创建 `.vscode` 文件夹，并新建 `settings.json` 文件，写入以下配置

```json
{
    "markdown-pdf.styles": ["./.vscode/md-pdf-extension.css"],
    "markdown-pdf.displayHeaderFooter": false,
    "markdown-pdf.highlightStyle": "idea.css"
}
```

并在 `.vscode` 文件夹下，新建一个 `md-pdf-extension.css` 文件，内容如下

```css
body {
    font-family: "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
}

h1, h2, h3, h4, h5, h6 {
    font-family: "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
}

p, div, span, td, th {
    font-family: "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
}

code, pre {
    font-family: "Consolas", "Courier New", monospace !important;
}
```

## 说明

在编写md文档时，需要注意文档的位置必须是根目录下，因为配置的css样式是相对路径，一旦以md文档的路径去查找css文件失败，就会导致样式不生效

:::info 提示
也可以直接将css文件路径修改为绝对路径，这样md文档位置就不会有任何限制了
:::