# Wiki.js廃止の設計

## Context

Wiki.jsとXWikiを併存させると、database、認証client、公開port、backup手順を二重に保守する必要がありました。Wiki.jsの手順は有用な履歴ですが、現行manualとして公開すると誤操作を招きます。

## Goals / Non-Goals

- 現行Composeと仕様からWiki.jsを完全に除外します。
- 削除前の判断と復旧に必要な証跡は履歴として保持します。
- Wiki.jsの再導入経路を現行契約として保証しません。

## Decisions

- Wiki.js profile、service、database、download対象を削除します。
- 現行のWiki用途はXWikiへ集約します。
- 旧手順はarchived changeのresearchとして残し、実行禁止を明示します。

## Risks / Trade-offs

既存Wiki.js dataは自動移行されません。必要なdata exportや再導入は、削除時点のartifactと履歴を基に個別changeとして扱います。

## References

- [Wiki.js削除前の調査記録](research.md)
