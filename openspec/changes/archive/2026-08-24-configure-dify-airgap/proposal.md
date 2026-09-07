# Dify pluginの閉域実行対応

## Why

Difyは起動後にplugin packageやPython依存packageを外部から取得し得るため、container imageだけの搬入では閉域実行を保証できませんでした。

## What Changed

- 利用pluginと内包requirementsを事前取得対象にしました。
- local package indexから依存関係を解決する構成にしました。
- packageのversion、署名、checksumを検証する運用を定義しました。

## Current Contract

現行契約は[profile-dify仕様](../../../specs/profile-dify/spec.md)、実行手順は[Dify閉域運用manual](/docs/docs/manual/DIFY_AIRGAP)を参照してください。判断根拠は[調査記録](research.md)に保存します。
