# LLM Wiki CouchDB sourceの設計

## Context

Self-hosted LiveSyncはMarkdown親documentと分割leafをCouchDBへ保存します。LLM Wikiへ取り込むには、削除済みdataやObsidian設定を除外し、leaf順序を保って本文を復元する必要があります。

## Goals / Non-Goals

- CouchDBを変更せず、一貫したsnapshotからMarkdown sourceを生成します。
- adapter間の所有境界を維持し、別sourceを誤削除しません。
- CouchDBとの双方向同期は行いません。

## Decisions

- `/_all_docs?include_docs=true`のsnapshotから非削除Markdown親documentだけを選び、`children`順にleaf本文を連結します。
- hidden path、設定data、Markdown以外、空本文を除外します。
- document IDと生成source fileの対応をadapter固有manifestへ保存し、次回snapshotから消えた所有fileだけを削除します。
- credentialは環境変数から取得し、取得、復元、file更新のいずれかが失敗した場合はmanifestを置換せず、知識コンパイルを開始しません。

## Risks / Trade-offs

Filesystem更新は完全なtransactionではありませんが、manifest確定を最後にすることで再実行時に同じsnapshotへ収束できます。CouchDB固有の復元処理はadapter内部へ閉じ込めます。

## References

- [LLM Wiki CouchDB調査](research.md)
