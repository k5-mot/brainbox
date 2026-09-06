# `common` profile Specification

## Purpose

Docker Composeの`common` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: common profileの提供範囲

`common` profileは`homepage`、`whoami`を対象とし、各serviceへの入口となるdashboardとHTTP request echo endpointを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`common` profileを選択してCompose設定を解決する
- **THEN** `homepage`、`whoami`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: common profileの公開境界

`common` profileは、HomepageをhostのTCP port `30000`、whoamiを`30003`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: common profileの連携

`common` profileは、HomepageはCompose labelを検出し、repository内のlocal iconと構成図を外部配信元なしで表示するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

