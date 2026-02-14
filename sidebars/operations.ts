import type { SidebarConfig } from './index';

const operationsSidebar: SidebarConfig = [
  {
    type: 'category',
    label: '基础配置',
    collapsible: true,
    collapsed: false,
    items: [
      'operations/basics/debian-base-config/index',
      'operations/basics/debian-static-ip/index',
      'operations/basics/install-docker/index',
      'operations/basics/install-docker/offline-install-debian13',
    ],
  },
  {
    type: 'category',
    label: 'Kubernetes',
    collapsible: true,
    collapsed: false,
    items: [
      'operations/k8s/install-k8s/index',
      'operations/k8s/helm-chart-package-and-sharing',
      'operations/k8s/nfs-server/index',
      {
        type: 'category',
        label: 'Rancher',
        collapsible: true,
        collapsed: false,
        items: [
          'operations/k8s/rancher/index',
          'operations/k8s/rancher/empty-cluster-rancher',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '网络',
    collapsible: true,
    collapsed: true,
    items: [
      'operations/network/frp-nat/index',
      'operations/network/git-ssh/index',
      'operations/network/linux-homebrew-setup',
      'operations/network/debian-proxy-setup',
      'operations/network/ssl-deployment',
    ],
  },
  {
    type: 'category',
    label: '服务',
    collapsible: true,
    collapsed: false,
    items: [
      'operations/services/jellyfin/index',
      'operations/services/milvus/index',
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
          'operations/cicd/jenkins/index',
          'operations/cicd/jenkins/install-jenkins/index',
          'operations/cicd/jenkins/jenkins-ssh-config/index',
          'operations/cicd/jenkins/jenkins-deploy/index',
        ],
      },
      'operations/cicd/webhook/index',
      'operations/cicd/filebrowser/index',
    ],
  },
];

export default operationsSidebar;
