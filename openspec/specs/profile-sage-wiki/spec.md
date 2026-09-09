# `sage-wiki` profile Specification

## Purpose

Docker Composeの`sage-wiki` profileが提供する初期化、知識コンパイル、検索、Web UI、APIおよびMCPの公開境界を定めます。

## Requirements

### Requirement: sage-wiki profileの提供範囲

`sage-wiki` profileは`sage-wiki-init`と`sage-wiki`を対象とし、初期化serviceの正常終了後に長期稼働serviceを起動するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`sage-wiki` profileを選択してCompose設定を解決する
- **THEN** `sage-wiki-init`と`sage-wiki`がprofileの対象serviceとして含まれる
- **THEN** `sage-wiki`は初期化の正常終了を待って起動する
- **THEN** `sage-wiki`はhealthcheckによって正常性を判定できる

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
