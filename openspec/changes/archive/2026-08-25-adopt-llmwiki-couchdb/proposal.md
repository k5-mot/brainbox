# LLM WikiへのCouchDB source追加

## Why

Obsidian Self-hosted LiveSyncのCouchDB dataを、既存sourceを壊さずLLM Wikiへ一方向に取り込む経路が必要でした。

## What Changed

- CouchDB snapshotをread-onlyで復元するsource adapterを追加しました。
- adapter所有fileをmanifestで追跡し、削除を安全に収束させました。
- 同期成功後だけ知識コンパイルを開始する失敗境界を定義しました。

## Current Contract

現行契約は[profile-llmwiki仕様](../../../specs/profile-llmwiki/spec.md)、設定と運用手順は[41-llmwiki README](/docs/llmwiki/)を参照してください。data形式の分析は[調査記録](research.md)に保存します。
