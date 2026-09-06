# 仕様サイト Specification

## Purpose

OpenSpecの現行仕様を正規本文としてHTML化し、関連するADRと既存READMEへの導線を持つ仕様サイトのbuildおよび公開契約を定めます。

## Requirements

### Requirement: 正規文書からの静的site生成

仕様サイトは、`openspec/specs`の現行仕様をbuild専用のgit非追跡directoryへ機械的に同期し、Docusaurusで静的HTMLへbuildするものとする（MUST）。

#### Scenario: 仕様サイトをbuildする

- **WHEN** contributorがrepositoryの依存packageを導入してdocs buildを実行する
- **THEN** すべてのprofile仕様、共有platform仕様およびprofile以外の現行仕様がsiteへ含まれる
- **THEN** build用contentは正規文書から毎回作り直され、手編集またはrepositoryへのcommitを許可しない

### Requirement: 関連文書への導線

仕様サイトは、現行仕様に加えてrepositoryのADR、運用文書および既存READMEを同じsite内から参照可能にするものとする（MUST）。

#### Scenario: 実装詳細を調べる

- **WHEN** 利用者が仕様siteのnavigationを開く
- **THEN** ADR、manual、troubleshooting、research、ruleおよび各componentのREADMEへ移動できる
- **THEN** 現行仕様と補足文書の区分をnavigation上で識別できる

### Requirement: Pull Requestでの検証

仕様サイトは、GitHub Pull RequestおよびGitLab Merge RequestでOpenSpec strict validationとDocusaurus buildを実行するものとする（MUST）。

#### Scenario: 文書変更をreviewする

- **WHEN** Pull RequestまたはMerge Requestのpipelineが実行される
- **THEN** OpenSpecの不正な構造、MDX errorまたはsidebarの不正な参照がpipelineを失敗させる
- **THEN** review用pipelineはPages deploymentを変更しない

### Requirement: mainからのPages公開

仕様サイトは、`main`へのpush時にGitHub Pagesへ公開し、GitLab repositoryへmirrorまたはpushされた場合はGitLab Pagesへも公開するものとする（MUST）。

#### Scenario: mainへ変更を統合する

- **WHEN** docs buildが`main` pipelineで成功する
- **THEN** pipeline固有のsite URLとbase pathを使って静的artifactを生成する
- **THEN** 対応するPages serviceがそのartifactを公開する

### Requirement: hosting pathへの適応

仕様サイトは、local preview、GitHub project PagesおよびGitLab Pagesで異なるbase pathを環境変数から解決するものとする（MUST）。

#### Scenario: CI providerが公開URLを指定する

- **WHEN** build時に公開先の完全なURLが指定される
- **THEN** Docusaurusはそのoriginとpathnameをsite URLおよびbase URLとして使用する
- **THEN** navigationと静的assetのlinkが公開path配下で解決する
