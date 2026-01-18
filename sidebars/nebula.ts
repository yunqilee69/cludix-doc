import type {SidebarConfig} from './index';

const nebulaSidebar: SidebarConfig = [
  {
    type: 'category',
    label: 'Nebula',
    collapsible: false,
    items: [
      'nebula/index',
      'nebula/spec/index',
      'nebula/uaa/index',
    ],
  },
];

export default nebulaSidebar;
