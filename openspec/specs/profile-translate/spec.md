# `translate` profile Specification

## Purpose

Docker Composeの`translate` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: translate profileの提供範囲

`translate` profileは`libretranslate`を対象とし、事前配置済みの英語・日本語modelを使う機械翻訳HTTP APIを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`translate` profileを選択してCompose設定を解決する
- **THEN** `libretranslate`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: translate profileの公開境界

`translate` profileは、LibreTranslate APIをhostのTCP port `31300`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: translate profileの連携

`translate` profileは、container起動後のmodel downloadを無効化し、閉域環境で英日・日英翻訳を実行可能にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

