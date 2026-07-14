"""SSO (Single Sign-On) service for DingTalk, Feishu, and WeChat Work.

Each provider implements the OAuth2 authorization code flow:
  1. Redirect user to provider's authorize URL
  2. User approves and is redirected back with a code
  3. Exchange code for access token
  4. Fetch user info with the access token
  5. Find or create local user and issue JWT

Configuration is stored in system_config with keys like:
  DingtalkAppKey, DingtalkAppSecret, DingtalkCorpId
  WxworkCorpId, WxworkAgentId, WxworkSecret
  FeishuAppId, FeishuAppSecret
"""
import json
import secrets
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.models import ExternalUser, User
from app.services.auth_service import create_access_token
from app.services.configuration_service import get_all_configs


# ── Data classes ──────────────────────────────────────────────────────

@dataclass
class SSOUserInfo:
    """Normalized user info from any SSO provider."""
    provider: str           # "dingtalk" | "wxwork" | "feishu"
    provider_user_id: str   # Unique ID from the provider
    name: str
    email: Optional[str] = None
    avatar: Optional[str] = None


# ── Abstract base ─────────────────────────────────────────────────────

class SSOProvider(ABC):
    """Abstract base for SSO OAuth2 providers."""

    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        """Build the URL to redirect the user to for authorization."""
        ...

    @abstractmethod
    async def get_user_info(self, code: str, redirect_uri: str) -> SSOUserInfo:
        """Exchange the authorization code for user info."""
        ...


# ── DingTalk ──────────────────────────────────────────────────────────

class DingTalkProvider(SSOProvider):
    """DingTalk OAuth2 SSO provider."""

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        params = urlencode({
            "appid": self.config.get("DingtalkAppKey", ""),
            "response_type": "code",
            "scope": "openid",
            "state": state,
            "redirect_uri": redirect_uri,
        })
        return f"https://login.dingtalk.com/oauth2/auth?{params}"

    async def get_user_info(self, code: str, redirect_uri: str) -> SSOUserInfo:
        app_key = self.config.get("DingtalkAppKey", "")
        app_secret = self.config.get("DingtalkAppSecret", "")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Exchange code for access token
            token_resp = await client.post(
                "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
                json={
                    "appKey": app_key,
                    "appSecret": app_secret,
                    "code": code,
                    "grantType": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
            access_token = token_data.get("accessToken")
            if not access_token:
                raise ValueError("DingTalk: No accessToken in response")

            # Step 2: Get user info
            user_resp = await client.get(
                "https://api.dingtalk.com/v1.0/oauth2/userinfo",
                headers={"x-acs-dingtalk-access-token": access_token},
            )
            user_resp.raise_for_status()
            user_data = user_resp.json()

        return SSOUserInfo(
            provider="dingtalk",
            provider_user_id=user_data.get("userId") or user_data.get("openId", ""),
            name=user_data.get("nick", ""),
        )


# ── Feishu ────────────────────────────────────────────────────────────

class FeishuProvider(SSOProvider):
    """Feishu (Lark) OAuth2 SSO provider."""

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        params = urlencode({
            "app_id": self.config.get("FeishuAppId", ""),
            "redirect_uri": redirect_uri,
            "state": state,
        })
        return f"https://open.feishu.cn/open-apis/authen/v1/index?{params}"

    async def get_user_info(self, code: str, redirect_uri: str) -> SSOUserInfo:
        app_id = self.config.get("FeishuAppId", "")
        app_secret = self.config.get("FeishuAppSecret", "")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Get tenant access token
            tenant_resp = await client.post(
                "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
                json={"app_id": app_id, "app_secret": app_secret},
            )
            tenant_resp.raise_for_status()
            tenant_token = tenant_resp.json().get("tenant_access_token", "")

            # Step 2: Exchange code for user info
            user_resp = await client.post(
                "https://open.feishu.cn/open-apis/authen/v1/access_token",
                headers={"Authorization": f"Bearer {tenant_token}"},
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                },
            )
            user_resp.raise_for_status()
            user_data = user_resp.json().get("data", {})

        return SSOUserInfo(
            provider="feishu",
            provider_user_id=user_data.get("user_id", user_data.get("open_id", "")),
            name=user_data.get("name", ""),
            email=user_data.get("email", ""),
            avatar=user_data.get("avatar_url", ""),
        )


# ── WeChat Work ────────────────────────────────────────────────────────

class WxWorkProvider(SSOProvider):
    """WeChat Work (企业微信) OAuth2 SSO provider."""

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        corp_id = self.config.get("WxworkCorpId", "")
        agent_id = self.config.get("WxworkAgentId", "")
        params = urlencode({
            "appid": corp_id,
            "agentid": agent_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code",
            "scope": "snsapi_base",
        })
        return f"https://open.weixin.qq.com/connect/oauth2/authorize?{params}#wechat_redirect"

    async def get_user_info(self, code: str, redirect_uri: str) -> SSOUserInfo:
        corp_id = self.config.get("WxworkCorpId", "")
        secret = self.config.get("WxworkSecret", "")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Get access token
            token_resp = await client.get(
                "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
                params={"corpid": corp_id, "corpsecret": secret},
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise ValueError("WeChat Work: No access_token")

            # Step 2: Get user info by code
            user_resp = await client.get(
                "https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo",
                params={"access_token": access_token, "code": code},
            )
            user_resp.raise_for_status()
            user_data = user_resp.json()
            user_id = user_data.get("UserId", "")

            if not user_id:
                raise ValueError("WeChat Work: No UserId in response")

            # Step 3: Get user detail
            detail_resp = await client.get(
                "https://qyapi.weixin.qq.com/cgi-bin/user/get",
                params={"access_token": access_token, "userid": user_id},
            )
            detail_resp.raise_for_status()
            detail = detail_resp.json()

        return SSOUserInfo(
            provider="wxwork",
            provider_user_id=user_id,
            name=detail.get("name", user_id),
            email=detail.get("email", ""),
            avatar=detail.get("avatar", ""),
        )


# ── Provider registry ─────────────────────────────────────────────────

_PROVIDERS: dict[str, type[SSOProvider]] = {
    "dingtalk": DingTalkProvider,
    "feishu": FeishuProvider,
    "wxwork": WxWorkProvider,
}


def get_provider(protocol: str, config: dict) -> Optional[SSOProvider]:
    """Get a configured SSO provider instance."""
    cls = _PROVIDERS.get(protocol)
    if cls is None:
        return None
    return cls(config)


def get_provider_config(db: Session, protocol: str) -> dict:
    """Get the configuration for a specific SSO provider."""
    prefix_map = {
        "dingtalk": "Dingtalk",
        "feishu": "Feishu",
        "wxwork": "Wxwork",
    }
    prefix = prefix_map.get(protocol)
    if not prefix:
        return {}
    return get_all_configs(db, prefix)


def get_enabled_providers(db: Session) -> list[str]:
    """Return list of enabled SSO provider keys.

    A provider is considered enabled when its required config keys are present.
    """
    enabled = []
    checks = {
        "dingtalk": ("DingtalkAppKey", "DingtalkAppSecret"),
        "feishu": ("FeishuAppId", "FeishuAppSecret"),
        "wxwork": ("WxworkCorpId", "WxworkSecret"),
    }
    for protocol, required_keys in checks.items():
        config = get_provider_config(db, protocol)
        if all(config.get(k) for k in required_keys):
            enabled.append(protocol)
    return enabled


async def sso_login(
    db: Session,
    protocol: str,
    code: str,
    redirect_uri: str,
) -> dict:
    """Complete SSO login flow.

    Returns JWT token dict on success, or raises ValueError.
    """
    config = get_provider_config(db, protocol)
    provider = get_provider(protocol, config)
    if not provider:
        raise ValueError(f"不支持的 SSO 协议: {protocol}")

    # Get user info from provider
    user_info = await provider.get_user_info(code, redirect_uri)

    # Look up existing binding
    external = db.query(ExternalUser).filter(
        ExternalUser.app_id == user_info.provider,
        ExternalUser.app_user == user_info.provider_user_id,
    ).first()

    if external:
        # Existing user — log them in
        local_user = db.query(User).filter(User.user_id == external.bind_user).first()
        if not local_user or local_user.is_disabled:
            raise ValueError("用户已被禁用或不存在")
    else:
        # Try to match by email, or create a new user
        if user_info.email:
            local_user = db.query(User).filter(User.email == user_info.email).first()
        else:
            local_user = None

        if not local_user:
            # Create a new user
            import uuid
            user_id = uuid.uuid4().hex[:20]
            login_name = f"{protocol}_{user_info.provider_user_id[:30]}"

            local_user = User(
                user_id=user_id,
                login_name=login_name,
                password="",  # SSO users have no password
                full_name=user_info.name or login_name,
                email=user_info.email,
                avatar_url=user_info.avatar,
                is_active=True,
                is_disabled=False,
            )
            db.add(local_user)
            db.flush()

        # Create binding
        binding = ExternalUser(
            bind_user=local_user.user_id,
            app_id=user_info.provider,
            app_user=user_info.provider_user_id,
        )
        db.add(binding)

    db.commit()

    # Issue JWT
    token = create_access_token(user_id=local_user.user_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": local_user.user_id,
            "full_name": local_user.full_name,
            "email": local_user.email,
            "avatar_url": local_user.avatar_url,
        },
    }
