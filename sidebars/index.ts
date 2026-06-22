import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import nebulaSidebar from './nebula';
import {
  dockerSidebar,
  linuxSidebar,
  ciSidebar,
  k8sSidebar,
  networkSidebar,
  otherSidebar,
  javaSidebar,
} from './tutorials';
import {
  troubleshootingDockerSidebar,
  troubleshootingJavaSidebar,
} from './troubleshooting';

export type SidebarConfig = SidebarsConfig[string];

const sidebars: SidebarsConfig = {
  nebulaSidebar,
  tutorialsOverviewSidebar: [{ type: 'doc', id: 'tutorials/index' }],
  tutorialsDockerSidebar: dockerSidebar,
  tutorialsLinuxSidebar: linuxSidebar,
  tutorialsCiSidebar: ciSidebar,
  tutorialsK8sSidebar: k8sSidebar,
  tutorialsNetworkSidebar: networkSidebar,
  tutorialsOtherSidebar: otherSidebar,
  tutorialsJavaSidebar: javaSidebar,
  troubleshootingOverviewSidebar: [{ type: 'doc', id: 'troubleshooting/index' }],
  troubleshootingDockerSidebar: troubleshootingDockerSidebar,
  troubleshootingJavaSidebar: troubleshootingJavaSidebar,
};

export default sidebars;
