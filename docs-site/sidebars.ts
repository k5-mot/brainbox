import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const profileSpecifications = [
  'openspec/specs/profile-aion/spec',
  'openspec/specs/profile-cloudflareos/spec',
  'openspec/specs/profile-common/spec',
  'openspec/specs/profile-dify/spec',
  'openspec/specs/profile-gitlab/spec',
  'openspec/specs/profile-hermes-agent/spec',
  'openspec/specs/profile-inference/spec',
  'openspec/specs/profile-inference-tei/spec',
  'openspec/specs/profile-kaneo/spec',
  'openspec/specs/profile-keycloak/spec',
  'openspec/specs/profile-langfuse/spec',
  'openspec/specs/profile-llmwiki/spec',
  'openspec/specs/profile-nextcloud/spec',
  'openspec/specs/profile-o11y/spec',
  'openspec/specs/profile-o11y-gpu/spec',
  'openspec/specs/profile-obsidian/spec',
  'openspec/specs/profile-octos/spec',
  'openspec/specs/profile-openclaw/spec',
  'openspec/specs/profile-openkb/spec',
  'openspec/specs/profile-owui/spec',
  'openspec/specs/profile-pubnet/spec',
  'openspec/specs/profile-qwenpaw/spec',
  'openspec/specs/profile-rag/spec',
  'openspec/specs/profile-ragflow/spec',
  'openspec/specs/profile-registry/spec',
  'openspec/specs/profile-translate/spec',
  'openspec/specs/profile-xwiki/spec',
  'openspec/specs/profile-zulip/spec',
];

const componentReadmes = [
  'README',
  'keycloak/README',
  'inference/README',
  'rag/README',
  'registry/README',
  'translate/README',
  'owui/README',
  'dify/README',
  'ragflow/README',
  'cloudflareos/README',
  'octos/README',
  'aion/README',
  'nextcloud/README',
  'xwiki/README',
  'zulip/README',
  'gitlab/README',
  'llmwiki/README',
  'o11y/README',
  'langfuse/README',
  'scripts/README',
];

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'OpenSpec 現行仕様',
      collapsed: false,
      items: [
        'openspec/specs/shared-platform/spec',
        {
          type: 'category',
          label: 'Compose profiles',
          items: profileSpecifications,
        },
        'openspec/specs/offline-asset-download/spec',
        'openspec/specs/specification-site/spec',
      ],
    },
    {
      type: 'category',
      label: 'ADR',
      items: ['docs/adr/docusaurusによる現行仕様の公開'],
    },
    {
      type: 'category',
      label: '運用manual',
      items: [
        'docs/manual/DIFY_AIRGAP',
        'docs/manual/DOWNLOAD',
        'docs/manual/INITIAL_SETUP',
        'docs/manual/REGISTRY',
        'docs/manual/TEST',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'docs/troubleshooting/OPENWEBUI_DOCLING_LOAD',
        'docs/troubleshooting/TEI_RESOURCE_EXHAUSTION',
      ],
    },
    {
      type: 'category',
      label: '調査記録',
      items: [
        'docs/research/CONTAINER_ALIGNMENT_2026-08-21',
        'docs/research/CONTAINER_IMAGE_VERSIONS_2026-08-21',
        'docs/research/DIFY_AIRGAP_PLUGINS_2026-08-24',
        'docs/research/DOCLING_BIND_MOUNT_2026-08-24',
        'docs/research/LLMWIKI_COUCHDB_2026-08-25',
        'docs/research/OIKB_SEQUENTIAL_SYNC_API_2026-09-01',
        'docs/research/WIKIJS_RETIRED_2026-08-29',
        'docs/research/XWIKI_DOCKER_COMPOSE_2026-08-24',
        'docs/research/XWIKI_KEYCLOAK_OIDC_2026-08-25',
      ],
    },
    {
      type: 'category',
      label: 'Project rule',
      items: ['docs/rules/CODING_RULES', 'docs/rules/CONTRIBUTING'],
    },
    {
      type: 'category',
      label: 'README',
      items: componentReadmes,
    },
  ],
};

export default sidebars;
