# `registry` profile Specification

## Purpose

Docker Composeの`registry` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: registry profileの提供範囲

`registry` profileは`pypiserver`、`verdaccio`、`code-marketplace`、`code-marketplace-importer`、`npm-importer`、`createrepo_c`、`rpm-dist`、`reprepro`、`deb-dist`、`docker-registry`を対象とし、Python、npm、VS Code extension、RPM、DEB、container imageの閉域registryを提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`registry` profileを選択してCompose設定を解決する
- **THEN** `pypiserver`、`verdaccio`、`code-marketplace`、`code-marketplace-importer`、`npm-importer`、`createrepo_c`、`rpm-dist`、`reprepro`、`deb-dist`、`docker-registry`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: registry profileの公開境界

`registry` profileは、registry群をhostのTCP port `31200`から`31205`で公開するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: registry profileの連携

`registry` profileは、事前取得済み資材を冪等に同期し、PyPIは未登録packageを外部indexへfallbackしないものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

