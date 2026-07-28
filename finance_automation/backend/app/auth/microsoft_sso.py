"""
Microsoft OAuth 2.0 Authorization Code Flow with PKCE — Option B
-----------------------------------------------------------------
Flow:
  1. Frontend calls GET /api/auth/microsoft/login
     → Backend generates PKCE pair, encrypts state, returns { auth_url }
  2. Frontend redirects browser to auth_url
  3. Microsoft authenticates user, redirects to:
       http://localhost:3000?code=xxx&state=xxx  (redirect URI registered as Web platform)
  4. RootHandler in App.jsx detects code+state → renders AuthCallback
  5. AuthCallback POSTs { code, state } to POST /api/auth/microsoft/finish
  6. Backend decrypts state → gets code_verifier → exchanges code for MS token
     → calls Graph /v1.0/me → upserts user → returns local JWT
"""

import base64
import hashlib
import json
import os
import time
from typing import Optional

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status

from config import settings


# ---------------------------------------------------------------------------
# Fernet key management
# ---------------------------------------------------------------------------

def _get_fernet() -> Fernet:
    """Return a Fernet instance, generating a temporary in-memory key if
    STATE_ENCRYPTION_KEY is not set in .env (useful for development)."""
    key = settings.STATE_ENCRYPTION_KEY
    if not key:
        # Warn but don't crash — generate ephemeral key per process startup
        import warnings
        warnings.warn(
            "STATE_ENCRYPTION_KEY is not set. Using an ephemeral in-memory key. "
            "State tokens will be invalidated on server restart. "
            "Set STATE_ENCRYPTION_KEY in your .env file for production.",
            RuntimeWarning,
            stacklevel=2,
        )
        return Fernet(Fernet.generate_key())
    # Accept raw key string or base64-encoded key
    try:
        return Fernet(key.encode())
    except Exception:
        raise RuntimeError(
            "STATE_ENCRYPTION_KEY is invalid. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )


# Initialise once at import time (singleton per process)
_fernet: Optional[Fernet] = None


def _fernet_instance() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = _get_fernet()
    return _fernet


# ---------------------------------------------------------------------------
# PKCE helpers
# ---------------------------------------------------------------------------

def generate_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) using S256 method."""
    code_verifier = base64.urlsafe_b64encode(os.urandom(40)).rstrip(b"=").decode()
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return code_verifier, code_challenge


# ---------------------------------------------------------------------------
# AES-256 state encryption / decryption
# ---------------------------------------------------------------------------

STATE_TTL_SECONDS = 300  # 5 minutes


def encrypt_state(payload: dict) -> str:
    """Encrypt a dict payload (including code_verifier + timestamp) using Fernet."""
    payload["_ts"] = time.time()
    raw = json.dumps(payload).encode()
    return _fernet_instance().encrypt(raw).decode()


def decrypt_state(token: str) -> dict:
    """Decrypt and validate state token. Raises HTTPException on failure."""
    try:
        raw = _fernet_instance().decrypt(token.encode(), ttl=STATE_TTL_SECONDS)
        return json.loads(raw)
    except InvalidToken:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state. Please try signing in again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process OAuth state: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Microsoft auth URL builder
# ---------------------------------------------------------------------------

MICROSOFT_AUTH_ENDPOINT = (
    "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
)
MICROSOFT_TOKEN_ENDPOINT = (
    "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
)
GRAPH_ME_ENDPOINT = "https://graph.microsoft.com/v1.0/me"


def build_authorization_url(code_challenge: str, encrypted_state: str) -> str:
    """Build the full Microsoft authorization URL with PKCE."""
    tenant_id = settings.AZURE_TENANT_ID
    client_id = settings.AZURE_CLIENT_ID
    redirect_uri = settings.MICROSOFT_REDIRECT_URI

    if not tenant_id or not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Microsoft SSO is not configured. Set AZURE_CLIENT_ID and AZURE_TENANT_ID in .env",
        )

    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "openid profile email User.Read",
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "state": encrypted_state,
    }

    base_url = MICROSOFT_AUTH_ENDPOINT.format(tenant_id=tenant_id)
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{base_url}?{query}"


# ---------------------------------------------------------------------------
# Token exchange
# ---------------------------------------------------------------------------

async def exchange_code_for_token(code: str, code_verifier: str) -> dict:
    """Exchange authorization code for Microsoft access token (server-side)."""
    tenant_id = settings.AZURE_TENANT_ID
    token_url = MICROSOFT_TOKEN_ENDPOINT.format(tenant_id=tenant_id)

    data = {
        "client_id": settings.AZURE_CLIENT_ID,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
        "code_verifier": code_verifier,
    }
    # Include client_secret if configured (confidential client)
    if settings.MICROSOFT_CLIENT_SECRET:
        data["client_secret"] = settings.MICROSOFT_CLIENT_SECRET

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data, timeout=15.0)

    if response.status_code != 200:
        error_detail = response.json().get("error_description", response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Microsoft token exchange failed: {error_detail}",
        )

    return response.json()


# ---------------------------------------------------------------------------
# Microsoft Graph — fetch user profile
# ---------------------------------------------------------------------------

async def get_graph_user(access_token: str) -> dict:
    """Fetch user info from Microsoft Graph /v1.0/me."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            GRAPH_ME_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch user profile from Microsoft Graph.",
        )

    data = response.json()
    return {
        "microsoft_id": data.get("id", ""),
        "display_name": data.get("displayName", ""),
        "mail": data.get("mail") or data.get("userPrincipalName", ""),
        "upn": data.get("userPrincipalName", ""),
    }


# ---------------------------------------------------------------------------
# Service/employee number extraction
# ---------------------------------------------------------------------------

def extract_service_number(upn: str) -> str:
    """Extract service/employee number from UPN prefix.
    e.g. '012345@slt.com.lk' → '012345'
    Returns empty string if UPN has no '@' or prefix is not numeric."""
    if not upn or "@" not in upn:
        return ""
    prefix = upn.split("@")[0]
    # Return as-is (could be alphanumeric service ID)
    return prefix
