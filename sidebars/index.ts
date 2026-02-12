import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import operationsSidebar from './operations';
import softwareSidebar from './software';
import developmentSidebar from './development';
import nebulaSidebar from './nebula';

export type SidebarConfig = SidebarsConfig[string];

const sidebars: SidebarsConfig = {
  operationsSidebar,
  softwareSidebar,
  developmentSidebar,
  nebulaSidebar
};

export default sidebars;
