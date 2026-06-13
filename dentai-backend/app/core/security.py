import uuid
import bcrypt
import logging
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from app.core.config import settings

logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def _build_token(subject: Union[str, Any], role: str, token_type: str, expire: datetime) -> str:
    """Internal helper — always pins algorithm to HS256."""
    jti = str(uuid.uuid4())  # unique token ID for revocation
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "type": token_type,
        "jti": jti,
    }
    # SECURITY: algorithm is hard-coded here, not read from config, to prevent
    # an attacker from injecting ALGORITHM=none via environment variables.
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def create_access_token(subject: Union[str, Any], role: str, expires_delta: timedelta = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return _build_token(subject, role, "access", expire)


def create_refresh_token(subject: Union[str, Any], role: str, expires_delta: timedelta = None) -> str:
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return _build_token(subject, role, "refresh", expire)
