# `gitlab` profile Specification

## Purpose

Docker Composeの`gitlab` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: gitlab profileの提供範囲

`gitlab` profileは`gitlab`、`gitlab-runner-register`、`gitlab-runner`を対象とし、Git repository、Web UI、SSH、Keycloak OIDC login、任意登録のCI runnerを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`gitlab` profileを選択してCompose設定を解決する
- **THEN** `gitlab`、`gitlab-runner-register`、`gitlab-runner`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: gitlab profileの公開境界

`gitlab` profileは、GitLab HTTPをhostのTCP port `33400`、SSHを`33422`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: gitlab profileの連携

`gitlab` profileは、runner tokenが設定された場合だけrunnerを登録し、未設定の場合は登録処理を安全にskipするものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

