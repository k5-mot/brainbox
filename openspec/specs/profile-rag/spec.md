# `rag` profile Specification

## Purpose

Docker Composeの`rag` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: rag profileの提供範囲

`rag` profileは`docling`、`qdrant`を対象とし、文書変換API/UIとvector search databaseを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`rag` profileを選択してCompose設定を解決する
- **THEN** `docling`、`qdrant`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: rag profileの公開境界

`rag` profileは、DoclingをhostのTCP port `31100`で公開し、Qdrantは`internal-nw`内だけで提供するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: rag profileの連携

`rag` profileは、DoclingとQdrantはそれぞれAPI keyを要求し、事前配置したmodelとTesseract dataをread-onlyで利用するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

