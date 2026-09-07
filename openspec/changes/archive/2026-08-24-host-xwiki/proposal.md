# XWiki profileの追加

## Why

永続databaseを含むXWikiをRoot Composeのprofileとして選択的に起動し、既存platformのnetwork、命名、health判定へ統合する必要がありました。

## What Changed

- XWikiと専用PostgreSQLを`xwiki` profileとして追加しました。
- Web endpoint、永続volume、起動依存関係、healthcheckを定義しました。
- 初回セットアップと障害確認の運用手順を整備しました。

## Current Contract

現行契約は[profile-xwiki仕様](../../../specs/profile-xwiki/spec.md)、運用手順は[31-xwiki README](/docs/xwiki/)を参照してください。採用時の根拠は[調査記録](research.md)に保存します。
