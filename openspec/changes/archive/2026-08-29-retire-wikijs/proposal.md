# Wiki.js profileの廃止

## Why

Knowledge platformをXWikiへ集約した後もWiki.js profileと初期化手順が残ると、選択すべきserviceと保守対象が曖昧になります。

## What Changed

- Wiki.js service、専用database、profile参照をRoot Composeから削除しました。
- Wiki.jsを現行profile仕様の対象外にしました。
- 削除前の初期化とKeycloak連携手順を履歴証跡として保存しました。

## Current Contract

現行のKnowledge platformは[profile-xwiki仕様](../../../specs/profile-xwiki/spec.md)を参照してください。削除前の情報は[調査記録](research.md)でのみ参照でき、現行環境へ適用してはなりません。
