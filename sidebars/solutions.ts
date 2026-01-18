import type {SidebarConfig} from './index';

const solutionsSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'General',
    collapsible: true,
    collapsed: false,
    items: [
      'solutions/general/file-upload-error',
      'solutions/general/webclient-log-filter',
      'solutions/general/md-to-pdf',
    ],
  },
  {
    type: 'category',
    label: 'Server Issues',
    collapsible: true,
    collapsed: true,
    items: [
      'solutions/server-issues/vmware-usb-debian',
    ],
  },
  {
    type: 'category',
    label: 'Dev Issues',
    collapsible: true,
    collapsed: true,
    items: [],
  },
  {
    type: 'category',
    label: 'Network Issues',
    collapsible: true,
    collapsed: true,
    items: [],
  },
];

export default solutionsSidebar;
