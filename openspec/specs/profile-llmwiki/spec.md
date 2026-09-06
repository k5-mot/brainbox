# `llmwiki` profile Specification

## Purpose

Docker Composeの`llmwiki` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: llmwiki profileの提供範囲

`llmwiki` profileは`llmwiki`、`llmwiki-ingester`、`couchdb`を対象とし、source取り込み、知識コンパイル、read-only viewer、stdio MCPを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`llmwiki` profileを選択してCompose設定を解決する
- **THEN** `llmwiki`、`llmwiki-ingester`、`couchdb`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: llmwiki profileの公開境界

`llmwiki` profileは、LLM Wiki viewer/APIをhostのTCP port `34100`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: llmwiki profileの連携

`llmwiki` profileは、IngesterはCouchDB snapshotをsourceへ変換し、LLM処理はcredential参照を介してLiteLLMを利用するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

