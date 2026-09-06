import type { Config } from "@docusaurus/types";
import type { Options, ThemeConfig } from "@docusaurus/preset-classic";

const deploymentUrl = new URL(
  process.env.DOCUSAURUS_SITE_URL ?? "http://localhost:3000/",
);
const baseUrl = deploymentUrl.pathname.endsWith("/")
  ? deploymentUrl.pathname
  : `${deploymentUrl.pathname}/`;

const config: Config = {
  title: "InferLab",
  tagline: "OpenSpecと運用文書",
  url: deploymentUrl.origin,
  baseUrl,
  trailingSlash: true,
  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  organizationName: "k5-mot",
  projectName: "inferlab",
  presets: [
    [
      "classic",
      {
        docs: {
          path: ".generated-content/openspec",
          routeBasePath: "/",
          sidebarPath: "./sidebars-openspec.ts",
          showLastUpdateTime: true,
        },
        blog: false,
      } satisfies Options,
    ],
  ],
  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "docs",
        path: ".generated-content/general",
        routeBasePath: "docs",
        sidebarPath: "./sidebars-docs.ts",
        showLastUpdateTime: true,
      },
    ],
  ],
  themeConfig: {
    navbar: {
      items: [
        {
          type: "docSidebar",
          sidebarId: "openspecSidebar",
          label: "OpenSpec",
          position: "left",
        },
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          docsPluginId: "docs",
          label: "Docs",
          position: "left",
        },
      ],
    },
    footer: {
      style: "dark",
      copyright: `Copyright © ${new Date().getFullYear()} InferLab`,
    },
  } satisfies ThemeConfig,
};

export default config;
