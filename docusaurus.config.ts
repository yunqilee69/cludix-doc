import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type * as SearchLocal from "@easyops-cn/docusaurus-search-local";

// 闲鱼店铺推广链接（TODO: 替换为真实闲鱼店铺链接）
const XIANYU_URL = "https://github.com/yunqilee69";

const ICP_NUMBER = "皖ICP备2023028796号-1";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "云寰",
  tagline: "个人技术知识库",
  customFields: {
    description: "云寰 - 个人技术知识库：体系化教程、真实踩坑排查记录与开源项目实践。",
    xianyuUrl: XIANYU_URL,
  },
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://yunqilee69.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "yunqilee69", // Usually your GitHub org/user name.
  projectName: "cludix-doc", // Usually your repo name.

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is in Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "zh",
    locales: ["zh"],
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
        blog: {
          path: "./blog",
          routeBasePath: "blog",
          blogTitle: "专题记录",
          blogDescription: "记录跨多个工具、配置和系统的大型问题处理过程。",
          showReadingTime: true,
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
    announcementBar: {
      id: "promo-xianyu",
      content: `🛒 闲鱼小店已上线，欢迎进店逛逛 <a target="_blank" rel="noopener noreferrer" href="${XIANYU_URL}">点击前往 »</a>`,
      backgroundColor: "var(--ifm-color-emphasis-100)",
      textColor: "var(--ifm-color-emphasis-900)",
      isCloseable: true,
    },
    colorMode: {
      // 默认色彩模式
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    footer: {
      style: "dark",
      copyright: `Copyright © ${new Date().getFullYear()} 云寰 · <a target="_blank" rel="noopener noreferrer" href="https://beian.miit.gov.cn/">${ICP_NUMBER}</a>`,
    },
    navbar: {
      title: "云寰",
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
          to: "/blog",
          label: "专题",
          position: "right",
        },
        {
          to: "/docs/finance/",
          label: "金融",
          position: "right",
        },
        {
          type: "dropdown",
          label: "项目",
          position: "right",
          items: [
            { label: "Nebula", to: "/docs/nebula/" },
            { label: "Cludix TOTP", to: "/docs/projects/cludix-totp" },
            { label: "Port Cleaner", to: "/docs/projects/port-cleaner" },
          ],
        },
        {
          type: "dropdown",
          label: "教程",
          position: "right",
          items: [
            { label: "Linux", to: "/docs/tutorials/linux/" },
            { label: "Windows", to: "/docs/tutorials/windows/" },
            { label: "macOS", to: "/docs/tutorials/macos/" },
            { label: "Docker", to: "/docs/tutorials/docker/" },
            { label: "Kubernetes", to: "/docs/tutorials/k8s/" },
            { label: "CI/CD", to: "/docs/tutorials/ci/" },
            { label: "Java", to: "/docs/tutorials/java/" },
            { label: "AI", to: "/docs/tutorials/ai/" },
            { label: "数据库", to: "/docs/tutorials/database/" },
            { label: "网络", to: "/docs/tutorials/network/" },
            { label: "其他", to: "/docs/tutorials/other/" },
          ],
        },
        {
          type: "dropdown",
          label: "踩坑",
          position: "right",
          items: [
            { label: "Linux", to: "/docs/troubleshooting/linux/" },
            { label: "Windows", to: "/docs/troubleshooting/windows/" },
            { label: "macOS", to: "/docs/troubleshooting/macos/" },
            { label: "Docker", to: "/docs/troubleshooting/docker/" },
            { label: "Kubernetes", to: "/docs/troubleshooting/k8s/" },
            { label: "CI/CD", to: "/docs/troubleshooting/ci/" },
            { label: "Java", to: "/docs/troubleshooting/java/" },
            { label: "数据库", to: "/docs/troubleshooting/database/" },
            { label: "网络", to: "/docs/troubleshooting/network/" },
            { label: "其他", to: "/docs/troubleshooting/other/" },
          ],
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        language: ["en", "zh"],
        docsRouteBasePath: "docs",
        // 启用哈希索引缓存（优化构建和加载）
        hashed: true,
        // 搜索结果配置
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        // 搜索体验增强
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
        explicitSearchResultPath: true,
      } satisfies SearchLocal.PluginOptions,
    ],
  ],

};

export default config;
