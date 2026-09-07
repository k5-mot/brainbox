# Container依存関係整合の設計

## Context

同じ種類のdatabaseやcacheでもapplicationごとに対応major versionが異なり、一律のversion統一はdata互換性を損なう可能性がありました。また、Root Composeと事前取得scriptのimage参照がずれると閉域搬入後に起動できません。

## Goals / Non-Goals

- applicationが明示する互換範囲内でimage versionを固定します。
- Composeと事前取得対象の対応を維持します。
- PostgreSQL、Valkey、RustFSなどのmajor versionを用途横断で一律に揃えることは目的にしません。

## Decisions

- application imageは調査時点のstable releaseとmigration noteを確認して更新します。
- stateful dependencyは利用applicationの対応範囲と既存dataのupgrade pathを優先します。
- local buildのbase imageを含め、閉域環境で必要なimageを取得対象へ含めます。
- version更新はprofile単位で検証し、永続dataを伴う更新ではbackupとrollback経路を確保します。

## Risks / Trade-offs

用途別のversion併存によりimage数は増えますが、無理なmajor統一による起動不能やdata破損を避けられます。調査結果は時点情報であり、現行versionの正規情報はComposeです。

## References

- [追加調査](research.md)
- [Container image inventory](image-inventory.md)
