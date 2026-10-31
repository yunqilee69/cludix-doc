import type {SidebarConfig} from '../index';

// 本文件是 cludix-doc/sidebars/projects/omnigate.ts 的源文件，由
// OmniGate/scripts/sync-docs.sh 与 .github/workflows/sync-docs.yml 一起同步。
// 不要直接改 cludix-doc 里的那一份。
//
// 阅读顺序：快速开始 -> 使用指南 -> 部署运维 -> 设计与架构 -> 开发发布 -> 参考。
// 新增、改名、移动、删除文档时同步修改这里，否则页面不会出现在左侧导航。
const omnigateSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'projects/omnigate/index',
    label: 'OmniGate',
  },
  {
    type: 'category',
    label: '快速开始',
    link: {type: 'doc', id: 'projects/omnigate/getting-started/index'},
    items: [
      'projects/omnigate/getting-started/安装',
      'projects/omnigate/getting-started/五分钟上手',
      'projects/omnigate/getting-started/接入客户端',
    ],
  },
  {
    type: 'category',
    label: '使用指南',
    link: {type: 'doc', id: 'projects/omnigate/guide/index'},
    items: [
      'projects/omnigate/guide/配置中心',
      'projects/omnigate/guide/路由',
      'projects/omnigate/guide/虚拟密钥',
      'projects/omnigate/guide/调用与端点',
      'projects/omnigate/guide/多模态与MCP',
      'projects/omnigate/guide/密钥门户',
      'projects/omnigate/guide/对话测试页',
      'projects/omnigate/guide/运行设置',
      'projects/omnigate/guide/启动层配置',
    ],
  },
  {
    type: 'category',
    label: '部署与运维',
    link: {type: 'doc', id: 'projects/omnigate/operations/index'},
    items: [
      'projects/omnigate/operations/部署形态',
      'projects/omnigate/operations/数据库后端',
      'projects/omnigate/operations/开机自启',
      'projects/omnigate/operations/版本更新',
      'projects/omnigate/operations/通知与告警',
      'projects/omnigate/operations/日志与排障',
      'projects/omnigate/operations/安全与隐私',
    ],
  },
  {
    type: 'category',
    label: '设计与架构',
    link: {type: 'doc', id: 'projects/omnigate/design/index'},
    items: [
      'projects/omnigate/design/总体架构',
      'projects/omnigate/design/数据模型',
      'projects/omnigate/design/路由与负载均衡',
      'projects/omnigate/design/熔断与恢复',
      'projects/omnigate/design/请求生命周期与重试',
      'projects/omnigate/design/协议转换',
      'projects/omnigate/design/统计口径',
      'projects/omnigate/design/门户权限与通知受众',
      'projects/omnigate/design/定时探测与自动解禁',
    ],
  },
  {
    type: 'category',
    label: '开发与发布',
    link: {type: 'doc', id: 'projects/omnigate/development/index'},
    items: [
      'projects/omnigate/development/本地开发',
      'projects/omnigate/development/代码结构',
      'projects/omnigate/development/测试与质量',
      'projects/omnigate/development/发布流程',
      'projects/omnigate/development/调试模式',
    ],
  },
  {
    type: 'category',
    label: '参考',
    link: {type: 'doc', id: 'projects/omnigate/reference/index'},
    items: [
      'projects/omnigate/reference/CLI命令',
      'projects/omnigate/reference/环境变量',
      'projects/omnigate/reference/配置项总表',
      'projects/omnigate/reference/HTTP_API',
      'projects/omnigate/reference/术语表',
    ],
  },
];

export default omnigateSidebar;
