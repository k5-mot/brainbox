# `owui` profile Specification

## Purpose

Docker Composeの`owui` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: owui profileの提供範囲

`owui` profileは`open-webui`、`oikb`、`oikb-rustfs`、`oikb-rustfs-init`、`searxng`、`open-terminal`、`mcpo`、`libretranslate`を対象とし、AI chat、検索、翻訳、terminal、MCP、Knowledge Base同期を統合したWeb UIを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`owui` profileを選択してCompose設定を解決する
- **THEN** `open-webui`、`oikb`、`oikb-rustfs`、`oikb-rustfs-init`、`searxng`、`open-terminal`、`mcpo`、`libretranslate`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: owui profileの公開境界

`owui` profileは、Open WebUIをhostのTCP port `32000`、support serviceを`32001`から`32006`、LibreTranslateを`31300`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: owui profileの連携

`owui` profileは、LibreTranslateをOpenAPI toolとして登録し、mcpo経由でLLM Wikiのstdio MCPをOpenAPIとして利用可能にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

