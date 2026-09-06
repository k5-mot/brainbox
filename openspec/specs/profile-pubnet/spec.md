# `pubnet` profile Specification

## Purpose

Docker Composeの`pubnet` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: pubnet profileの提供範囲

`pubnet` profileは`cloudflare`を対象とし、Cloudflare Tunnelを通じたoutbound型の外部公開経路を提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`pubnet` profileを選択してCompose設定を解決する
- **THEN** `cloudflare`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: pubnet profileの公開境界

`pubnet` profileは、hostへapplication portを追加公開せず、cloudflaredが外部へ確立するtunnelを利用するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: pubnet profileの連携

`pubnet` profileは、環境変数で参照したtunnel tokenを使用し、metrics readinessが成功する状態にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

