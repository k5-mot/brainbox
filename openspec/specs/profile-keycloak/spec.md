# `keycloak` profile Specification

## Purpose

Docker Composeの`keycloak` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: keycloak profileの提供範囲

`keycloak` profileは`keycloak`、`keycloak-https`、`keycloak-config`、`keycloak-postgres`を対象とし、`prod` realm、user、group、各applicationのOIDC clientとHTTP/HTTPS issuerを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`keycloak` profileを選択してCompose設定を解決する
- **THEN** `keycloak`、`keycloak-https`、`keycloak-config`、`keycloak-postgres`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: keycloak profileの公開境界

`keycloak` profileは、HTTP issuerをhostのTCP port `30001`、HTTPS issuerを`30002`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: keycloak profileの連携

`keycloak` profileは、bootstrap realmの作成後に宣言設定を同期し、OIDC clientからdiscovery documentを取得可能にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

