import type {SidebarConfig} from './index';

// 顺序与 docs/nebula/index.md 的「推荐阅读顺序」保持一致：
// 设计说明 -> Auth/Dict/Param/Storage/Frontend 模块 -> 发布管理 -> 规范说明
// 每个模块内部按统一结构：overview -> design-and-implementation -> business-capabilities
// -> api-reference -> usage-guide -> configuration -> ddl
const nebulaSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'nebula/index',
    label: 'Nebula 项目',
  },
  {
    type: 'category',
    label: '设计说明',
    link: {
      type: 'doc',
      id: 'nebula/design/index',
    },
    items: [
      'nebula/design/layered-design',
      'nebula/design/package-design',
    ],
  },
  {
    type: 'category',
    label: 'Nebula Auth 模块',
    link: {
      type: 'doc',
      id: 'nebula/auth/index',
    },
    items: [
      'nebula/auth/overview',
      'nebula/auth/design-and-implementation',
      'nebula/auth/business-capabilities',
      'nebula/auth/api-reference',
      'nebula/auth/usage-guide',
      'nebula/auth/configuration',
      'nebula/auth/ddl',
    ],
  },
  {
    type: 'category',
    label: 'Nebula Dict 模块',
    link: {
      type: 'doc',
      id: 'nebula/dict/index',
    },
    items: [
      'nebula/dict/overview',
      'nebula/dict/design-and-implementation',
      'nebula/dict/business-capabilities',
      'nebula/dict/api-reference',
      'nebula/dict/usage-guide',
      'nebula/dict/configuration',
      'nebula/dict/ddl',
    ],
  },
  {
    type: 'category',
    label: 'Nebula Param 模块',
    link: {
      type: 'doc',
      id: 'nebula/param/index',
    },
    items: [
      'nebula/param/overview',
      'nebula/param/design-and-implementation',
      'nebula/param/business-capabilities',
      'nebula/param/api-reference',
      'nebula/param/usage-guide',
      'nebula/param/configuration',
      'nebula/param/ddl',
    ],
  },
  {
    type: 'category',
    label: 'Nebula Storage 模块',
    link: {
      type: 'doc',
      id: 'nebula/storage/index',
    },
    items: [
      'nebula/storage/overview',
      'nebula/storage/design-and-implementation',
      'nebula/storage/business-capabilities',
      'nebula/storage/api-reference',
      'nebula/storage/usage-guide',
      'nebula/storage/configuration',
      'nebula/storage/ddl',
    ],
  },
  {
    type: 'category',
    label: 'Nebula Frontend 模块',
    link: {
      type: 'doc',
      id: 'nebula/frontend/index',
    },
    items: [
      'nebula/frontend/overview',
      'nebula/frontend/design-and-implementation',
      'nebula/frontend/business-capabilities',
      'nebula/frontend/api-reference',
      'nebula/frontend/usage-guide',
      'nebula/frontend/configuration',
      'nebula/frontend/ddl',
    ],
  },
  {
    type: 'category',
    label: '发布管理',
    link: {
      type: 'doc',
      id: 'nebula/release/index',
    },
    items: ['nebula/release/maven-central-publish'],
  },
  {
    type: 'doc',
    id: 'nebula/spec/index',
    label: '规范说明',
  },
];

export default nebulaSidebar;
