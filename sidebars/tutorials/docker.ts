import type {SidebarConfig} from '../index';

const dockerSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'tutorials/docker/index',
    label: 'Docker',
  },
  {
    type: 'doc',
    id: 'tutorials/docker/docker-config',
    label: 'Docker 配置',
  },
  {
    type: 'category',
    label: '安装 Docker',
    link: {
      type: 'doc',
      id: 'tutorials/docker/install-docker/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/docker/install-docker/Debian13离线安装Docker',
        label: 'Debian13 离线安装 Docker',
      },
    ],
  },
  {
    type: 'category',
    label: '容器部署',
    link: {
      type: 'doc',
      id: 'tutorials/docker/deployments/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Bifrost部署',
        label: 'Bifrost',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/DeerFlow部署',
        label: 'DeerFlow',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/DockerRegistry部署',
        label: 'Docker Registry',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/DockerRegistryBrowser部署',
        label: 'Docker Registry Browser',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Filebrowser部署',
        label: 'Filebrowser',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Harbor部署',
        label: 'Harbor',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Jellyfin部署',
        label: 'Jellyfin',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Jellyseerr部署',
        label: 'Jellyseerr',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Jenkins部署',
        label: 'Jenkins',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Milvus部署',
        label: 'Milvus',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/MySQL部署',
        label: 'MySQL',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Nacos部署',
        label: 'Nacos',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/NewAPI部署',
        label: 'NewAPI',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Nginx部署',
        label: 'Nginx',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Portainer部署',
        label: 'Portainer',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/PostgreSQL17部署',
        label: 'PostgreSQL 17',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/Redis部署',
        label: 'Redis',
      },
      {
        type: 'doc',
        id: 'tutorials/docker/deployments/RocketMQ部署',
        label: 'RocketMQ',
      },
    ],
  },
  {
    type: 'category',
    label: '使用文档',
    link: {
      type: 'doc',
      id: 'tutorials/docker/usage/index',
    },
    items: [
      {
        type: 'doc',
        id: 'tutorials/docker/usage/GHCR上传指南',
        label: 'GHCR 上传指南',
      },
    ],
  },
];

export default dockerSidebar;
