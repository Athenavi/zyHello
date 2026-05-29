"""
Utility modules — Python equivalents of Java com.rebuild.utils package.

Uses Python open-source libraries for functional implementation:
- cryptography (AES), httpx (HTTP), Pillow (images), psutil (system),
  markdown (MD), openpyxl/pandas (Excel), subprocess (commands),
  zipfile (compress), pypdf (PDF), etc.

Modules:
    aes.py          — AES encryption/decryption (AES.java)
    app_utils.py    — Request helpers, locale, mobile detection (AppUtils.java)
    banner.py       — Startup banner (RebuildBanner.java)
    blocklist.py    — Blocked words & SQL keywords (BlockList.java)
    by_value.py     — Value-extraction callback (ByValue.java)
    command.py      — Shell command execution (CommandUtils.java)
    compress.py     — Zip archive utilities (CompressUtils.java)
    date_codec.py   — Date JSON serialisation (codec/RbDateCodec.java)
    etag.py         — HTTP ETag support (Etag.java)
    excel_utils.py  — Excel read/write (ExcelUtils.java)
    file_filter.py  — File filter by age (FileFilterByLastModified.java)
    http_client.py  — HTTP GET/POST/download (OkHttpUtils.java)
    image_maker.py  — Avatar & watermark generation (img/ImageMaker.java)
    json_utils.py   — JSON helpers (JSONUtils.java)
    jsonable.py     — JSON-aware protocol (JSONable.java)
    location.py     — IP geolocation (LocationUtils.java)
    markdown_utils.py — MD→HTML rendering (md/MarkdownUtils.java)
    oshi_utils.py   — System monitoring (OshiUtils.java)
    pdf_converter.py — Office→PDF conversion (PdfConverter.java)
    rate_limiter.py — In-memory rate limiting (RateLimiters.java)
    rb_assert.py    — Assertion helpers (RbAssert.java)
    record_codec.py — Record JSON serialisation (codec/RbRecordCodec.java)
"""

# Re-export commonly used functions for convenience
from app.utils.aes import encrypt, decrypt, decrypt_quietly  # noqa: F401
from app.utils.commons import (  # noqa: F401
    COMM_SPLITER, escape_html, unescape_html, sanitize_html,
    escape_sql, random_string, quick_guid, maxstr, is_plain_text,
)
from app.utils.json_utils import (  # noqa: F401
    to_json_object_from_arrays, pretty_print, well_format, parse_object_safe,
    dumps, loads, EMPTY_OBJECT, EMPTY_ARRAY,
)
from app.utils.http_client import get as http_get, post as http_post  # noqa: F401
