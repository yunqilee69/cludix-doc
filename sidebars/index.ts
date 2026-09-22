import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import {
  nebulaSidebar,
  omnitotpSidebar,
  omnigateSidebar,
  portCleanerSidebar,
  ompStudioSidebar,
} from './projects';
import financeSidebar from './finance';
import {
  dockerSidebar,
  linuxSidebar,
  gitSidebar,
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
import aiSidebar from './tutorials/ai';

export type SidebarConfig = SidebarsConfig[string];

const sidebars: SidebarsConfig = {
  nebulaSidebar,
  omnitotpSidebar,
  omnigateSidebar,
  portCleanerSidebar,
  ompStudioSidebar,
  financeSidebar,
  tutorialsOverviewSidebar: [{ type: 'doc', id: 'tutorials/index' }],
  tutorialsDockerSidebar: dockerSidebar,
  tutorialsLinuxSidebar: linuxSidebar,
  tutorialsGitSidebar: gitSidebar,
  tutorialsK8sSidebar: k8sSidebar,
  tutorialsNetworkSidebar: networkSidebar,
  tutorialsOtherSidebar: otherSidebar,
  tutorialsJavaSidebar: javaSidebar,
  tutorialsMacosSidebar: macosSidebar,
  tutorialsAiSidebar: aiSidebar,
  troubleshootingOverviewSidebar: [{ type: 'doc', id: 'troubleshooting/index' }],
  troubleshootingDockerSidebar: troubleshootingDockerSidebar,
  troubleshootingJavaSidebar: troubleshootingJavaSidebar,
  troubleshootingOtherSidebar: troubleshootingOtherSidebar,
};

export default sidebars;
