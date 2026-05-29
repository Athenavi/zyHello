"""
API exception hierarchy.

Migrated from Java ApiInvokeException.java.
"""

from app.exceptions import BusinessException


class ApiInvokeException(BusinessException):
    """Root exception for all API invocation errors."""

    ERR_BADAUTH = 401
    ERR_BADAPI = 402
    ERR_FREQUENCY = 403
    ERR_BADPARAMS = 410
    ERR_DATASPEC = 420
    ERR_NOPRIV = 430

    def __init__(self, error_msg: str, error_code: int = 400, cause: Exception | None = None):
        super().__init__(status_code=error_code, detail=error_msg)
        self.error_code = error_code
        self.error_msg = error_msg
        self.__cause__ = cause

    def get_error_code(self) -> int:
        return self.error_code

    def get_error_msg(self) -> str:
        return self.error_msg
