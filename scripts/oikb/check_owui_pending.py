#!/usr/bin/env python3
"""Open WebUIで処理中または停止中のfile一覧を表示する。"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import sys
import time
from collections.abc import Sequence
from typing import Any
from urllib.error import HTTPError, URLError

from remove_owui_pending import (
    DEFAULT_ENV_FILE,
    configure_logging,
    discover_knowledge_ids,
    get_pending_files,
    load_environment,
    select_stuck_files,
)

LOGGER = logging.getLogger(__name__)
OUTPUT_FIELDS = (
    "state",
    "status",
    "age_seconds",
    "knowledge_id",
    "file_id",
    "filename",
)


def collect_pending_files(
    open_webui_url: str,
    open_webui_api_key: str,
    knowledge_ids: Sequence[str],
    stuck_after_seconds: int,
) -> list[dict[str, str | int]]:
    """全Knowledge Baseのpending fileを経過時間で分類する。

    Args:
        open_webui_url: Open WebUIのbase URL。
        open_webui_api_key: Open WebUI API key。
        knowledge_ids: 調査対象のKnowledge ID。
        stuck_after_seconds: stuckと判断する最小経過秒数。

    Returns:
        stuckを先頭に並べたpending file情報。

    Raises:
        HTTPError: Open WebUIがHTTP errorを返した場合。
        URLError: Open WebUIへ接続できない場合。
        TypeError: Open WebUI responseの形式が不正な場合。
    """
    now_epoch = int(time.time())
    cutoff_epoch = now_epoch - stuck_after_seconds
    records: list[dict[str, str | int]] = []
    for knowledge_id in knowledge_ids:
        files = get_pending_files(
            open_webui_url,
            open_webui_api_key,
            knowledge_id,
        )
        stuck_ids = {
            file_item["id"]
            for file_item in select_stuck_files(files, cutoff_epoch)
        }
        for file_item in files:
            file_id = file_item.get("id")
            if not isinstance(file_id, str) or not file_id:
                continue
            data = file_item.get("data")
            status = data.get("status") if isinstance(data, dict) else "unknown"
            updated_at = file_item.get("updated_at")
            created_at = file_item.get("created_at")
            timestamp = updated_at if isinstance(updated_at, int) else created_at
            age_seconds = (
                max(0, now_epoch - timestamp) if isinstance(timestamp, int) else ""
            )
            filename = file_item.get("filename")
            records.append(
                {
                    "state": "stuck" if file_id in stuck_ids else "pending",
                    "status": status if isinstance(status, str) else "unknown",
                    "age_seconds": age_seconds,
                    "knowledge_id": knowledge_id,
                    "file_id": file_id,
                    "filename": filename if isinstance(filename, str) else "",
                }
            )
    return sorted(
        records,
        key=lambda record: (
            record["state"] != "stuck",
            -record["age_seconds"] if isinstance(record["age_seconds"], int) else 0,
            record["knowledge_id"],
            record["file_id"],
        ),
    )


def write_pending_files(records: Sequence[dict[str, str | int]]) -> None:
    """pending file一覧を標準出力へTSV形式で書き出す。

    Args:
        records: 表示対象のpending file情報。

    Returns:
        なし。

    Side Effects:
        headerを含むTSVを標準出力へ書き出す。
    """
    writer = csv.DictWriter(
        sys.stdout,
        fieldnames=OUTPUT_FIELDS,
        delimiter="\t",
        lineterminator="\n",
    )
    writer.writeheader()
    writer.writerows(records)


def build_parser() -> argparse.ArgumentParser:
    """command line option parserを作成する。

    Args:
        なし。

    Returns:
        pending file確認script用ArgumentParser。
    """
    parser = argparse.ArgumentParser(
        description="List pending and stuck Open WebUI Knowledge files.",
    )
    parser.add_argument(
        "--open-webui-url",
        default=os.environ.get("OPEN_WEBUI_URL", "http://localhost:32000"),
    )
    parser.add_argument(
        "--open-webui-api-key",
        default=os.environ.get("OPEN_WEBUI_API_KEY"),
    )
    parser.add_argument(
        "--oikb-url",
        default=os.environ.get("OIKB_URL", "http://localhost:32001"),
    )
    parser.add_argument("--oikb-api-key", default=os.environ.get("OIKB_API_KEY"))
    parser.add_argument("--knowledge-id", action="append", default=[])
    parser.add_argument(
        "--stuck-after-seconds",
        type=int,
        default=int(os.environ.get("OPEN_WEBUI_STUCK_FILE_AGE_SECONDS", "3600")),
    )
    return parser


def main(argv: Sequence[str]) -> int:
    """pending file一覧を取得して標準出力へ表示する。

    Args:
        argv: プログラム名を含むcommand line引数。

    Returns:
        正常終了時は0、設定または通信error時は1、
        不正な引数では2。

    Side Effects:
        Open WebUIとOIKBを参照し、一覧と実行結果を出力する。
    """
    started_at = time.perf_counter()
    load_environment(DEFAULT_ENV_FILE)
    parser = build_parser()
    args = parser.parse_args(argv[1:])
    if not args.open_webui_api_key:
        parser.error("--open-webui-api-key or OPEN_WEBUI_API_KEY is required")
    if not args.knowledge_id and not args.oikb_api_key:
        parser.error(
            "--oikb-api-key or OIKB_API_KEY is required to discover Knowledge IDs"
        )
    if args.stuck_after_seconds <= 0:
        parser.error("--stuck-after-seconds must be at least 1")

    try:
        knowledge_ids = args.knowledge_id or discover_knowledge_ids(
            args.oikb_url,
            args.oikb_api_key,
        )
        records = collect_pending_files(
            args.open_webui_url,
            args.open_webui_api_key,
            knowledge_ids,
            args.stuck_after_seconds,
        )
        write_pending_files(records)
        stuck_count = sum(record["state"] == "stuck" for record in records)
        LOGGER.info(
            "Pending check completed: files=%d stuck=%d",
            len(records),
            stuck_count,
        )
        return 0
    except (HTTPError, URLError, TypeError, ValueError, json.JSONDecodeError) as error:
        LOGGER.error("Pending check failed: %s", error)
        return 1
    finally:
        LOGGER.info("Elapsed time: %.3f seconds", time.perf_counter() - started_at)


if __name__ == "__main__":
    configure_logging()
    raise SystemExit(main(sys.argv))
