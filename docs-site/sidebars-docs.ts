import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const componentReadmes = [
  "README",
  "keycloak/README",
  "inference/README",
  "rag/README",
  "registry/README",
  "translate/README",
  "owui/README",
  "dify/README",
  "ragflow/README",
  "cloudflareos/README",
  "octos/README",
  "aion/README",
  "nextcloud/README",
  "xwiki/README",
  "zulip/README",
  "gitlab/README",
  "llmwiki/README",
  "o11y/README",
  "langfuse/README",
  "scripts/README",
];

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "category",
      label: "ADR",
      items: [
        "docs/adr/docusaurusによる現行仕様の公開",
        "docs/adr/openspecと補足文書の分離",
      ],
    },
    {
      type: "category",
      label: "運用manual",
      items: [
        "docs/manual/DIFY_AIRGAP",
        "docs/manual/DOWNLOAD",
        "docs/manual/INITIAL_SETUP",
        "docs/manual/REGISTRY",
        "docs/manual/TEST",
      ],
    },
    {
      type: "category",
      label: "Troubleshooting",
      items: [
        "docs/troubleshooting/OPENWEBUI_DOCLING_LOAD",
        "docs/troubleshooting/TEI_RESOURCE_EXHAUSTION",
      ],
    },
    {
      type: "category",
      label: "調査記録",
      items: [
        "docs/research/CONTAINER_ALIGNMENT_2026-08-21",
        "docs/research/CONTAINER_IMAGE_VERSIONS_2026-08-21",
        "docs/research/DIFY_AIRGAP_PLUGINS_2026-08-24",
        "docs/research/DOCLING_BIND_MOUNT_2026-08-24",
        "docs/research/LLMWIKI_COUCHDB_2026-08-25",
        "docs/research/OIKB_SEQUENTIAL_SYNC_API_2026-09-01",
        "docs/research/WIKIJS_RETIRED_2026-08-29",
        "docs/research/XWIKI_DOCKER_COMPOSE_2026-08-24",
        "docs/research/XWIKI_KEYCLOAK_OIDC_2026-08-25",
      ],
    },
    {
      type: "category",
      label: "Project rule",
      items: ["docs/rules/CODING_RULES", "docs/rules/CONTRIBUTING"],
    },
    {
      type: "category",
      label: "README",
      items: componentReadmes,
    },
  ],
};

export default sidebars;
