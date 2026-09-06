# `openclaw` profile Specification

## Purpose

Docker Composeの`openclaw` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: openclaw profileの提供範囲

`openclaw` profileは`openclaw`、`openclaw-init`を対象とし、OpenClaw gateway、Web UI、Discord channel、永続workspaceを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`openclaw` profileを選択してCompose設定を解決する
- **THEN** `openclaw`、`openclaw-init`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: openclaw profileの公開境界

`openclaw` profileは、OpenClawをhostのTCP port `31002`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: openclaw profileの連携

`openclaw` profileは、初期化後にLiteLLMをproviderとして利用し、Langfuseへの送信をLiteLLMへ集約するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

