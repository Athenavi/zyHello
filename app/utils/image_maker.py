"""Image generation (avatars & watermarks) — replaces img/ImageMaker.java using Pillow."""

from __future__ import annotations

import logging
import random
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

log = logging.getLogger(__name__)

# Colour palette matching the Java original
RB_COLORS: list[tuple[int, int, int]] = [
    (66, 133, 244),
    (52, 168, 83),
    (251, 188, 5),
    (234, 67, 53),
    (155, 82, 222),
    (22, 168, 143),
]

DEFAULT_AVATAR_SIZE = 200


def _get_font(size: int = 81, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Try to load a CJK-capable font; fall back to Pillow default."""
    # Try system fonts
    candidates = [
        "SourceHanSansK-Regular.ttf",
        "NotoSansCJK-Regular.ttc",
        "NotoSansSC-Regular.otf",
        "SimHei.ttf",
        "msyh.ttc",
        "Arial.ttf",
        "DejaVuSans-Bold.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue

    # Try project data directory
    data_dir = Path("data")
    for name in candidates:
        p = data_dir / name
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except (IOError, OSError):
                continue

    return ImageFont.load_default()


def make_avatar(name: str, dest: str | Path) -> None:
    """Generate a 200×200 avatar with the last 2 characters of *name*."""
    if len(name) > 2:
        name = name[-2:]
    name = name.upper()

    bg_color = random.choice(RB_COLORS)
    img = Image.new("RGB", (DEFAULT_AVATAR_SIZE, DEFAULT_AVATAR_SIZE), bg_color)
    draw = ImageDraw.Draw(img)

    font = _get_font(81)
    # Measure text
    bbox = draw.textbbox((0, 0), name, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (DEFAULT_AVATAR_SIZE - tw) // 2
    y = (DEFAULT_AVATAR_SIZE - th) // 2 - 10  # slight upward shift

    draw.text((x, y), name, fill="white", font=font)

    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(dest), "PNG")


def make_watermark(image_path: str | Path, text: str, dest: str | Path) -> None:
    """Add a semi-transparent text watermark to the bottom-right of an image."""
    img = Image.open(str(image_path)).convert("RGBA")
    iw, ih = img.size

    font_size = max(16, min(int(iw * 0.06), 48))
    font = _get_font(font_size)

    # Create watermark overlay
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = iw - tw - 20
    y = ih - th - 20

    # Shadow
    draw.text((x + 1, y + 1), text, fill=(0, 0, 0, 150), font=font)
    # Main text
    draw.text((x, y), text, fill=(255, 255, 255, 180), font=font)

    result = Image.alpha_composite(img, overlay)
    result = result.convert("RGB")

    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    result.save(str(dest), quality=95)


def create_text_watermark(
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    text_color: tuple[int, int, int, int] = (255, 255, 255, 200),
    max_width: int = 400,
) -> Image.Image:
    """Create a transparent watermark image containing *text*."""
    # Measure one line to estimate height
    tmp = Image.new("RGBA", (1, 1))
    tmp_draw = ImageDraw.Draw(tmp)
    bbox = tmp_draw.textbbox((0, 0), "Ag", font=font)
    line_h = bbox[3] - bbox[1]

    # Word-wrap
    lines: list[str] = []
    for paragraph in text.split("\n"):
        line = ""
        for ch in paragraph:
            test = line + ch
            bbox = tmp_draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] > max_width and line:
                lines.append(line)
                line = ch
            else:
                line = test
        if line:
            lines.append(line)

    img_h = len(lines) * line_h + 10
    img = Image.new("RGBA", (max_width, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    y = 0
    for l in lines:
        draw.text((1, y + 1), l, fill=(0, 0, 0, 150), font=font)
        draw.text((0, y), l, fill=text_color, font=font)
        y += line_h

    return img
