# 仕様サイト Specification

## Purpose

OpenSpecの現行仕様と変更履歴を運用文書から明確に分離してHTML化するsiteのbuildおよび公開契約を定めます。

## Requirements

### Requirement: 正規文書からの静的site生成

仕様サイトは、`openspec/specs`の現行仕様と`openspec/changes`の変更履歴をbuild専用のgit非追跡directoryへ機械的に同期し、Docusaurusで静的HTMLへbuildするものとする（MUST）。

#### Scenario: 仕様サイトをbuildする

- **WHEN** contributorがrepositoryの依存packageを導入してdocs buildを実行する
- **THEN** すべてのprofile仕様、共有platform仕様、profile以外の現行仕様、active changeおよびarchived changeがsiteへ含まれる
- **THEN** build用contentは正規文書から毎回作り直され、手編集またはrepositoryへのcommitを許可しない

### Requirement: OpenSpecとDocsの分離

仕様siteの主navigationは`OpenSpec`と`Docs`の2項目だけを提供するものとする（MUST）。`OpenSpec`は`openspec/`配下の現行仕様、変更提案、設計判断および調査証跡を含み、`Docs`はmanual、troubleshooting、project ruleおよび既存READMEを含むものとする（MUST）。

#### Scenario: 文書種別を選択する

- **WHEN** 利用者が仕様siteのnavigationを開く
- **THEN** `OpenSpec`と`Docs`の2項目が表示される
- **THEN** `OpenSpec`から現行仕様と変更履歴を参照できる
- **THEN** `Docs`から運用手順、障害復旧、project ruleおよびcomponent説明を参照できる

### Requirement: OpenSpec artifactの配置

変更理由と設計判断は対応するOpenSpec changeの`proposal.md`および`design.md`を正規本文とし、調査時点の詳細な証拠は同じchange内へ保存するものとする（MUST）。現行の観測可能な契約はmain spec、実行手順はmanualまたはREADMEだけを正規本文とするものとする（MUST）。

#### Scenario: 変更記録をarchiveする

- **WHEN** contributorが実装済み変更の設計判断と調査証跡を整理する
- **THEN** archived changeから変更理由、採用判断、現行specおよび詳細証跡を追跡できる
- **THEN** ADRまたは調査記録だけを`docs/`へ残さない

### Requirement: 独立したhome pageを持たない

仕様siteは専用のhome pageを生成せず、site rootで共有platform仕様を表示するものとする（MUST）。

#### Scenario: site rootを開く

- **WHEN** 利用者が仕様siteのroot URLを開く
- **THEN** 独立したlanding pageではなく共有platform仕様が表示される
- **THEN** `OpenSpec`のnavigationがactiveになる

### Requirement: 現行契約の正規化

利用者または運用者から観測可能な現行の能力、制約および期待結果はOpenSpecを正規本文とし、`docs/`またはREADMEだけに定義しないものとする（MUST）。

#### Scenario: 補足文書から現行契約を発見する

- **WHEN** contributorが`docs/`またはREADMEにのみ存在する現行契約を発見する
- **THEN** 対応するOpenSpecへRequirementとScenarioとして移行する
- **THEN** 移行完了を照合した後に補足文書側の重複する規範本文を削除する

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
