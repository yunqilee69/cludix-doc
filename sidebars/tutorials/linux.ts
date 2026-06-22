import type {SidebarConfig} from '../index';

const linuxSidebar: SidebarConfig = [
  {
    type: 'doc',
    id: 'tutorials/linux/index',
    label: 'Linux',
  },
  {
    type: 'category',
    label: 'Debian 配置',
    items: [
      {
        type: 'doc',
        id: 'tutorials/linux/debian-base-config/index',
        label: 'Debian 基础配置',
      },
      {
        type: 'doc',
        id: 'tutorials/linux/debian-static-ip/index',
        label: 'Debian 静态 IP',
      },
      {
        type: 'doc',
        id: 'tutorials/linux/Debian12笔记本合盖不休眠',
        label: 'Debian12 合盖不休眠',
      },
    ],
  },
  {
    type: 'category',
    label: '虚拟化与安装',
    items: [
      {
        type: 'doc',
        id: 'tutorials/linux/create-debian-boot-usb/index',
        label: '创建 Debian 启动盘',
      },
      {
        type: 'doc',
        id: 'tutorials/linux/vmware-usb-debian/index',
        label: 'VMware 安装 Debian',
      },
    ],
  },
  {
    type: 'category',
    label: '开发环境',
    items: [
      {
        type: 'doc',
        id: 'tutorials/linux/nvm-nodejs/index',
        label: 'NVM 安装 Node.js',
      },
      {
        type: 'doc',
        id: 'tutorials/linux/Linux安装Homebrew',
        label: '安装 Homebrew',
      },
    ],
  },
  {
    type: 'doc',
    id: 'tutorials/linux/服务器配置vnc',
    label: '服务器配置 VNC',
  },
];

export default linuxSidebar;
