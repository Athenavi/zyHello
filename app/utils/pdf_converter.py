"""Office-to-PDF conversion — replaces PdfConverter.java.

Uses LibreOffice via subprocess for the actual conversion.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from app.utils.command import exec_for

log = logging.getLogger(__name__)

TYPE_PDF = "pdf"


class PdfConverterException(Exception):
    """Raised when conversion fails."""


def convert(path: str | Path, file_type: str = TYPE_PDF, force_regen: bool = True) -> Path:
    """Convert a file to the specified type (usually PDF).

    1. For Excel files, re-saves to trigger formula evaluation.
    2. Invokes LibreOffice ``soffice --headless --convert-to``.
    """
    path = Path(path)
    file_type = (file_type or TYPE_PDF).lower()
    out_dir = path.parent
    out_name = f"{path.stem}.{file_type}"
    dest = out_dir / out_name

    if dest.exists():
        if force_regen:
            dest.unlink(missing_ok=True)
        else:
            return dest

    # Excel formula recalculation
    if path.suffix.lower() in (".xlsx", ".xls"):
        from app.utils.excel_utils import re_save_and_calc_formula
        re_save_and_calc_formula(path)

    soffice = shutil.which("soffice") or shutil.which("libreoffice") or "soffice"
    cmd = f'{soffice} --headless --convert-to {file_type} "{path}" --outdir "{out_dir}"'

    echo = exec_for(cmd, secure=False)
    if echo:
        log.info(echo)

    if dest.exists():
        return dest

    error = f"CANNOT CONVERT {file_type.upper()}"
    if echo:
        error += f" : {echo}"
    raise PdfConverterException(error)


def convert_pdf(path: str | Path) -> Path:
    """Convenience wrapper: convert to PDF."""
    return convert(path, TYPE_PDF)


def re_save_pdf4meta(file_path: str | Path, new_filename: str | None = None) -> Path:
    """Strip metadata from a PDF and optionally rename it."""
    file_path = Path(file_path)
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(str(file_path))
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)

        metadata = reader.metadata or {}
        writer.add_metadata({
            "/Title": new_filename or file_path.name,
            "/Author": "REBUILD",
            "/Creator": "PdfConverter",
        })

        file_path.unlink(missing_ok=True)
        if new_filename:
            file_path = file_path.parent / new_filename

        with open(file_path, "wb") as f:
            writer.write(f)
    except Exception as exc:
        log.warning("PDF resave error : %s", exc)

    return file_path
