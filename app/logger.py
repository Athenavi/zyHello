from loguru import logger as _logger
import sys

# Configure logger
_logger.remove()
# Log to stdout
_logger.add(sys.stdout, level="INFO", format="{time} | {level} | {message}")
# Optionally log to file
# _logger.add("app.log", rotation="10 MB", level="DEBUG")

# Export logger instance
logger = _logger