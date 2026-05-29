"""
Zip / compress utilities — Python equivalent of CompressUtils.java.

Uses Python's `zipfile` and `shutil` modules.
"""
from __future__ import annotations

import os
import shutil
import zipfile
from pathlib import Path
from typing import Callable, Optional

from loguru import logger


def force_zip(dest_zip: str | Path, source: str | Path,
              filter_fn: Optional[Callable[[Path], bool]] = None) -> None:
    """
    Create a zip archive from a file or directory.

    Args:
        dest_zip: Output zip file path.
        source: File or directory to compress.
        filter_fn: Optional callable that returns True for files to include.
    """
    dest_zip = Path(dest_zip)
    source = Path(source)

    if dest_zip.exists():
        logger.warning("Deleting existing zip: {}", dest_zip)
        dest_zip.unlink()

    with zipfile.ZipFile(dest_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        if source.is_file():
            if filter_fn is None or filter_fn(source):
                zf.write(source, source.name)
        elif source.is_dir():
            for root, dirs, files in os.walk(source):
                root_path = Path(root)
                for fname in files:
                    fpath = root_path / fname
                    if filter_fn is not None and not filter_fn(fpath):
                        continue
                    arcname = fpath.relative_to(source)
                    zf.write(fpath, arcname)


def force_zip_files(dest_zip: str | Path, *files: str | Path) -> None:
    """
    Create a zip from individual files (not a directory tree).

    Args:
        dest_zip: Output zip file path.
        files: One or more file paths to include.
    """
    dest_zip = Path(dest_zip)
    if dest_zip.exists():
        logger.warning("Deleting existing zip: {}", dest_zip)
        dest_zip.unlink()

    with zipfile.ZipFile(dest_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            f = Path(f)
            if f.exists():
                zf.write(f, f.name)


def extract_zip(zip_path: str | Path, dest_dir: str | Path) -> None:
    """Extract a zip archive to a directory."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)
