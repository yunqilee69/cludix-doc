import type {SidebarConfig} from '../index';

const ciSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'tutorials/ci/index',
    label: 'CI/CD',
  },
  {
    type: 'category',
    label: 'Git',
    link: {
      type: 'doc',
      id: 'tutorials/ci/git/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/ci/git/commands',
        label: 'Git 常用命令',
      },
      {
        type: 'doc',
        id: 'tutorials/ci/git/git远程分支清理',
        label: 'Git 远程分支清理',
      },
      {
        type: 'doc',
        id: 'tutorials/ci/git/git重复认证问题',
        label: 'Git 重复认证问题',
      },
    ],
  },
  {
    type: 'doc',
    id: 'tutorials/ci/filebrowser/index',
    label: 'Filebrowser',
  },
];

export default ciSidebar;
