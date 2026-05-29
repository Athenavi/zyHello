"""
Page token verify — issue short-lived page tokens and verify/replace them in HTML.

Migrated from Java PageTokenVerify.java.
"""

from __future__ import annotations

import logging

from app.api.base import BaseApi
from app.api.context import ApiContext
from app.api.token_manager import generate_csrf_token, verify_token_simple

log = logging.getLogger(__name__)

# The sentinel string replaced in templates with the actual page token
PAGE_TOKEN_PLACEHOLDER = "$RBTOKEN$"


class PageTokenVerify(BaseApi):
    """
    Verify a page token and optionally return a fresh one.

    Parameters:
    - ptoken: the page token to verify

    Returns: ``{ "ptoken": "<new_token>" }`` if valid
    """

    def get_api_name(self) -> str:
        return "PageTokenVerify"

    def execute(self, context: ApiContext) -> dict:
        ptoken = context.get_parameter_not_blank("ptoken")
        user_id = verify(ptoken)
        if user_id is None:
            return self.format_failure("Invalid or expired page token")

        # Issue a fresh token on successful verification
        new_token = generate(user_id)
        return self.format_success({"ptoken": new_token})


def generate(user_id: str) -> str:
    """Generate a new page token for the given user."""
    return generate_csrf_token(user_id)


def verify(ptoken: str) -> str | None:
    """Verify a page token. Returns the user_id if valid, else None."""
    return verify_token_simple(ptoken)


def replace_page_token(html: str, user_id: str) -> str:
    """
    Replace the ``$RBTOKEN$`` placeholder in rendered HTML with a fresh token.

    Used by template rendering before sending the page to the browser.
    """
    token = generate(user_id)
    return html.replace(PAGE_TOKEN_PLACEHOLDER, token)
