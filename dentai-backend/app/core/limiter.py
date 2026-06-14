import logging
from fastapi import Request
from slowapi import Limiter
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_ip_key(request: Request) -> str:
    """
    Extract client IP address in a proxy-safe manner checking the X-Forwarded-For header.
    Falls back to request.client.host if not behind a proxy.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For may contain a list of comma-separated IPs. First is the real client IP.
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

# In production mode, require a Redis-backed storage engine.
# In development, check if a valid Redis URI is provided, otherwise default to memory.
_storage_uri = "memory://"
if settings.ENVIRONMENT == "production":
    _storage_uri = settings.REDIS_URL
elif settings.REDIS_URL and "<" not in settings.REDIS_URL:
    _storage_uri = settings.REDIS_URL

logger.info("Initializing shared SlowAPI Limiter with storage_uri: %s", _storage_uri)
limiter = Limiter(key_func=get_ip_key, storage_uri=_storage_uri)
