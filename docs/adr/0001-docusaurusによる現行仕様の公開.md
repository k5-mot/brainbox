# ADR-0001: Docusaurusによる現行仕様の公開

## Status

Superseded by [ADR-0002](0002-openspecと補足文書の分離.md)

## Context

OpenSpecの現行仕様はrepository内のMarkdownが正規本文である一方、利用者がprofile間を横断して閲覧するHTMLの入口がありませんでした。HTML用に文書を複製すると、正規本文との同期漏れが発生します。また、このrepositoryはGitHubを主remoteとしつつ、self-hosted GitLabへmirrorして運用できる構成を持つため、両方のPagesへ同じ生成物を公開できる必要があります。

## Decision

Docusaurusのdocs pluginは、repository rootの`openspec/specs`、`docs`および既存READMEからbuild直前に作り直すgit非追跡contentを読み込みます。site generatorが稼働中serviceのstateやsecretを走査しないよう、公開対象のMarkdownだけをstageします。生成contentは手編集せず、正規本文として扱いません。1つのnavigation内で現行仕様を先頭に置き、ADR、運用文書、調査記録、rule、READMEは補足文書として区分します。

Pull RequestとMerge RequestではOpenSpec strict validationと静的site buildだけを行います。`main`ではGitHub Actionsの公式Pages artifactをGitHub Pagesへdeployし、GitLab CI/CDでは`pages.publish`で同じbuild directoryをGitLab Pagesへ公開します。公開URLはCI providerからbuild時に注入し、Docusaurusの`url`と`baseUrl`へ分解します。

## Consequences

仕様変更は正規のOpenSpecだけへ行えばHTMLへ反映され、手作業による複製文書の同期が不要になります。既存README内の相対linkも同一siteで扱えます。新しいREADME directoryを公開対象へ加える場合はstaging scriptとsidebarにも追加が必要です。一方、repository内MarkdownがMDXとして解釈可能であることがbuild条件になり、壊れたlinkやMDX構文はCIで検出されます。GitLab Pagesへの実deployは、このrepositoryがGitLabへmirrorまたはpushされてpipelineが動作した時点で行われます。

## References

- [Docusaurus: Deployment](https://docusaurus.io/docs/deployment)
- [GitHub Docs: Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitLab Docs: GitLab Pages](https://docs.gitlab.com/user/project/pages/)
