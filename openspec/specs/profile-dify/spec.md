# `dify` profile Specification

## Purpose

Docker Composeの`dify` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: dify profileの提供範囲

`dify` profileは`dify-api`、`dify-worker`、`dify-worker-beat`、`dify-web`、`dify-plugin-daemon`、`dify-sandbox`、`dify-local-sandbox`、`dify-agent-backend`、`dify-postgres`、`dify-postgres-init`、`dify-qdrant`、`dify-rustfs`、`dify-rustfs-bucket-init`、`dify-valkey`、`dify-nginx`、`pypiserver`を対象とし、DifyのWeb、API、worker、plugin、sandbox、database、vector store、object storageを閉域運用向けに提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`dify` profileを選択してCompose設定を解決する
- **THEN** `dify-api`、`dify-worker`、`dify-worker-beat`、`dify-web`、`dify-plugin-daemon`、`dify-sandbox`、`dify-local-sandbox`、`dify-agent-backend`、`dify-postgres`、`dify-postgres-init`、`dify-qdrant`、`dify-rustfs`、`dify-rustfs-bucket-init`、`dify-valkey`、`dify-nginx`、`pypiserver`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: dify profileの公開境界

`dify` profileは、Difyの公開入口をhostのTCP port `32100`、RustFSを`32102`と`32103`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: dify profileの連携

`dify` profileは、plugin daemonは外部PyPIへfallbackせず、`pypiserver`から事前取得済みPython packageを利用するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

