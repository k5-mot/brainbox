# 共有platform Specification

## Purpose

すべてのDocker Compose profileへ共通に適用する選択、network、命名、credential、永続化、正常性およびprofile間連携の契約を定めます。

## Requirements

### Requirement: profileによる選択的な起動

共有platformは、利用者が明示的に選択したprofileに属するserviceだけをCompose構成へ含めるものとする（MUST）。

#### Scenario: 単一profileを選択する

- **WHEN** 運用者がproject rootで`docker compose --profile <profile> config --services`を実行する
- **THEN** 選択したprofileに属するserviceが解決結果へ含まれる
- **THEN** 選択していない独立profileだけに属するserviceは解決結果へ含まれない

### Requirement: profile間の内部通信

共有platformは、profileをまたぐservice間通信にCompose network `internal-nw`とCompose service名を使用するものとする（MUST）。

#### Scenario: 依存serviceへ接続する

- **WHEN** 複数profileを同じ`STACK_NAME`で起動する
- **THEN** 各serviceは`internal-nw`上のservice名で依存先を名前解決できる
- **THEN** 内部通信のためだけにhost portを追加公開しない

### Requirement: deployment単位の命名

共有platformは、必須の`STACK_NAME`をCompose projectとcontainerの識別へ使用し、同一host上の別deploymentと名前を分離するものとする（MUST）。

#### Scenario: STACK_NAMEが未指定である

- **WHEN** 運用者が`STACK_NAME`を設定せずにroot Compose構成を解決する
- **THEN** Composeは設定不足をerrorとして報告する
- **THEN** 曖昧な既定名でserviceを起動しない

### Requirement: credentialの外部注入

共有platformは、password、token、API keyおよびclient secretの実値をrepositoryへ保存せず、環境変数またはsecret fileの参照として実行時に注入するものとする（MUST）。

#### Scenario: credentialを必要とするprofileを起動する

- **WHEN** 運用者が必要なcredentialを環境へ設定してprofileを起動する
- **THEN** serviceは設定源からcredentialを取得する
- **THEN** Compose設定とlogはcredentialの実値を新たに永続化しない

### Requirement: dataと事前取得資材の境界

共有platformは、永続dataをnamed volumeまたは明示したhost directoryへ保存し、閉域実行に必要な資材をrepository既定のbind mountから参照するものとする（MUST）。

#### Scenario: serviceを再作成する

- **WHEN** 運用者がcontainerを再作成する
- **THEN** 永続化対象のdataはcontainer lifecycleから独立して保持される
- **THEN** read-only指定された事前取得資材をcontainerが変更しない

### Requirement: service lifecycleの判定

共有platformは、長期稼働serviceにrestart policyを設定し、依存関係の準備完了をhealthcheckまたは完了条件で判定するものとする（MUST）。

#### Scenario: 依存serviceが準備中である

- **WHEN** downstream serviceの起動条件が評価される
- **THEN** healthcheck付き依存serviceはhealthyになるまで待機する
- **THEN** one-shot初期化serviceは正常終了を完了条件として扱う

### Requirement: hardware固有resourceの選択

共有platformは、GPUなどのhardware固有resourceを必要とするserviceを対応profileへ限定し、hardwareを必要としないprofileの構成解決を妨げないものとする（MUST）。

#### Scenario: GPUを持たないhostで構成を確認する

- **WHEN** 運用者がGPU固有profileを選択せずにCompose構成を解決する
- **THEN** GPU deviceの割り当てを要求するserviceは起動対象にならない
- **THEN** 選択したCPU対応profileの構成を解決できる
