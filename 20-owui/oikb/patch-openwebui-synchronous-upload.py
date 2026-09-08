"""OIKBのfile uploadをOpen WebUIの同期処理へ変更する。"""

from __future__ import annotations

import importlib.util
import logging
import sys
import time
from collections.abc import Sequence
from pathlib import Path

LOGGER = logging.getLogger(__name__)


def load_client_path() -> Path:
    """install済みOIKB client moduleのpathを解決する。

    Args:
        なし。

    Returns:
        OIKB client moduleのpath。

    Raises:
        RuntimeError: moduleのpathを解決できない場合。
    """
    try:
        spec = importlib.util.find_spec("oikb.client")
    except ModuleNotFoundError as error:
        raise RuntimeError("oikb.client module was not found") from error
    if spec is None or spec.origin is None:
        raise RuntimeError("oikb.client module path was not found")
    return Path(spec.origin)


def patch_source(source: str) -> str:
    """file処理完了までupload responseを待つparameterを追加する。

    Args:
        source: patch前のOIKB client source code。

    Returns:
        同期file処理parameterを追加したsource code。

    Raises:
        RuntimeError: 想定したpatch対象が存在しない場合。
    """
    old = '''        resp = self._http.post(
            "/files/",
            files={"file": (filename, file_content)},
            data={"metadata": json.dumps(metadata)},
        )
'''
    new = '''        resp = self._http.post(
            "/files/",
            params={"process_in_background": "false"},
            files={"file": (filename, file_content)},
            data={"metadata": json.dumps(metadata)},
        )
'''
    if old not in source:
        raise RuntimeError("oikb.client upload patch target was not found")
    return source.replace(old, new, 1)


def main(argv: Sequence[str]) -> int:
    """install済みOIKB clientへ同期upload patchを適用する。

    Args:
        argv: プログラム名を含むcommand line引数。

    Returns:
        patch成功時は0、module解決またはfile更新の失敗時は1。

    Side Effects:
        install済みOIKB client moduleを書き換え、実行時間をlogへ記録する。
    """
    del argv
    started_at = time.perf_counter()
    logging.basicConfig(level=logging.INFO)
    try:
        path = load_client_path()
        source = patch_source(path.read_text(encoding="utf-8"))
        path.write_text(source, encoding="utf-8")
        return 0
    except (OSError, RuntimeError) as error:
        LOGGER.error("OIKB client patch failed: %s", error)
        return 1
    finally:
        LOGGER.info("Elapsed time: %.3f seconds", time.perf_counter() - started_at)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
