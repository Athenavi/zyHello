"""Startup banner formatting — replaces RebuildBanner.java."""

from __future__ import annotations

import platform
import sys

FLAG_LINE = "####################################################################"


def _common_banner() -> str:
    return (
        f"\n  Version : Python {sys.version.split()[0]}"
        f"\n  OS      : {platform.system()} ({platform.machine()})"
        f"\n  Runtime : Python {platform.python_version()}"
        f"\n"
        f"\n  Report an issue :"
        f"\n  https://getrebuild.com/report-issue?title=boot"
    )


def format_banner(*texts: str) -> str:
    """Format a full startup banner."""
    parts = [f"\n\n{FLAG_LINE}\n"]
    for t in texts:
        parts.append(f"  {t}\n")
    parts.append(_common_banner())
    parts.append(f"\n\n{FLAG_LINE}\n")
    return "".join(parts)


def format_simple(*texts: str) -> str:
    """Format a simple multi-line banner."""
    lines = ["\n"]
    for t in texts:
        lines.append(f"  {t}\n")
    return "".join(lines)
