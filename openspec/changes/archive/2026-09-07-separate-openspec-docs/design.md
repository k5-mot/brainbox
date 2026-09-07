# OpenSpecと運用文書の分離設計

## Status

Accepted

## Context

初期構成ではOpenSpecと補足文書を1つのnavigationにまとめたため、現行契約と手順、判断理由、調査記録の境界がnavigationからは分かりにくかった。また、独立したlanding pageはOpenSpecの要約を重複し、更新対象を増やしていました。

OpenSpecのartifact modelでは、利用者から観測可能な現行契約をmain spec、変更理由と設計判断をchangeのproposalおよびdesignとして管理します。日付付き調査記録も変更判断の証拠であり、対応するarchived changeへ置く方が現行契約との関係を追跡できます。一方、操作手順、障害復旧、contributor rule、component READMEはOpenSpec changeとは異なる利用目的を持ちます。

## Decision

Docusaurusのdocs pluginを2つのinstanceとして動作させます。`OpenSpec`は`openspec/specs`と`openspec/changes`を公開し、site rootで共有platform仕様を表示します。`Docs`はmanual、troubleshooting、project ruleおよび既存READMEを公開します。主navigationは`OpenSpec`と`Docs`の2項目だけとし、独立したlanding pageを持ちません。

ADRは対応するarchived changeの`design.md`へ移します。調査記録は結論と採用判断を`design.md`へ要約し、検証時点の詳細な証拠を同じchangeの`research.md`として保持します。現行の観測可能な契約は対応するmain specへ反映し、実行commandを含む現行手順はmanualまたはcomponent READMEへ委ねます。

観測可能な現行契約はOpenSpecに限定します。`DIFY_AIRGAP.md`に混在していた現行契約は`profile-dify`仕様へRequirementとScenarioとして移行し、manualには資材取得、転送、起動、UI操作、検証、rollbackの手順を残します。

## Migration verification

| 元の契約 | OpenSpecの移行先 |
| --- | --- |
| Dify固有のemail/password認証 | `profile-dify` / `Dify固有認証` |
| 事前取得資材とInternet egress拒否 | `profile-dify` / `閉域実行のnetwork境界` |
| HTTP nodeとpluginの内部URL限定 | `profile-dify` / `workflowの接続先制約` |
| plugin version、checksum、署名、内部PyPI | `profile-dify` / `固定pluginの閉域導入` |
| LiteLLMのURL、credential、model type | `profile-dify` / `LiteLLMとのOpenAI-compatible連携` |
| Doclingの事前配置資材とoffline failure | `profile-rag` / `Doclingの閉域資材` |
| CouchDB snapshotの復元と失敗境界 | `profile-llmwiki` / `CouchDB snapshotの取り込み` |
| OIKB sourceの逐次実行と完了判定 | `profile-owui` / `OIKB sourceの逐次同期` |
| XWikiの永続化、初期化、OIDC rollback | `profile-xwiki`の対応Requirement |

## Consequences

利用者はnavigationの選択だけで仕様と運用文書を区別できます。OpenSpec内では現行契約と変更履歴を続けて参照でき、判断根拠をDocsから探す必要がありません。複数のdocs pluginは独立したrouteとsidebarを持つため、新しい文書を追加する際は適切な側のsidebarだけを更新します。

## References

- [Docusaurus: Docs multi-instance](https://docusaurus.io/docs/docs-multi-instance)
- [Docusaurus: Docs introduction](https://docusaurus.io/docs/docs-introduction)
