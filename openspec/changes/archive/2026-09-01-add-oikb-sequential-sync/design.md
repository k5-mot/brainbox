# OIKB逐次同期の設計

## Context

OIKBのtrigger APIはtask作成時点で応答し、Open WebUIはfile抽出、embedding、Knowledgeへのlinkをbackgroundで継続します。OIKBの成功だけではKnowledge Baseへの登録完了を保証できません。

## Goals / Non-Goals

- 外部trigger scriptが開始するsource同期を指定順に直列化します。
- Open WebUIでのfile処理失敗と未linkを検出します。
- OIKB daemon内部schedulerを停止し、外部scriptへ同期開始を集約します。

## Decisions

- Trigger前後のOIKB healthとhistoryを比較し、今回のrunが`success`で終了したことを確認します。
- Open WebUIの全file一覧の差分から今回のfileを特定し、個別status、Knowledge link、pending件数、総数を照合します。
- Source順、poll間隔、timeoutを設定可能にし、`partial`、`error`、`cancelled`、timeout、不整合では後続sourceを開始しません。
- Custom OIKB imageで内蔵schedulerを無効化し、source metadataを外部scriptへ公開します。
- 厳密なrun相関は同じKnowledge Baseへ別uploadが同時実行されないことを前提にします。

## Risks / Trade-offs

OIKB 0.4.0のtrigger responseにはrun IDとfile IDがないため、同時uploadがあると差分の帰属が曖昧です。厳密な並行実行対応にはOIKB API拡張が必要です。

## References

- [OIKB逐次同期API調査](research.md)
