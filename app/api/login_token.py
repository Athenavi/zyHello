"""
Login token API — authenticate user via username/password and return a token.

Migrated from Java LoginToken.java.
"""

from __future__ import annotations

import logging

from app.api.base import BaseApi
from app.api.context import ApiContext
from app.api.token_manager import generate_access_token

log = logging.getLogger(__name__)


class LoginToken(BaseApi):
    """
    Authenticate a user and return an access token.

    Required parameters:
    - user: login name or email
    - password: plain-text password

    Returns: ``{ "token": "<access_token>" }``
    """

    def get_api_name(self) -> str:
        return "LoginToken"

    def execute(self, context: ApiContext) -> dict:
        user = context.get_parameter_not_blank("user")
        password = context.get_parameter_not_blank("password")

        from app.database import get_db_session
        from app.services.auth_service import authenticate_user

        with get_db_session() as db:
            u = authenticate_user(db, user, password)
            if u is None:
                return self.format_failure("Wrong username or password")

            token = generate_access_token(str(u.user_id))
            return self.format_success({"token": token})


def check_user(user: str, password: str) -> str | None:
    """
    Check user credentials and return an access token, or None on failure.

    Standalone helper used by other modules.
    """
    from app.database import get_db_session
    from app.services.auth_service import authenticate_user

    with get_db_session() as db:
        u = authenticate_user(db, user, password)
        if u is None:
            return None
        return generate_access_token(str(u.user_id))
