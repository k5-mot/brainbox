# `qwenpaw` profile Specification

## Purpose

Docker Composeの`qwenpaw` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: qwenpaw profileの提供範囲

`qwenpaw` profileは`qwenpaw`、`qwenpaw-init`を対象とし、QwenPawのConsole、Discord channel、persona、sessionを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`qwenpaw` profileを選択してCompose設定を解決する
- **THEN** `qwenpaw`、`qwenpaw-init`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: qwenpaw profileの公開境界

`qwenpaw` profileは、QwenPaw ConsoleをhostのTCP port `31003`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: qwenpaw profileの連携

`qwenpaw` profileは、3つの基盤modelをLiteLLM providerへ設定し、requestをQwenPaw識別tag付きでLangfuseへ記録するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

