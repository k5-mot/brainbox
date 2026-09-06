# `ragflow` profile Specification

## Purpose

Docker Composeの`ragflow` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: ragflow profileの提供範囲

`ragflow` profileは`ragflow`、`ragflow-mysql`、`ragflow-opensearch`、`ragflow-rustfs`、`ragflow-rustfs-bucket-init`、`ragflow-valkey`を対象とし、RAGFlowのWeb/API、検索、database、cache、object storageを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`ragflow` profileを選択してCompose設定を解決する
- **THEN** `ragflow`、`ragflow-mysql`、`ragflow-opensearch`、`ragflow-rustfs`、`ragflow-rustfs-bucket-init`、`ragflow-valkey`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: ragflow profileの公開境界

`ragflow` profileは、RAGFlowをhostのTCP port `32200`と`32201`、RustFSを`32202`と`32203`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: ragflow profileの連携

`ragflow` profileは、依存serviceのhealthとbucket初期化完了後にRAGFlowを起動するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

