"""File filter by last-modified age — replaces FileFilterByLastModified.java."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Callable

log = logging.getLogger(__name__)


class FileFilterByLastModified:
    """Keep only files older than *keep_days* days."""

    def __init__(self, keep_days: int):
        self.keep_days = keep_days
        self._cutoff = time.time() - keep_days * 86400

    def __call__(self, path: Path) -> bool:
        """Return ``True`` if the file should be **kept** (i.e. is older than the cutoff)."""
        try:
            return path.stat().st_mtime < self._cutoff
        except OSError:
            return False


def delete_old_files(directory: str | Path, keep_days: int, filter_fn: Callable[[Path], bool] | None = None) -> int:
    """Delete files in *directory* that are older than *keep_days* days.

    Returns the number of files deleted.
    """
    directory = Path(directory)
    if not directory.is_dir():
        return 0

    cutoff = time.time() - keep_days * 86400
    deleted = 0

    for p in directory.iterdir():
        if not p.is_file():
            continue
        if filter_fn and not filter_fn(p):
            continue
        try:
            if p.stat().st_mtime < cutoff:
                p.unlink()
                deleted += 1
        except OSError as exc:
            log.debug("Cannot delete %s : %s", p, exc)

    return deleted
