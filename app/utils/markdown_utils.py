"""Markdown rendering — replaces md/MarkdownUtils.java using the `markdown` library."""

from __future__ import annotations

import re
from typing import Any

import markdown
from markdown.extensions.tables import TableExtension
from markdown.extensions.toc import TocExtension

from app.utils.commons import escape_html

# Pre-compiled patterns
_IMG_RE = re.compile(r"!\[.*?]\(([^)]+)\)")


def _build_extensions(target_blank: bool = False) -> list[Any]:
    """Build the list of markdown extensions."""
    exts: list[Any] = [
        TableExtension(),
        TocExtension(permalink=False),
        "markdown.extensions.nl2br",
    ]
    if target_blank:
        exts.append("markdown.extensions.attr_list")
    return exts


def render(md_text: str, target_blank: bool = False, keep_html: bool = False) -> str:
    """Render Markdown to HTML.

    * If *keep_html* is ``False`` (default), embedded HTML is escaped first.
    * If *target_blank* is ``True``, links get ``target=_blank``.
    """
    if not keep_html:
        md_text = escape_html(md_text)
        md_text = md_text.replace("> ", "> ")  # preserve MD blockquotes

    extensions = _build_extensions(target_blank)

    html = markdown.markdown(md_text, extensions=extensions)

    if target_blank:
        # Add target="_blank" to all <a> tags
        html = html.replace("<a ", '<a target="_blank" rel="noopener" ')

    return html


def clean_marks(md_text: str) -> str:
    """Strip Markdown formatting and return plain text."""
    from bs4 import BeautifulSoup

    # Replace image syntax with filename
    for m in _IMG_RE.finditer(md_text):
        url = m.group(1)
        filename = url.rsplit("/", 1)[-1].split("?")[0]
        md_text = md_text.replace(f"[{url}]", f"[{filename}]")

    # Remove image markup → keep as [url]
    md_text = re.sub(r"!\[.*?]\((.*?)\)", r"[\1]", md_text)

    html = render(md_text, target_blank=False, keep_html=True)
    return BeautifulSoup(html, "html.parser").get_text()
