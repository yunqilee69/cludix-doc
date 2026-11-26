import type {SidebarConfig} from '../index';

const aiSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'tutorials/ai/index',
    label: 'AI',
  },
  {
    type: 'category',
    label: '基础概念',
    collapsible: true,
    collapsed: true,
    items: [
      {
        type: 'doc',
        id: 'tutorials/ai/concepts/index',
        label: 'AI 协议与概念',
      },
      {
        type: 'doc',
        id: 'tutorials/ai/concepts/A2UI与AG-UI',
        label: 'A2UI、AG-UI 与 ChatGPT Apps',
      },
    ],
  },
  {
    type: 'category',
    label: 'AI 应用',
    collapsible: true,
    collapsed: true,
    items: [
      {
        type: 'doc',
        id: 'tutorials/ai/applications/openclaw/index',
        label: 'OpenClaw',
      },
    ],
  },
  {
    type: 'category',
    label: 'AI 开发工具',
    collapsible: true,
    collapsed: true,
    items: [
      {
        type: 'category',
        label: 'OpenCode',
        link: {
          type: 'doc',
          id: 'tutorials/ai/tools/opencode/index',
        },
        items: [
          {
            type: 'doc',
            id: 'tutorials/ai/tools/opencode/安装与使用',
            label: '安装与使用',
          },
          {
            type: 'doc',
            id: 'tutorials/ai/tools/opencode/模型配置',
            label: '模型配置',
          },
          {
            type: 'doc',
            id: 'tutorials/ai/tools/opencode/LSP配置',
            label: 'LSP 配置',
          },
          {
            type: 'doc',
            id: 'tutorials/ai/tools/opencode/MCP配置',
            label: 'MCP 配置',
          },
          {
            type: 'doc',
            id: 'tutorials/ai/tools/opencode/Skills配置',
            label: 'Skills 配置',
          },
          {
            type: 'doc',
            id: 'tutorials/ai/tools/opencode/OhMyOpenagent配置',
            label: 'OhMyOpenagent 配置',
          },
        ],
      },
    ],
  },
];

export default aiSidebar;
