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

### Requirement: Dify固有認証

`dify` profileはDify自身のemailとpasswordによる認証を使用し、外部Identity Providerへ認証を委譲しないものとする（MUST）。productionの初期セットアップは既定値`admin`ではない`DIFY_INIT_PASSWORD`を使用するものとする（MUST）。

#### Scenario: 初期管理者を作成する

- **WHEN** 運用者がproductionの初期セットアップを実行する
- **THEN** 環境固有の`DIFY_INIT_PASSWORD`で初期gateを通過できる
- **THEN** 管理者はDify固有のaccountとして作成される
- **THEN** 外部Identity Providerの画面へredirectされない

### Requirement: 閉域実行のnetwork境界

`dify` profileをair-gap環境で使用する場合、実行時に必要なcontainer image、Dify pluginおよびpluginのPython packageは事前取得し、network境界でInternet向けegressを拒否するものとする（MUST）。Composeの外部endpoint無効化だけをnetwork境界の代替としてはならない（MUST NOT）。

#### Scenario: air-gap環境でworkflowを実行する

- **WHEN** 運用者が事前取得済み資材で`dify` profileを起動する
- **THEN** Difyの長期稼働serviceがexternal package registryへ接続せず起動する
- **THEN** Marketplace、update確認、telemetry、remote template、sandbox外部networkおよびpublic DNSが無効になる
- **THEN** Internet向けegressはComposeの外側のnetwork境界でも拒否される

### Requirement: workflowの接続先制約

air-gap環境では、DifyのHTTP node、導入pluginおよび利用者が指定するURLを内部networkの宛先に限定するものとする（MUST）。Composeは利用者がworkflowに入力する任意のURLを自動検証しないものとする（MUST NOT）。

#### Scenario: workflowにURLを設定する

- **WHEN** 利用者がHTTP nodeまたはpluginに接続先URLを設定する
- **THEN** 運用者は内部networkの宛先だけを許可する
- **THEN** 任意URLを自動制限する機能がComposeにあるとみなさない

### Requirement: 固定pluginの閉域導入

`dify` profileは、署名付き`langgenius/openai_api_compatible` plugin `0.0.64`を固定し、packageと内包requirementsのSHA-256を`plugins.lock.json`で検証するものとする（MUST）。plugin daemonは外部PyPIへfallbackせず、`pypiserver`から事前取得済みPython packageを利用するものとする（MUST）。

#### Scenario: pluginをlocal packageから導入する

- **WHEN** 運用者がchecksum検証済みのplugin packageを導入する
- **THEN** plugin署名検証を無効にせず導入が完了する
- **THEN** plugin daemonは`http://pypiserver:8080/simple/`だけから依存packageを解決する
- **THEN** packageまたはrequirementsのchecksumがlockと異なる場合は導入しない

### Requirement: LiteLLMとのOpenAI-compatible連携

`dify` profileは、固定pluginのLLM、EmbeddingおよびRerankの接続先として内部LiteLLMの`http://litellm:4000/v1`を使用できるものとする（MUST）。credentialには実行時に注入した`LITELLM_MASTER_KEY`を使用し、repositoryへ実値を保存しないものとする（MUST）。

#### Scenario: LiteLLM modelを登録する

- **WHEN** 運用者がOpenAI-compatible pluginにLiteLLMのendpoint、credentialおよびmodel名を設定する
- **THEN** LiteLLMの内部APIでcredential検証とmodel呼出しが成功する
- **THEN** API versionを付加するmodel typeで`/v1`が重複しない
