# `cloudflareos` profile Specification

## Purpose

Docker Composeの`cloudflareos` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: cloudflareos profileの提供範囲

`cloudflareos` profileは`cloudflare-os`を対象とし、Cloudflare OSのlocal runtime、workspace、Keycloak login、LiteLLM経由のAI modelを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`cloudflareos` profileを選択してCompose設定を解決する
- **THEN** `cloudflare-os`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: cloudflareos profileの公開境界

`cloudflareos` profileは、Web UIをhostのTCP port `32500`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: cloudflareos profileの連携

`cloudflareos` profileは、KeycloakのAuthorization Code + PKCEで認証し、推論requestをLiteLLMへ送り、そのtraceをLiteLLM経由でLangfuseへ送信するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

