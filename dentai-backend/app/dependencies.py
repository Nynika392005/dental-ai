import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.database import get_db
from app.core.config import settings
from app.core.redis import get_redis
from app.models.user import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
    redis=Depends(get_redis),
) -> User:
    try:
        # SECURITY: algorithm is hard-coded to HS256, never read from the token
        # header, to prevent algorithm-confusion / "alg:none" attacks.
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

        email: str | None = payload.get("sub")
        if not email:
            raise _CREDENTIALS_EXCEPTION

        # SECURITY: reject refresh tokens used as access tokens.
        if payload.get("type") != "access":
            raise _CREDENTIALS_EXCEPTION

        # SECURITY: check the token has not been explicitly revoked (logout).
        jti: str | None = payload.get("jti")
        if jti:
            revoked = await redis.get(f"revoked_jti:{jti}")
            if revoked:
                raise _CREDENTIALS_EXCEPTION

    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user_doc = await db["users"].find_one({"email": email})
    if user_doc is None:
        raise _CREDENTIALS_EXCEPTION

    user = User(**user_doc)

    # SECURITY: block unverified accounts from accessing the API.
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please verify your email before logging in.",
        )

    return user


def require_role(roles: list[str]):
    """Dependency factory — use as Depends(require_role(['dentist', 'admin']))."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        role_str = (
            current_user.role.value
            if hasattr(current_user.role, "value")
            else str(current_user.role)
        )
        if role_str not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted",
            )
        return current_user

    return role_checker
