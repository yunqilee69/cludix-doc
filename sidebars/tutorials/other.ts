import type {SidebarConfig} from '../index';

const otherSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'tutorials/other/index',
    label: '其他',
  },
  {
    type: 'doc',
    id: 'tutorials/other/MD转PDF',
    label: 'MD 转 PDF',
  },
  {
    type: 'doc',
    id: 'tutorials/other/npm-scope/index',
    label: 'NPM Scope',
  },
  {
    type: 'doc',
    id: 'tutorials/other/发布管理',
    label: '发布管理',
  },
  {
    type: 'doc',
    id: 'tutorials/other/openclaw/index',
    label: 'OpenClaw',
  },
  {
    type: 'category',
    label: 'OpenCode',
    link: {
      type: 'doc',
      id: 'tutorials/other/opencode/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/other/opencode/安装与使用',
        label: '安装与使用',
      },
      {
        type: 'doc',
        id: 'tutorials/other/opencode/模型配置',
        label: '模型配置',
      },
      {
        type: 'doc',
        id: 'tutorials/other/opencode/LSP配置',
        label: 'LSP 配置',
      },
      {
        type: 'doc',
        id: 'tutorials/other/opencode/MCP配置',
        label: 'MCP 配置',
      },
      {
        type: 'doc',
        id: 'tutorials/other/opencode/Skills配置',
        label: 'Skills 配置',
      },
      {
        type: 'doc',
        id: 'tutorials/other/opencode/OhMyOpenagent配置',
        label: 'OhMyOpenagent 配置',
      },
    ],
  },
  {
    type: 'doc',
    id: 'tutorials/other/uv-python/index',
    label: 'UV Python',
  },
  {
    type: 'doc',
    id: 'tutorials/other/Bash与Zsh启动模式与配置文件',
    label: 'Bash 与 Zsh 启动模式',
  },
];

export default otherSidebar;
