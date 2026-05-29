"""System monitoring utilities — replaces OshiUtils.java using psutil."""

from __future__ import annotations

import logging
import os
import platform
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psutil

log = logging.getLogger(__name__)

_GB = 1024 ** 3


def get_os_memory_used() -> tuple[float, float]:
    """Return ``(total_mb, usage_percent)`` for OS memory."""
    mem = psutil.virtual_memory()
    return (round(mem.total / (1024 ** 2), 1), round(mem.percent, 1))


def get_jvm_memory_used() -> tuple[float, float]:
    """Return ``(total_mb, usage_percent)`` for Python process memory."""
    proc = psutil.Process(os.getpid())
    info = proc.memory_info()
    total_mb = info.rss / (1024 ** 2)
    # Python has no fixed heap; report RSS vs system total
    sys_total = psutil.virtual_memory().total
    pct = round(info.rss / sys_total * 100, 1) if sys_total else 0.0
    return (round(total_mb, 1), pct)


def get_system_load() -> float:
    """Return the 1-minute load average (or equivalent on Windows)."""
    try:
        load1, _, _ = os.getloadavg()
        return round(load1, 1)
    except (AttributeError, OSError):
        # Windows fallback: use CPU percent
        return round(psutil.cpu_percent(interval=0.5), 1)


def get_local_ip() -> str:
    """Return the best non-loopback IPv4 address of this machine."""
    # Fast path
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and ip != "0.0.0.0":
            return ip
    except Exception:
        pass

    # Fallback: iterate interfaces
    best = None
    for name, addrs in psutil.net_if_addrs().items():
        lower = name.lower()
        if any(skip in lower for skip in ("docker", "vbox", "vmnet", "loopback", "veth", "lo")):
            continue
        for addr in addrs:
            if addr.family == socket.AF_INET and addr.address not in ("127.0.0.1", "0.0.0.0"):
                if best is None:
                    best = addr.address
                break
    return best or "127.0.0.1"


def get_network_date() -> datetime:
    """Fetch the current time from a remote HTTP server."""
    import httpx

    urls = [
        "https://www.baidu.com/",
        "https://www.microsoft.com/",
        "https://getrebuild.com/",
    ]
    for url in urls:
        try:
            resp = httpx.head(url, timeout=5.0, follow_redirects=True)
            date_str = resp.headers.get("Date")
            if date_str:
                from email.utils import parsedate_to_datetime
                return parsedate_to_datetime(date_str)
        except Exception as exc:
            log.debug("Cannot fetch date from %s : %s", url, exc)

    return datetime.now(timezone.utc)


def is_docker_env() -> bool:
    """Return ``True`` if running inside a Docker container."""
    if Path("/.dockerenv").exists():
        return True
    try:
        with open("/proc/self/cgroup") as f:
            return any("docker" in line for line in f)
    except (FileNotFoundError, PermissionError):
        return False


def get_disks_used(spec_roots: list[str] | None = None) -> list[tuple[float, float, str]]:
    """Return ``[(total_gb, used_percent, name), …]`` for each disk."""
    disks: list[tuple[float, float, str]] = []
    try:
        if spec_roots is not None:
            roots = [Path(r) for r in spec_roots] if spec_roots else list(Path("/").iterdir())
            for root in roots:
                if not root.exists():
                    continue
                usage = psutil.disk_usage(str(root))
                total_gb = round(usage.total / _GB, 1)
                pct = round(usage.percent, 1)
                disks.append((total_gb, pct, root.name or str(root)))
        else:
            for part in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    total_gb = round(usage.total / _GB, 1)
                    pct = round(usage.percent, 1)
                    disks.append((total_gb, pct, part.device))
                except (PermissionError, OSError):
                    continue
    except Exception as exc:
        log.warning("Cannot stat disks : %s", exc)

    return disks
