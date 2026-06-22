import type {SidebarConfig} from '../index';

const k8sSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'tutorials/k8s/index',
    label: 'Kubernetes',
  },
  {
    type: 'doc',
    id: 'tutorials/k8s/install-k8s/index',
    label: '安装 K8s',
  },
  {
    type: 'doc',
    id: 'tutorials/k8s/nfs-server/index',
    label: 'NFS 服务器',
  },
  {
    type: 'doc',
    id: 'tutorials/k8s/Helm-Chart打包与分享',
    label: 'Helm Chart 打包与分享',
  },
  {
    type: 'category',
    label: 'Rancher',
    link: {
      type: 'doc',
      id: 'tutorials/k8s/rancher/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/k8s/rancher/空白集群部署Rancher',
        label: '空白集群部署 Rancher',
      },
    ],
  },
];

export default k8sSidebar;
