import logging
import os
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

class _MockRedis:
    """In-memory fallback for environments without a Redis server."""
    def __init__(self) -> None:
        import time
        self._store: dict[str, tuple[str, float]] = {}
        self._time = time

    def _is_expired(self, key: str) -> bool:
        entry = self._store.get(key)
        if entry is None: return True
        return self._time.time() > entry[1]

    async def setex(self, key: str, seconds: int, value: str) -> None:
        self._store[key] = (value, self._time.time() + seconds)

    async def get(self, key: str) -> str | None:
        if self._is_expired(key):
            self._store.pop(key, None)
            return None
        return self._store[key][0]

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def ping(self) -> bool:
        return True

_redis_client = None

async def get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        # Check if URL looks like a placeholder or is default localhost in production
        is_prod = settings.ENVIRONMENT == "production"
        is_default = "localhost" in settings.REDIS_URL

        if is_prod and is_default:
            logger.warning("Production mode active but no remote REDIS_URL provided. Using memory fallback.")
            _redis_client = _MockRedis()
            return _redis_client

        client = aioredis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=1,
            socket_timeout=1
        )
        await client.ping()
        logger.info("Connected to Redis successfully.")
        _redis_client = client
    except Exception as e:
        logger.error(f"Redis connection failed ({e}). Using memory fallback.")
        _redis_client = _MockRedis()

    return _redis_client
