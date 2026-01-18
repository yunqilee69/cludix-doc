import type {SidebarConfig} from './index';

const opsSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'Basics',
    collapsible: true,
    collapsed: false,
    items: [
      'ops/basics/debian-base-config/index',
      'ops/basics/debian-static-ip/index',
      'ops/basics/install-docker/index',
      'ops/basics/install-k8s/index',
    ],
  },
  {
    type: 'category',
    label: 'Network',
    collapsible: true,
    collapsed: true,
    items: [
      'ops/network/frp-nat/index',
      'ops/network/git-ssh/index',
    ],
  },
  {
    type: 'category',
    label: 'Services',
    collapsible: true,
    collapsed: true,
    items: [
      'ops/services/jellyfin/index',
      'ops/services/milvus/index',
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
          'ops/cicd/jenkins/install-jenkins/index',
          'ops/cicd/jenkins/jenkins-ssh-config/index',
          'ops/cicd/jenkins/jenkins-deploy/index',
        ],
      },
      'ops/cicd/webhook/index',
    ],
  },
];

export default opsSidebar;
