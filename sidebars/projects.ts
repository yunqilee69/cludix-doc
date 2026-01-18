import type {SidebarConfig} from './index';

const projectsSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'Nebula',
    collapsible: false,
    items: [
      'projects/nebula/index',
      'projects/nebula/spec/index',
      'projects/nebula/uaa/index',
    ],
  },
];

export default projectsSidebar;
