import type {SidebarConfig} from './index';

const softwareSidebar: SidebarConfig = [
  {
    type: 'category',
    label: '包管理器',
    collapsible: true,
    collapsed: false,
    items: [
      'software/package-managers/homebrew/index',
      'software/package-managers/nvm-nodejs/index',
      'software/package-managers/sdkman-java/index',
      'software/package-managers/uv-python/index',
    ],
  },
  {
    type: 'category',
    label: '工具',
    collapsible: true,
    collapsed: true,
    items: [
      'software/tools/oh-my-zsh/index',
    ],
  },
];

export default softwareSidebar;
