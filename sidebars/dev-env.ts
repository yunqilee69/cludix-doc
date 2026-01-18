import type {SidebarConfig} from './index';

const devEnvSidebar: SidebarConfig = [
  {
    type: 'category',
    label: '环境配置',
    collapsible: true,
    collapsed: false,
    items: [
      'dev-env/package-managers/homebrew/index',
      'dev-env/package-managers/nvm-nodejs/index',
      'dev-env/package-managers/sdkman-java/index',
      'dev-env/package-managers/uv-python/index',
      'dev-env/tools/oh-my-zsh/index',
      'dev-env/tools/opencode/index',
      'dev-env/tools/git/index',
    ],
  },
];

export default devEnvSidebar;
