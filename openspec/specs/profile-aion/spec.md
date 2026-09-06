# `aion` profile Specification

## Purpose

Docker Composeの`aion` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: aion profileの提供範囲

`aion` profileは`aion`を対象とし、AionUiのstandalone WebUI、管理者login、会話とagent workspaceを提供し、推論をLiteLLMへ集約するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`aion` profileを選択してCompose設定を解決する
- **THEN** `aion`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: aion profileの公開境界

`aion` profileは、WebUIをhostのTCP port `32700`で公開し、信頼できるLANの外へ直接公開しないものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: aion profileの連携

`aion` profileは、`aion`は`inferlab-litellm` providerを起動時に同期し、LiteLLMのmodel一覧とprovider healthを確認できなければならないものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

