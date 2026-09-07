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

### Requirement: Doclingの閉域資材

`rag` profileは、Docling modelをhostの`/srv/docling`、Tesseract dataを`/srv/docling/tesseract`からread-onlyで利用し、Hugging FaceとTransformersをoffline modeにするものとする（MUST）。Doclingは起動時に事前配置modelをloadし、実行時に不足資材をdownloadしてはならない（MUST NOT）。

#### Scenario: 事前配置資材でDoclingを起動する

- **WHEN** `eng`、`jpn`、`jpn_vert`、`osd`および日本語scriptを含むTesseract dataとDocling modelを配置して`rag` profileを起動する
- **THEN** Containerは事前配置資材を変更せずmodelをloadする
- **THEN** Doclingのreadiness endpointが成功する

#### Scenario: 必須資材が不足している

- **WHEN** model directoryまたは必須Tesseract dataが存在しない状態でDoclingを起動する
- **THEN** 不足資材をInternetからdownloadしない
- **THEN** 起動またはreadiness判定が失敗し、資材不足を運用者が検出できる
