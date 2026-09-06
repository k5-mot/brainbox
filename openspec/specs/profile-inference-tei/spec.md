# `inference-tei` profile Specification

## Purpose

Docker Composeの`inference-tei` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: inference-tei profileの提供範囲

`inference-tei` profileは`tei-embedding`、`tei-reranking`を対象とし、Text Embeddings Inferenceによるembeddingとrerankingの代替backendを内部networkへ提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`inference-tei` profileを選択してCompose設定を解決する
- **THEN** `tei-embedding`、`tei-reranking`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: inference-tei profileの公開境界

`inference-tei` profileは、TEI endpointをhostへ公開せず`internal-nw`内だけで提供するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: inference-tei profileの連携

`inference-tei` profileは、指定したHugging Face modelを読み込み、embeddingとrerankingのhealth endpointが成功する状態にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

