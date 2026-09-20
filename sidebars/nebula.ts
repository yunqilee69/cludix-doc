import type {SidebarConfig} from './index';

// 按阅读旅程组织：入门 -> 模块指南 -> 配置说明 -> 进阶
// - 入门：项目简介、快速开始（nebula-template fork 使用）、设计说明
// - 模块指南：各模块能力边界与接入方式（overview / business-capabilities / usage-guide）
// - 配置说明：各模块 configuration 集中查阅
// - 进阶：设计实现与数据表（design-and-implementation / ddl）、规范说明、发布管理
// 接口文档已从站点移除，改由 nebula 后端运行时 OpenAPI 文档（doc.html）承接
const nebulaSidebar: SidebarConfig = [
  {
    type: 'category',
    label: '入门',
    items: [
      {
        type: 'doc',
        id: 'nebula/index',
        label: '项目简介',
      },
      'nebula/quick-start',
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
    ],
  },
  {
    type: 'category',
    label: '模块指南',
    items: [
      {
        type: 'category',
        label: 'Auth 模块',
        link: {
          type: 'doc',
          id: 'nebula/auth/index',
        },
        items: [
          'nebula/auth/overview',
          'nebula/auth/business-capabilities',
          'nebula/auth/usage-guide',
        ],
      },
      {
        type: 'category',
        label: 'Dict 模块',
        link: {
          type: 'doc',
          id: 'nebula/dict/index',
        },
        items: [
          'nebula/dict/overview',
          'nebula/dict/business-capabilities',
          'nebula/dict/usage-guide',
        ],
      },
      {
        type: 'category',
        label: 'Param 模块',
        link: {
          type: 'doc',
          id: 'nebula/param/index',
        },
        items: [
          'nebula/param/overview',
          'nebula/param/business-capabilities',
          'nebula/param/usage-guide',
        ],
      },
      {
        type: 'category',
        label: 'Storage 模块',
        link: {
          type: 'doc',
          id: 'nebula/storage/index',
        },
        items: [
          'nebula/storage/overview',
          'nebula/storage/business-capabilities',
          'nebula/storage/usage-guide',
        ],
      },
      {
        type: 'category',
        label: 'Frontend 模块',
        link: {
          type: 'doc',
          id: 'nebula/frontend/index',
        },
        items: [
          'nebula/frontend/overview',
          'nebula/frontend/business-capabilities',
          'nebula/frontend/usage-guide',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '配置说明',
    items: [
      {
        type: 'doc',
        id: 'nebula/auth/configuration',
        label: 'Auth 配置',
      },
      {
        type: 'doc',
        id: 'nebula/dict/configuration',
        label: 'Dict 配置',
      },
      {
        type: 'doc',
        id: 'nebula/param/configuration',
        label: 'Param 配置',
      },
      {
        type: 'doc',
        id: 'nebula/storage/configuration',
        label: 'Storage 配置',
      },
      {
        type: 'doc',
        id: 'nebula/frontend/configuration',
        label: 'Frontend 配置',
      },
    ],
  },
  {
    type: 'category',
    label: '进阶',
    items: [
      {
        type: 'doc',
        id: 'nebula/auth/design-and-implementation',
        label: 'Auth 设计与实现',
      },
      {
        type: 'doc',
        id: 'nebula/auth/ddl',
        label: 'Auth 数据表',
      },
      {
        type: 'doc',
        id: 'nebula/dict/design-and-implementation',
        label: 'Dict 设计与实现',
      },
      {
        type: 'doc',
        id: 'nebula/dict/ddl',
        label: 'Dict 数据表',
      },
      {
        type: 'doc',
        id: 'nebula/param/design-and-implementation',
        label: 'Param 设计与实现',
      },
      {
        type: 'doc',
        id: 'nebula/param/ddl',
        label: 'Param 数据表',
      },
      {
        type: 'doc',
        id: 'nebula/storage/design-and-implementation',
        label: 'Storage 设计与实现',
      },
      {
        type: 'doc',
        id: 'nebula/storage/ddl',
        label: 'Storage 数据表',
      },
      {
        type: 'doc',
        id: 'nebula/frontend/design-and-implementation',
        label: 'Frontend 设计与实现',
      },
      {
        type: 'doc',
        id: 'nebula/frontend/ddl',
        label: 'Frontend 数据表',
      },
      {
        type: 'doc',
        id: 'nebula/spec/index',
        label: '规范说明',
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
    ],
  },
];

export default nebulaSidebar;