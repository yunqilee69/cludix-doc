import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type * as SearchLocal from "@easyops-cn/docusaurus-search-local";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "云星",
  tagline: "Dinosaurs are cool",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://your-docusaurus-site.example.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "facebook", // Usually your GitHub org/user name.
  projectName: "docusaurus", // Usually your repo name.

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is in Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/yunqilee69/cludix-doc/tree/master/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    colorMode: {
      // 默认色彩模式
      defaultMode: 'light',
      // 关闭切换，在导航栏隐藏切换按钮
      disableSwitch: true,
    },
    navbar: {
      title: "云星",
      logo: {
        alt: "My Site Logo",
        src: "img/logo.png",
      },
      items: [
        {
          type: "search",
          position: "right",
        },
        {
          type: "docSidebar",
          sidebarId: 'nebulaSidebar',
          position: "right",
          label: "Nebula"
        },
        {
          type: "docSidebar",
          sidebarId: 'developmentSidebar',
          position: "right",
          label: "开发"
        },
        {
          type: "docSidebar",
          sidebarId: 'softwareSidebar',
          position: "right",
          label: "软件安装"
        },
        {
          type: "docSidebar",
          sidebarId: 'operationsSidebar',
          position: "right",
          label: "运维"
        },
        {
          href: "https://github.com/yunqilee69",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    // prism: {
    //   theme: prismThemes.github,
    //   darkTheme: prismThemes.dracula,
    // },
  } satisfies Preset.ThemeConfig,

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        // 下面所有 key 都有 TS 提示
        language: "zh",
        docsRouteBasePath: "/docs",
      } satisfies SearchLocal.PluginOptions, // ✅ 一行锁死类型
    ],
  ],

};

export default config;
