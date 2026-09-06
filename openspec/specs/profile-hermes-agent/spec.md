# `hermes-agent` profile Specification

## Purpose

Docker Composeの`hermes-agent` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: hermes-agent profileの提供範囲

`hermes-agent` profileは`hermes-agent`を対象とし、Hermes AgentのWeb/APIを提供し、model requestを既存LiteLLMへ送るものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`hermes-agent` profileを選択してCompose設定を解決する
- **THEN** `hermes-agent`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: hermes-agent profileの公開境界

`hermes-agent` profileは、Hermes AgentをhostのTCP port `31001`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: hermes-agent profileの連携

`hermes-agent` profileは、相関IDをLiteLLMのLangfuse連携headerへ変換し、観測情報の送信をLiteLLMへ集約するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

