# `o11y-gpu` profile Specification

## Purpose

Docker Composeの`o11y-gpu` profileが利用者と運用者へ提供する能力、公開境界、依存関係、正常性の判定を現行コードに基づいて定めます。

## Requirements

### Requirement: o11y-gpu profileの提供範囲

`o11y-gpu` profileは`nvidia-dcgm-exporter`を対象とし、NVIDIA GPUのdevice metricsをPrometheusが収集できる形式で提供するものとする（MUST）。

#### Scenario: profileを選択する

- **WHEN** 運用者が`o11y-gpu` profileを選択してCompose設定を解決する
- **THEN** `nvidia-dcgm-exporter`がprofileの対象serviceとして含まれる
- **THEN** 長期稼働serviceは定義済みhealthcheckによって正常性を判定できる

### Requirement: o11y-gpu profileの公開境界

`o11y-gpu` profileは、metrics endpointをhostへ公開せず`internal-nw`内だけで提供するものとする（MUST）。

#### Scenario: 利用者または依存serviceが接続する

- **WHEN** profileのserviceが起動してhealth判定に成功する
- **THEN** 定義された公開境界から提供機能へ接続できる
- **THEN** 未定義のhost portを追加で公開しない

### Requirement: o11y-gpu profileの連携

`o11y-gpu` profileは、NVIDIA GPUとcontainer runtimeが利用可能なhostでのみ起動し、metrics endpointのhealthを確認するものとする（MUST）。

#### Scenario: 連携先を利用する

- **WHEN** 必要なcredentialと依存serviceが利用可能である
- **THEN** profile固有の連携が定義された経路で成功する
- **THEN** credentialの実値をrepositoryへ保存しない

