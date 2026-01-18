import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import opsSidebar from './ops';
import devEnvSidebar from './dev-env';
import solutionsSidebar from './solutions';
import nebulaSidebar from './nebula';

export type SidebarConfig = SidebarsConfig[string];

const sidebars: SidebarsConfig = {
  opsSidebar,
  devEnvSidebar,
  solutionsSidebar,
  nebulaSidebar
};

export default sidebars;
