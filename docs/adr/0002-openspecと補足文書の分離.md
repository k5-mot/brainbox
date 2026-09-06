# ADR-0002: OpenSpecと補足文書の分離

## Status

Accepted

## Context

ADR-0001ではOpenSpecと補足文書を1つのnavigationにまとめたため、現行契約と手順、判断理由、調査記録の境界がnavigationからは分かりにくかった。また、独立したlanding pageはOpenSpecの要約を重複し、更新対象を増やしていた。

`docs/`の網羅的な確認では、ADRは判断と理由、`manual/`は操作手順、`troubleshooting/`は障害復旧、`research/`は日付付きの調査証跡、`rules/`はcontributorのgovernanceであり、それぞれDocs側に残す必要があった。一方、`manual/DIFY_AIRGAP.md`の閉域実行、認証、plugin固定、LiteLLM連携は現行の観測可能な契約と手順が混在していた。

## Decision

Docusaurusのdocs pluginを2つのinstanceとして動作させる。`OpenSpec`は`openspec/specs`だけを公開し、site rootで共有platform仕様を表示する。`Docs`は`docs/`と既存READMEを公開する。主navigationは`OpenSpec`と`Docs`の2項目だけとし、独立したlanding pageを持たない。

観測可能な現行契約はOpenSpecに限定する。`DIFY_AIRGAP.md`に混在していた現行契約は`profile-dify`仕様へRequirementとScenarioとして移行し、manualからは重複する規範本文を削除する。manualには資材取得、転送、起動、UI操作、検証、rollbackの手順を残す。

## Migration verification

| 元の契約 | OpenSpecの移行先 |
| --- | --- |
| Dify固有のemail/password認証 | `profile-dify` / `Dify固有認証` |
| 事前取得資材とInternet egress拒否 | `profile-dify` / `閉域実行のnetwork境界` |
| HTTP nodeとpluginの内部URL限定 | `profile-dify` / `workflowの接続先制約` |
| plugin version、checksum、署名、内部PyPI | `profile-dify` / `固定pluginの閉域導入` |
| LiteLLMのURL、credential、model type | `profile-dify` / `LiteLLMとのOpenAI-compatible連携` |

## Consequences

利用者はnavigationの選択だけで現行契約と補足文書を区別できる。site rootも正規のOpenSpecを表示するため、landing pageの同期が不要になる。複数のdocs pluginは独立したrouteとsidebarを持つため、新しい文書を追加する際は適切な側のsidebarだけを更新する。

## References

- [Docusaurus: Docs multi-instance](https://docusaurus.io/docs/docs-multi-instance)
- [Docusaurus: Docs introduction](https://docusaurus.io/docs/docs-introduction)
