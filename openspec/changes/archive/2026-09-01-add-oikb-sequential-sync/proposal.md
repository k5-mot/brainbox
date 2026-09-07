# OIKB sourceの逐次同期

## Why

OIKBのupload完了とOpen WebUIのbackground処理完了は異なるため、sourceを連続triggerすると処理が重なり、失敗したfileを見落とす可能性がありました。

## What Changed

- sourceを明示順に1件ずつtriggerするscriptを追加しました。
- OIKB health/historyとOpen WebUI file状態を組み合わせて完了を判定しました。
- timeoutまたは不整合時に後続sourceを開始しない失敗境界を追加しました。

## Current Contract

現行契約は[profile-owui仕様](../../../specs/profile-owui/spec.md)、実行手順は[20-owui README](/docs/owui/)を参照してください。API制約の詳細は[調査記録](research.md)に保存します。
