import { defineConfig } from 'vitepress'
import { sidebar } from './sidebar'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "cludix-doc",
  description: "cludix文档",
  srcDir: './docs',
  // 设置最后更新时间
  lastUpdated: true,
  themeConfig: {
    lastUpdated: {
      text: '最后更新于',
      format: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,          // 24 小时制
        timeZone: 'Asia/Shanghai' // 上海时区
      }
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: '星云', link: '/nebula/' },
      { text: 'Bug记录', link: '/bug/' }
    ],

    sidebar,

    // 上一页/下一页链接文本
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
