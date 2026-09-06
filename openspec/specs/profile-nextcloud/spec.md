# `nextcloud` profile Specification

## Purpose

Docker Composeの`nextcloud` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: nextcloud profileの提供範囲

`nextcloud` profileは`nextcloud`、`nextcloud-postgres`、`nextcloud-valkey`を対象とし、file保存、共有、Web UIと永続database/cacheを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`nextcloud` profileを選択してCompose設定を解決する
- **THEN** `nextcloud`、`nextcloud-postgres`、`nextcloud-valkey`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: nextcloud profileの公開境界

`nextcloud` profileは、NextcloudをhostのTCP port `33000`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: nextcloud profileの連携

`nextcloud` profileは、起動時scriptでKeycloak OIDC provider、logout、claim mapping、group provisioningを同期するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

