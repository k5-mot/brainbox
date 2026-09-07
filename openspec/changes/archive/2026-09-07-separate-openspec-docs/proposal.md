# OpenSpecとDocsの分離

## Why

現行契約、変更判断、調査証跡、運用手順を同じDocs領域へ置くと、どの情報が正規仕様か判別しにくくなります。

## What Changed

- Site navigationを`OpenSpec`と`Docs`の2タブに分離しました。
- ADRと調査記録をarchived changeへ移し、OpenSpecから参照可能にしました。
- Docsを運用manual、troubleshooting、project rule、READMEに限定しました。
- 独立したhome pageを廃止し、site rootで共有platform仕様を表示しました。

## Current Contract

現行契約は[仕様サイト仕様](../../../specs/specification-site/spec.md)、local確認手順はrepositoryの`docs-site/README.md`を参照してください。
