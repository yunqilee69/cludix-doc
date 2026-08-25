import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import nebulaSidebar from './nebula';
import projectsSidebar from './projects';
import financeSidebar from './finance';
import {
  dockerSidebar,
  linuxSidebar,
  ciSidebar,
  k8sSidebar,
  networkSidebar,
  otherSidebar,
  javaSidebar,
  macosSidebar,
} from './tutorials';
import {
  troubleshootingDockerSidebar,
  troubleshootingJavaSidebar,
  troubleshootingOtherSidebar,
} from './troubleshooting';

export type SidebarConfig = SidebarsConfig[string];

const sidebars: SidebarsConfig = {
  nebulaSidebar,
  projectsSidebar,
  financeSidebar,
  tutorialsOverviewSidebar: [{ type: 'doc', id: 'tutorials/index' }],
  tutorialsDockerSidebar: dockerSidebar,
  tutorialsLinuxSidebar: linuxSidebar,
  tutorialsCiSidebar: ciSidebar,
  tutorialsK8sSidebar: k8sSidebar,
  tutorialsNetworkSidebar: networkSidebar,
  tutorialsOtherSidebar: otherSidebar,
  tutorialsJavaSidebar: javaSidebar,
  tutorialsMacosSidebar: macosSidebar,
  troubleshootingOverviewSidebar: [{ type: 'doc', id: 'troubleshooting/index' }],
  troubleshootingDockerSidebar: troubleshootingDockerSidebar,
  troubleshootingJavaSidebar: troubleshootingJavaSidebar,
  troubleshootingOtherSidebar: troubleshootingOtherSidebar,
};

export default sidebars;
