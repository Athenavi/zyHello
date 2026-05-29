"""
Image thumbnail utility.

Migrated from Java ImageView2.java — generates resized thumbnails using Pillow.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from pathlib import Path

from PIL import Image

from app.utils.commons import maxstr

log = logging.getLogger(__name__)

ORIGIN_WIDTH = 1000


class ImageView2:
    """
    Generate image thumbnails with width constraints.

    Usage::

        iv = ImageView2("/w/300")
        thumb_path = iv.thumb("/path/to/image.jpg")
    """

    def __init__(self, imageView2: str = "/w/1000"):
        self.imageView2 = imageView2
        self._width: int | None = None

    @property
    def width(self) -> int:
        if self._width is None:
            self._width = self._parse_width()
        return self._width

    # -- Public API --------------------------------------------------------

    def thumb(self, img_path: str) -> str | None:
        """
        Generate a thumbnail for the given image.

        Returns the path to the generated thumbnail, or ``None`` if the
        image cannot be processed.
        """
        try:
            file_key = self._format_file_key(img_path)
            # Use a temp directory
            temp_dir = Path(os.environ.get("RB_TEMP_DIR", "/tmp"))
            thumb_path = temp_dir / file_key

            if thumb_path.exists():
                return str(thumb_path)

            with Image.open(img_path) as img:
                w = self.width
                if img.width > w:
                    img.thumbnail((w, w), Image.Resampling.LANCZOS)
                else:
                    pass  # keep original size

                thumb_path.parent.mkdir(parents=True, exist_ok=True)
                img.save(str(thumb_path))
                return str(thumb_path)

        except Exception as ex:
            log.warning("Image thumb failed for %s: %s", img_path, ex)
            return None

    def thumb_quietly(self, img_path: str) -> str:
        """Like :meth:`thumb` but returns *img_path* on failure."""
        try:
            result = self.thumb(img_path)
            if result and os.path.exists(result):
                return result
        except Exception as ex:
            log.warning("Image thumb failed for %s: %s", img_path, ex)
        return img_path

    # -- Internal ----------------------------------------------------------

    def _parse_width(self) -> int:
        """Parse width from imageView2 string like ``/w/300``."""
        match = re.search(r"/w/(\d+)", self.imageView2)
        if match:
            return int(match.group(1))
        return ORIGIN_WIDTH

    def _format_file_key(self, img_path: str) -> str:
        """Create a unique cache key for the thumbnail."""
        parent = Path(img_path).parent.name[:50]
        name = Path(img_path).name
        h = hashlib.md5(f"{self.width}.{parent}.{name}".encode()).hexdigest()[:8]
        return f"thumb_{self.width}_{parent}_{h}_{name}"
