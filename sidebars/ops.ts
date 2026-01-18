import type {SidebarConfig} from './index';

const opsSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'Basics',
    collapsible: true,
    collapsed: false,
    items: [
      'ops/basics/debian-base-config',
      'ops/basics/debian-static-ip',
      'ops/basics/install-docker',
      'ops/basics/install-k8s',
    ],
  },
  {
    type: 'category',
    label: 'Network',
    collapsible: true,
    collapsed: true,
    items: [
      'ops/network/frp-nat',
      'ops/network/git-ssh',
    ],
  },
  {
    type: 'category',
    label: 'Services',
    collapsible: true,
    collapsed: true,
    items: [
      'ops/services/jellyfin',
      'ops/services/milvus',
    ],
  },
  {
    type: 'category',
    label: 'CI/CD',
    collapsible: true,
    collapsed: true,
    items: [
      {
        type: 'category',
        label: 'Jenkins',
        collapsible: true,
        collapsed: true,
        items: [
          'ops/cicd/jenkins/index',
          'ops/cicd/jenkins/install-jenkins',
          'ops/cicd/jenkins/jenkins-ssh-config',
          'ops/cicd/jenkins/jenkins-deploy',
        ],
      },
      'ops/cicd/webhook',
    ],
  },
];

export default opsSidebar;
