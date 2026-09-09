# `sage-wiki` profile Specification

## Purpose

Docker Composeの`sage-wiki` profileが提供する初期化、CouchDB ingest、知識コンパイル、検索、Web UI、APIおよびMCPの公開境界を定めます。

## Requirements

### Requirement: sage-wiki profileの提供範囲

`sage-wiki` profileは`couchdb`、`sage-wiki-init`、`sage-wiki-couchdb-init`、`sage-wiki-ingester`および`sage-wiki`を対象とし、初期化と初回ingestの正常終了後に長期稼働serviceを起動するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`sage-wiki` profileを選択してCompose設定を解決する
- **THEN** CouchDB、初期化、初回ingest、継続ingestおよび内蔵compilerを持つ公開serviceがprofileの対象として含まれる
- **THEN** 長期稼働serviceは初期化と初回ingestの正常終了を待って起動する
- **THEN** 各長期稼働serviceはhealthcheckによって正常性を判定できる

### Requirement: CouchDB LiveSync dataのingest

`sage-wiki` profileは、CouchDB `obsidian` databaseのLiveSync Markdownを初回起動時と6時間ごとに`sources/`へsnapshot同期するものとする（MUST）。

#### Scenario: CouchDBから初回sourceを生成する

- **WHEN** CouchDBがhealthyで有効なcredentialを使用できる
- **THEN** 非削除Markdown親documentの本文が`children`順に復元される
- **THEN** 対象documentが`sources/`のMarkdown fileとして保存される
- **THEN** 初回ingestの正常終了後にSage Wikiの内蔵compilerが起動する

#### Scenario: CouchDBのsourceが更新される

- **WHEN** 6時間ごとのingestがsource差分を反映する
- **THEN** Sage Wikiの内蔵compilerは`sources/`の変更を検知して生成Wikiとindexを更新する

### Requirement: sage-wiki profileの公開境界

`sage-wiki` profileはWeb UI、REST APIおよびMCPをhostのTCP port `34200`で公開するものとする（MUST）。

#### Scenario: 利用者またはclientが接続する

- **WHEN** `sage-wiki`がhealth判定に成功する
- **THEN** 定義された公開境界からWeb UIとAPIへ接続できる
- **THEN** 未定義のhost portを追加で公開しない
- **THEN** 非loopback accessはBearer tokenと許可hostで保護される

### Requirement: LiteLLMとの連携

`sage-wiki` profileは、生成処理とembedding処理をcredential参照を介してLiteLLMへ送信するものとする（MUST）。

#### Scenario: sourceをcompileする

- **WHEN** LiteLLMと必要なmodelが利用可能である
- **THEN** 生成処理は`openai/gpt-oss:20b`を使用する
- **THEN** embedding処理は`Qwen/Qwen3-Embedding:0.6B`を使用する
- **THEN** credentialの実値をrepositoryへ保存しない

### Requirement: project dataの永続化

`sage-wiki` profileは、source、生成Wiki、indexおよび監査eventを`sage-wiki-project` named volumeへ保存するものとする（MUST）。

#### Scenario: containerを再作成する

- **WHEN** 運用者が`sage-wiki` containerを再作成する
- **THEN** 初期化serviceは既存設定を保持する
- **THEN** project dataはcontainer lifecycleから独立して保持される

## References

- [Sage Wiki Self-Hosted Server](https://github.com/xoai/sage-wiki/blob/v0.2.10/docs/guides/self-hosted-server.md)
