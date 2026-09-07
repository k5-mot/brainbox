# XWiki hostingの設計

## Context

XWikiはapplicationとdatabaseの双方に永続化と明確な起動順序が必要です。初回起動ではWeb installerが完了するまでapplication readinessも安定しません。

## Goals / Non-Goals

- XWikiを独立profileとして再作成可能な形でhostします。
- database dataとXWiki dataをcontainer lifecycleから分離します。
- Web installer自体を自動操作することは目的にしません。

## Decisions

- XWikiと専用PostgreSQLを同じprofileに含め、databaseのhealth成功後にXWikiを起動します。
- application dataとdatabase dataを別のnamed volumeへ永続化します。
- HostへはXWikiのWeb endpointだけを公開し、databaseは内部networkに限定します。
- healthcheckは初期化中の遅延を許容しつつ、HTTP応答とdatabase readinessを個別に判定します。

## Risks / Trade-offs

初回Web installerはoperator操作を必要とします。applicationとdatabaseを片方だけrollbackするとschemaとdataが不整合になるため、backupと復元は一体で扱います。

## References

- [XWiki Docker Compose構成調査](research.md)
