# `langfuse` profile Specification

## Purpose

Docker Composeの`langfuse` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: langfuse profileの提供範囲

`langfuse` profileは`langfuse-web`、`langfuse-worker`、`langfuse-postgres`、`langfuse-clickhouse`、`langfuse-valkey`、`langfuse-rustfs`、`langfuse-rustfs-bucket-init`を対象とし、LLM traceの受信、保存、分析、Web UIとbackground処理を提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`langfuse` profileを選択してCompose設定を解決する
- **THEN** `langfuse-web`、`langfuse-worker`、`langfuse-postgres`、`langfuse-clickhouse`、`langfuse-valkey`、`langfuse-rustfs`、`langfuse-rustfs-bucket-init`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: langfuse profileの公開境界

`langfuse` profileは、Langfuse WebをhostのTCP port `35100`、RustFSを`35102`と`35103`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: langfuse profileの連携

`langfuse` profileは、初期projectとobject storage bucketを冪等に作成し、LiteLLMが指定keyでtraceを送信できる状態にするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

