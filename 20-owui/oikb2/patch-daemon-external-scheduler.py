from pathlib import Path

import oikb.daemon as daemon_module
import oikb.sync as sync_module


def _load_daemon_path() -> Path:
    """patch対象のdaemon.pyをimport結果から解決する。

    Args:
        なし。

    Returns:
        install済みのoikb.daemon module file path。

    Raises:
        RuntimeError: module file pathを解決できない場合。
    """
    if daemon_module.__file__ is None:
        raise RuntimeError("oikb.daemon module path was not found")
    return Path(daemon_module.__file__)


def _load_sync_path() -> Path:
    """patch対象のsync.pyをimport結果から解決する。

    Args:
        なし。

    Returns:
        install済みのoikb.sync module file path。

    Raises:
        RuntimeError: module file pathを解決できない場合。
    """
    if sync_module.__file__ is None:
        raise RuntimeError("oikb.sync module path was not found")
    return Path(sync_module.__file__)


def _patch_sync_source(source: str) -> str:
    """dry-run詳細を追加し未登録file発生時に後続uploadを止める。

    Args:
        source: patch前のsync.py source code。

    Returns:
        dry-run結果へfile詳細を保持し逐次uploadをfail-fastにするsource code。

    Raises:
        RuntimeError: 想定したpatch対象が存在しない場合。
    """
    field_before = """    warnings: list[str] | None = None

    @property
"""
    field_after = """    warnings: list[str] | None = None
    files: list[dict[str, str]] | None = None

    @property
"""
    result_before = """        result.dirs_removed = len(rmdir)

        if added:
"""
    result_after = """        result.dirs_removed = len(rmdir)
        result.files = [
            {
                "action": action,
                "path": f"{entry.get('path')}/{entry['filename']}".lstrip("/"),
            }
            for action, entries in (("added", added), ("modified", modified))
            for entry in entries
        ]

        if added:
"""
    upload_targets = (
        (
            """                    _tally(_upload_one(i, entry, change_type, progress, task_id))
""",
            """                    outcome = _upload_one(i, entry, change_type, progress, task_id)
                    _tally(outcome)
                    if outcome[0] not in ("added", "modified"):
                        break
""",
        ),
        (
            """                _tally(_upload_one(i, entry, change_type, None, None))
""",
            """                outcome = _upload_one(i, entry, change_type, None, None)
                _tally(outcome)
                if outcome[0] not in ("added", "modified"):
                    break
""",
        ),
    )
    if field_before not in source:
        raise RuntimeError("oikb.sync result field patch target was not found")
    if result_before not in source:
        raise RuntimeError("oikb.sync dry-run detail patch target was not found")
    source = source.replace(field_before, field_after, 1).replace(
        result_before,
        result_after,
        1,
    )
    for before, after in upload_targets:
        if before not in source:
            raise RuntimeError("oikb.sync sequential upload patch target was not found")
        source = source.replace(before, after, 1)
    return source


def _patch_source(source: str) -> str:
    """daemonを外部scheduler専用APIとして動作させdry-runを補強する。

    Args:
        source: patch前のdaemon.py source code。

    Returns:
        内蔵schedulerを停止しsource metadataを公開するsource code。

    Raises:
        RuntimeError: 想定したpatch対象が存在しない場合。
    """
    initialization_before = """    global _history, _entries

    from oikb.logging import configure_logging
    configure_logging(log_format=log_format)

    _entries = entries
    _history = SyncHistory()
"""
    initialization_after = """    global _history, _entries, _scheduler_state

    from oikb.logging import configure_logging
    configure_logging(log_format=log_format)

    _entries = entries
    _scheduler_state = {
        entry["source"]: {
            "name": entry.get("name", entry["source"]),
            "kb_id": entry["kb-id"],
            "status": "idle",
        }
        for entry in entries
    }
    _history = SyncHistory()
"""
    startup_before = """        @app.on_event("startup")
        async def _startup():
            app.state.scheduler_task = asyncio.create_task(_run_scheduler(entries))
"""
    startup_after = """        @app.on_event("startup")
        async def _startup():
            app.state.scheduler_task = None
"""
    state_before = """        _scheduler_state[source] = {
            "name": entry.get("name", source),
            "status": {status},
"""
    dry_run_before = """        if dry_run:
            return {
                "added": result.added,
                "modified": result.modified,
                "deleted": result.deleted,
                "unmodified": result.unmodified,
                "warnings": result.warnings or [],
                "errors": result.errors or [],
                "summary": result.summary(),
            }
"""
    dry_run_after = """        if dry_run:
            _scheduler_state[source] = {
                **_scheduler_state.get(source, {}),
                "name": entry.get("name", source),
                "kb_id": kb_id,
                "status": "idle",
            }
            return {
                "added": result.added,
                "modified": result.modified,
                "deleted": result.deleted,
                "unmodified": result.unmodified,
                "warnings": result.warnings or [],
                "errors": result.errors or [],
                "files": result.files or [],
                "summary": result.summary(),
            }
"""

    if initialization_before not in source:
        raise RuntimeError("oikb.daemon initialization patch target was not found")
    if startup_before not in source:
        raise RuntimeError("oikb.daemon scheduler patch target was not found")
    if dry_run_before not in source:
        raise RuntimeError("oikb.daemon dry-run patch target was not found")

    for status in ("status", '"cancelled"', '"error"'):
        target = state_before.replace("{status}", status)
        if target not in source:
            raise RuntimeError(f"oikb.daemon {status} state patch target was not found")
        source = source.replace(
            target,
            target.replace(
                '            "status":',
                '            "kb_id": kb_id,\n            "status":',
            ),
            1,
        )

    return (
        source.replace(
            initialization_before,
            initialization_after,
        )
        .replace(startup_before, startup_after)
        .replace(
            dry_run_before,
            dry_run_after,
            1,
        )
    )


path = _load_daemon_path()
path.write_text(_patch_source(path.read_text()))
sync_path = _load_sync_path()
sync_path.write_text(_patch_sync_source(sync_path.read_text()))
