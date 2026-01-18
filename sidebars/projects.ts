import type {SidebarConfig} from './index';

const projectsSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'Nebula',
    collapsible: false,
    items: [
      'projects/nebula',
      'projects/nebula/spec',
      'projects/nebula/uaa',
      'projects/nebula/api',
    ],
  },
];

export default projectsSidebar;
