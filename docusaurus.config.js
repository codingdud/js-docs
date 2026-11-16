// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'JavaScript Handbook',
  tagline: 'From fundamentals to interview-ready — notes, code and gotchas',
  favicon: 'img/favicon.svg',

  future: { v4: true },

  url: 'https://codingdud.github.io',
  baseUrl: '/js-docs/',

  organizationName: 'codingdud',
  projectName: 'js-docs',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: { onBrokenMarkdownLinks: 'warn' },
    mermaid: true,
  },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          showLastUpdateTime: false,
          editUrl: 'https://github.com/codingdud/js-docs/tree/main/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { respectPrefersColorScheme: true },
      docs: { sidebar: { hideable: true, autoCollapseCategories: true } },
      navbar: {
        title: 'JavaScript Handbook',
        logo: { alt: 'JS', src: 'img/favicon.svg' },
        items: [
          { type: 'docSidebar', sidebarId: 'jsSidebar', position: 'left', label: 'Docs' },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `JavaScript Handbook · Built with Docusaurus`,
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'json', 'typescript'],
      },
    }),
};

export default config;
