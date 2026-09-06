# `xwiki` profile Specification

## Purpose

Docker Composeの`xwiki` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: xwiki profileの提供範囲

`xwiki` profileは`xwiki`、`xwiki-postgres`を対象とし、XWiki Web application、永続database、Keycloak OIDC loginを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`xwiki` profileを選択してCompose設定を解決する
- **THEN** `xwiki`、`xwiki-postgres`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: xwiki profileの公開境界

`xwiki` profileは、XWikiをhostのTCP port `33100`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: xwiki profileの連携

`xwiki` profileは、OIDC Authenticator導入後はKeycloak `prod` realmへredirectし、障害時はlocal認証へrollback可能にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

