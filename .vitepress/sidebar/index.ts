import type { DefaultTheme } from 'vitepress'
import { nebulaSidebar } from './nebula'
import { bugSidebar } from './bug'

// 路由级sidebar配置
export const sidebar: DefaultTheme.Sidebar = {
  '/nebula/': nebulaSidebar,
  '/bug/': bugSidebar
}