import type {SidebarConfig} from '..';

const macosSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'macOS',
    collapsible: false,
    items: [
      'tutorials/macos/index',
      {
        type: 'category',
        label: 'HarmonyOS',
        items: ['tutorials/macos/harmonyos/index'],
      },
      {
        type: 'category',
        label: 'Android',
        items: ['tutorials/macos/macOS配置Android开发环境'],
      },
      {
        type: 'category',
        label: '开发环境',
        items: [
          'tutorials/macos/homebrew/index',
          'tutorials/macos/sdkman-java/index',
          'tutorials/macos/rust-cargo/index',
          'tutorials/macos/oh-my-zsh/index',
        ],
      },
      'tutorials/macos/macos-mini-power/index',
    ],
  },
];

export default macosSidebar;
