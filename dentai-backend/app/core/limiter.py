import logging
from fastapi import Request
from slowapi import Limiter
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_ip_key(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

# Production Resilience:
# Fall back to memory if REDIS_URL is local/missing in a cloud environment.
_storage_uri = "memory://"

if settings.ENVIRONMENT == "production":
    if settings.REDIS_URL and "localhost" not in settings.REDIS_URL:
        _storage_uri = settings.REDIS_URL
    else:
        logger.warning("No remote REDIS_URL found for production. Falling back to memory storage for rate limiting.")
elif settings.REDIS_URL and "localhost" not in settings.REDIS_URL:
    _storage_uri = settings.REDIS_URL

limiter = Limiter(key_func=get_ip_key, storage_uri=_storage_uri)
