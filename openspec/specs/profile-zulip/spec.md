# `zulip` profile Specification

## Purpose

Docker Composeの`zulip` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: zulip profileの提供範囲

`zulip` profileは`zulip`、`zulip-postgres`、`zulip-memcached`、`zulip-rabbitmq`、`zulip-redis`を対象とし、team chat、永続database、cache、message broker、Keycloak OIDC loginを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`zulip` profileを選択してCompose設定を解決する
- **THEN** `zulip`、`zulip-postgres`、`zulip-memcached`、`zulip-rabbitmq`、`zulip-redis`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: zulip profileの公開境界

`zulip` profileは、Zulip HTTPSをhostのTCP port `33300`、HTTPを`33302`、SMTPを`33325`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: zulip profileの連携

`zulip` profileは、初期realmと管理者を作成し、Keycloak OIDC providerを有効にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

