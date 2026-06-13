import logging
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Real Redis client with an in-process fallback for local development only.
# The fallback does NOT honour TTLs — tokens placed in it will never expire
# automatically.  In production, REDIS_URL must point to a real Redis server.
# ---------------------------------------------------------------------------


class _MockRedis:
    """
    In-memory fallback used when Redis is unavailable (local dev only).
    WARNING: This has no TTL support — revoked tokens stored here will persist
    for the lifetime of the process and will be lost on restart.
    This must never be used in production.
    """

    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    async def setex(self, key: str, seconds: int, value: str) -> None:
        self._store[key] = value

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def ping(self) -> bool:
        return True


_redis_client: aioredis.Redis | _MockRedis | None = None


async def get_redis() -> aioredis.Redis | _MockRedis:
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await client.ping()
        logger.info("Connected to Redis at %s", settings.REDIS_URL)
        _redis_client = client
    except Exception as exc:
        logger.warning(
            "Redis unavailable (%s). Falling back to in-process MockRedis — "
            "DO NOT use in production. Token revocation will not survive restarts.",
            exc,
        )
        _redis_client = _MockRedis()

    return _redis_client
