# `octos` profile Specification

## Purpose

Docker Composeの`octos` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: octos profileの提供範囲

`octos` profileは`octos`を対象とし、Octos Web、管理dashboard、agent workspace、sessionとmemoryを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`octos` profileを選択してCompose設定を解決する
- **THEN** `octos`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: octos profileの公開境界

`octos` profileは、Octos Webと管理dashboardをhostのTCP port `32600`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: octos profileの連携

`octos` profileは、primary modelをLiteLLMのOpenAI互換APIへ固定し、推論traceをLiteLLM経由でLangfuseへ送信するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

