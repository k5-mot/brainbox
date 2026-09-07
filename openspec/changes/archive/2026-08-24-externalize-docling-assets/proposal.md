# Docling model資材の外部配置

## Why

Doclingが起動後にmodelやOCR dataを取得すると、閉域環境では起動に失敗します。image再buildなしで資材を更新でき、実行時downloadを防ぐ配置が必要でした。

## What Changed

- Docling modelとTesseract traineddataを事前取得資材にしました。
- host上の固定directoryからread-only bind mountする構成にしました。
- offline modeと起動時model loadで資材不足を検出するようにしました。

## Current Contract

現行契約は[profile-rag仕様](../../../specs/profile-rag/spec.md)と[閉域資材取得仕様](../../../specs/offline-asset-download/spec.md)、手順は[11-rag README](/docs/rag/)を参照してください。詳細な選定根拠は[調査記録](research.md)に保存します。
