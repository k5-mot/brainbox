import type {Config} from '@docusaurus/types';
import type {Options, ThemeConfig} from '@docusaurus/preset-classic';

const deploymentUrl = new URL(
  process.env.DOCUSAURUS_SITE_URL ?? 'http://localhost:3000/',
);
const baseUrl = deploymentUrl.pathname.endsWith('/')
  ? deploymentUrl.pathname
  : `${deploymentUrl.pathname}/`;

const config: Config = {
  title: 'InferLab 仕様サイト',
  tagline: 'OpenSpecを正規本文とするprofile別の現行仕様',
  url: deploymentUrl.origin,
  baseUrl,
  trailingSlash: true,
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'throw',
  organizationName: 'k5-mot',
  projectName: 'inferlab',
  presets: [
    [
      'classic',
      {
        docs: {
          path: '.generated-content',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: true,
        },
        blog: false,
      } satisfies Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'InferLab 仕様サイト',
      items: [
        {
          to: '/docs/openspec/specs/shared-platform/spec',
          label: '現行仕様',
          position: 'left',
        },
        {
          to: '/docs/docs/adr/docusaurusによる現行仕様の公開',
          label: 'ADR',
          position: 'left',
        },
        {
          href: 'https://github.com/k5-mot/inferlab',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} InferLab`,
    },
  } satisfies ThemeConfig,
};

export default config;
