import type {SidebarConfig} from './index';

const developmentSidebar: SidebarConfig = [
  {
    type: 'category',
    label: '开发工具',
    collapsible: true,
    collapsed: false,
    items: [
      'development/tools/git/index',
      'development/tools/opencode/index',
    ],
  },
  {
    type: 'category',
    label: '问题解决',
    collapsible: true,
    collapsed: true,
    items: [
      {
        type: 'category',
        label: '通用',
        collapsible: true,
        collapsed: true,
        items: [
          'development/troubleshooting/general/file-upload-error',
          'development/troubleshooting/general/webclient-log-filter',
          'development/troubleshooting/general/md-to-pdf',
        ],
      },
      {
        type: 'category',
        label: '服务器问题',
        collapsible: true,
        collapsed: true,
        items: [
          'development/troubleshooting/server-issues/vmware-usb-debian/index',
        ],
      },
    ],
  },
];

export default developmentSidebar;
