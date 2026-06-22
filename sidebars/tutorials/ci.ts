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
    ],
  },
  {
    type: 'category',
    label: 'Jenkins',
    link: {
      type: 'doc',
      id: 'tutorials/ci/jenkins/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/ci/jenkins/install-jenkins/index',
        label: '安装 Jenkins',
      },
      {
        type: 'doc',
        id: 'tutorials/ci/jenkins/jenkins-deploy/index',
        label: 'Jenkins 部署',
      },
      {
        type: 'doc',
        id: 'tutorials/ci/jenkins/jenkins-ssh-config/index',
        label: 'Jenkins SSH 配置',
      },
    ],
  },
  {
    type: 'doc',
    id: 'tutorials/ci/filebrowser/index',
    label: 'Filebrowser',
  },
  {
    type: 'doc',
    id: 'tutorials/ci/webhook/index',
    label: 'Webhook',
  },
];

export default ciSidebar;
