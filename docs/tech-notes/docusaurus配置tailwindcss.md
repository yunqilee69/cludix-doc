docusaurus集成tailwindcss

## 好处

可以直接使用tailwindcss中预设的样式进行编写页面

## 步骤

### 1. 安装库

使用下面的命令进行安装tailwindcss+postcss+autoprefixer

:::tip

由于版本原因，目前不支持tailwindcss v4版本，按照下面命令执行即可

:::

```js

pnpm add -D tailwindcss@^3.4.1 postcss@^8.4.41 autoprefixer@^10.4.20

npx tailwindcss init --ts

```

### 2. 修改tailwind.config.ts

参考下面的内容进行修改

``` ts
import type { Config } from 'tailwindcss'

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,md,mdx}',
    './blog/**/*.{js,jsx,ts,tsx,md,mdx}',
    './docs/**/*.{js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config

```

### 3. 修改docusaurus.config.ts

直接写动态插件即可

```ts
// 关键代码，直接写入插件
plugins: [
    async function () {
      return {
        name: 'docusaurus-tailwindcss',
        configurePostCss(postcssOptions) {
          // Appends TailwindCSS and AutoPrefixer.
          postcssOptions.plugins.push(require('tailwindcss'))
          postcssOptions.plugins.push(require('autoprefixer'))
          return postcssOptions
        },
      }
    },
]

```

### 4.添加到custome.css中

```css
/* 直接加到custome.css的开头即可 */
.tailwind {
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    @tailwind screens;
}

```
:::warning 注意
1. 需要确保docusaurus.config.ts中引入了该css文件
2. 加一个tailwind的类名，是为防止干扰docusaurus原有的样式，当使用到tailwindcss时，在组件的最外层添加tailwind类名即可
:::