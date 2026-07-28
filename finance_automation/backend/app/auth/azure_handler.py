import time
import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient
from config import settings

AZURE_AD_KEYS_URL = (
    f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/discovery/v2.0/keys"
)
AZURE_AD_ISSUER = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/v2.0"

_jwk_client: PyJWKClient | None = None
_jwk_client_time: float = 0
_JWK_CACHE_TTL = 3600


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client, _jwk_client_time
    now = time.time()
    if _jwk_client is None or (now - _jwk_client_time) > _JWK_CACHE_TTL:
        _jwk_client = PyJWKClient(AZURE_AD_KEYS_URL, cache_keys=True)
        _jwk_client_time = now
    return _jwk_client


def validate_azure_token(id_token: str) -> dict:
    if not settings.AZURE_CLIENT_ID or not settings.AZURE_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure AD is not configured. Please set AZURE_CLIENT_ID and AZURE_TENANT_ID.",
        )

    try:
        jwk_client = _get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(id_token)

        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.AZURE_CLIENT_ID,
            issuer=AZURE_AD_ISSUER,
            options={"verify_exp": True},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Azure AD token has expired. Please sign in again.",
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Azure AD token audience.",
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Azure AD token issuer.",
        )
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to decode Azure AD token.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Azure AD token validation failed: {str(e)}",
        )


def get_azure_user_info(id_token: str) -> dict:
    claims = validate_azure_token(id_token)

    email = claims.get("preferred_username") or claims.get("email", "")
    name = claims.get("name", "")
    oid = claims.get("oid", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Azure AD token does not contain an email address.",
        )

    return {"email": email.lower(), "name": name, "oid": oid}
