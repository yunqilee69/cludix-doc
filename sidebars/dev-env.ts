import type {SidebarConfig} from './index';

const devEnvSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'Package Managers',
    collapsible: true,
    collapsed: false,
    items: [
      'dev-env/package-managers/homebrew',
      'dev-env/package-managers/nvm-nodejs',
      'dev-env/package-managers/sdkman-java',
      'dev-env/package-managers/uv-python',
    ],
  },
  {
    type: 'category',
    label: 'Tools',
    collapsible: true,
    collapsed: false,
    items: [
      'dev-env/tools/oh-my-zsh',
      'dev-env/tools/opencode',
      'dev-env/tools/git',
    ],
  },
];

export default devEnvSidebar;
