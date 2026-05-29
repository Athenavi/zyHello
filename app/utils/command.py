"""
Command execution — Python equivalent of CommandUtils.java.

Runs shell commands via subprocess with timeout and encoding support.
"""
from __future__ import annotations

import platform
import subprocess
from typing import Optional

from loguru import logger


def exec_for(cmd: str, secure: bool = False, timeout: int = 60) -> str:
    """
    Execute a shell command and return stdout.

    Args:
        cmd: The command string to execute.
        secure: If True, suppress logging the command (for sensitive data).
        timeout: Max seconds to wait (default 60).

    Returns:
        Combined stdout+stderr output string.

    Raises:
        RuntimeError: If the command returns a non-zero exit code or times out.
    """
    if not secure:
        logger.info("CMD : {}", cmd)

    is_windows = platform.system() == "Windows"

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            timeout=timeout,
            text=True,
            encoding="gbk" if is_windows else "utf-8",
            errors="replace",
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"COMMAND TIMEOUT after {timeout}s")
    except Exception as e:
        raise RuntimeError(f"COMMAND ERROR: {e}")

    output = (result.stdout or "") + (result.stderr or "")

    if result.returncode != 0:
        raise RuntimeError(f"{result.returncode}#{output}")

    return output


def exec_quietly(cmd: str, timeout: int = 30) -> Optional[str]:
    """Execute command, returning None on failure."""
    try:
        return exec_for(cmd, secure=True, timeout=timeout)
    except Exception as e:
        logger.debug("Command failed: {} — {}", cmd, e)
        return None
