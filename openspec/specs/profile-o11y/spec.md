# `o11y` profile Specification

## Purpose

Docker Composeの`o11y` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: o11y profileの提供範囲

`o11y` profileは`grafana`、`prometheus`、`node-exporter`、`cadvisor`、`blackbox-exporter`を対象とし、host、container、service endpoint、LLM gatewayのmetrics収集とdashboard表示を提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`o11y` profileを選択してCompose設定を解決する
- **THEN** `grafana`、`prometheus`、`node-exporter`、`cadvisor`、`blackbox-exporter`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: o11y profileの公開境界

`o11y` profileは、GrafanaをhostのTCP port `35000`、Prometheusを`35001`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: o11y profileの連携

`o11y` profileは、GrafanaはKeycloak OIDCで認証し、Prometheusはrepositoryへsecretを保存せず実行時にcredentialを注入するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

