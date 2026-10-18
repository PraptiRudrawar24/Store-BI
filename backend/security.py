import os
import secrets
import hashlib
import base64
from typing import Tuple, Optional
import bcrypt
from fastapi import Response

COOKIE_NAME = "store_bi_session"
OAUTH_STATE_COOKIE = "store_bi_oauth_state"
OAUTH_VERIFIER_COOKIE = "store_bi_oauth_verifier"

def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using bcrypt with a generated salt.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Cryptographically verifies a plaintext password against a bcrypt hash.
    Safely handles None, empty strings, and malformed hashes.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Enforces production password policy:
    - Minimum 8 characters
    - At least one letter
    - At least one digit
    """
    if not password:
        return False, "Password cannot be empty."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    return True, ""

def generate_secure_token(length: int = 32) -> str:
    """
    Generates a cryptographically strong URL-safe token.
    """
    return secrets.token_urlsafe(length)

def generate_pkce_pair() -> Tuple[str, str]:
    """
    Generates a high-entropy PKCE code_verifier and the corresponding
    SHA-256 base64url-encoded code_challenge (RFC 7636).
    """
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return code_verifier, code_challenge

def get_cookie_security_config() -> dict:
    """
    Returns production-hardened cookie attributes based on environment variables:
    - In production or HTTPS environments: secure=True, httponly=True, samesite=Lax
    - In development (HTTP localhost): secure=False to allow local browser cookies
    """
    env = os.environ.get("ENVIRONMENT", "development").lower()
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    explicit_secure = os.environ.get("COOKIE_SECURE", "").lower()

    if explicit_secure in ("true", "1", "yes"):
        secure = True
    elif explicit_secure in ("false", "0", "no"):
        secure = False
    else:
        secure = env == "production" or frontend_url.startswith("https://")

    samesite = os.environ.get("COOKIE_SAMESITE", "lax").lower()
    if samesite not in ("lax", "strict", "none"):
        samesite = "lax"

    return {
        "httponly": True,
        "secure": secure,
        "samesite": samesite,
        "max_age": 7 * 24 * 3600,
    }

def set_auth_cookie(response: Response, token: str):
    """
    Sets the httpOnly session cookie using secure attributes.
    """
    cfg = get_cookie_security_config()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=cfg["httponly"],
        secure=cfg["secure"],
        samesite=cfg["samesite"],
        max_age=cfg["max_age"],
        path="/",
    )

def clear_auth_cookie(response: Response):
    """
    Clears the httpOnly session cookie.
    """
    cfg = get_cookie_security_config()
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=cfg["secure"],
        httponly=cfg["httponly"],
        samesite=cfg["samesite"],
    )

def is_safe_redirect_url(target: Optional[str]) -> bool:
    """
    Prevents open-redirect attacks by ensuring destination is:
    - Relative (starts with '/' and not '//' or '/\\')
    - Or belongs strictly to FRONTEND_URL
    """
    if not target:
        return False
    target = target.strip()
    if target.startswith("/") and not target.startswith("//") and not target.startswith("/\\"):
        return True
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    if target.startswith(frontend_url):
        return True
    return False
