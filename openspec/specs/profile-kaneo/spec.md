# `kaneo` profile Specification

## Purpose

Docker Composeの`kaneo` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: kaneo profileの提供範囲

`kaneo` profileは`kaneo`、`kaneo-postgres`を対象とし、project管理Web applicationと永続databaseを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`kaneo` profileを選択してCompose設定を解決する
- **THEN** `kaneo`、`kaneo-postgres`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: kaneo profileの公開境界

`kaneo` profileは、KaneoをhostのTCP port `33200`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: kaneo profileの連携

`kaneo` profileは、Keycloak OIDC discoveryを利用し、passwordによる新規登録を無効化するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

