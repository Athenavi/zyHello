"""Shared Jinja2 templates instance for all routers."""
import jinja2
from fastapi.templating import Jinja2Templates


class SilentUndefined(jinja2.Undefined):
    """An undefined that silently returns empty string for all operations.

    The Java/Thymeleaf templates reference global model attributes
    (assets, css, files.css, etc.) that are populated at runtime.
    This class prevents UndefinedError by returning empty strings
    for attribute access, item access, string conversion, and concatenation.
    """

    def __str__(self) -> str:
        return ""

    def __iter__(self):
        return iter([])

    def __bool__(self) -> bool:
        return False

    def __getattr__(self, name: str):
        # Reject dunder names so that hasattr(s, "__html__") returns False.
        # This forces markupsafe.escape() to fall back to str(s) -> "".
        if name.startswith("__") and name.endswith("__"):
            raise AttributeError(name)
        return self

    def __getitem__(self, _: str):
        return self

    def __call__(self, *args, **kwargs):
        return self


templates = Jinja2Templates(directory="app/templates")

# Use silent undefined so templates render even when variables are missing.
templates.env.undefined = SilentUndefined
