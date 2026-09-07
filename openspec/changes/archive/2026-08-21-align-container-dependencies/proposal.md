# Container imageと依存関係の整合

## Why

複数profileで独立に管理されていたcontainer imageのversionと共有依存関係を棚卸しし、更新可能性とmigration riskを同じ基準で判断する必要がありました。

## What Changed

- Root Composeが参照するapplication imageと依存imageを網羅的に調査しました。
- 単純な最新版追従ではなく、互換性とdata migrationを優先してversionを選定しました。
- image取得scriptとComposeの参照を一致させました。

## Current Contract

現行のprofile構成と共通運用契約は、[共有platform仕様](../../../specs/shared-platform/spec.md)および各profile仕様を参照してください。調査時点のversion根拠は[調査記録](research.md)と[image inventory](image-inventory.md)に保存します。
