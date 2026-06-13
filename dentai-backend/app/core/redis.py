import logging
import os
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Real Redis client with an in-process fallback for LOCAL DEVELOPMENT ONLY.
#
# FIX-04: MockRedis TTL gap — the previous implementation accepted a `seconds`
# argument in setex() but silently discarded it, meaning revoked tokens never
# expired and survived process restarts.
#
# This version:
#   1. Honours TTL by storing (value, expiry_timestamp) pairs and checking expiry
#      on every get() call — making the fallback behaviorally correct.
#   2. Emits a CRITICAL log when the fallback is activated so the operator is
#      clearly alerted.
#   3. Refuses to activate the fallback when ENVIRONMENT=production, causing a
#      hard startup failure instead of silently degrading security.
# ---------------------------------------------------------------------------


class _MockRedis:
    """
    In-memory fallback used only when Redis is unavailable in non-production
    environments. TTLs are honoured via expiry timestamps checked on read.
    WARNING: revocations are still lost on process restart — use real Redis
    in any environment where sessions must survive a restart.
    """

    def __init__(self) -> None:
        import time
        self._store: dict[str, tuple[str, float]] = {}  # key -> (value, expiry_ts)
        self._time = time

    def _is_expired(self, key: str) -> bool:
        entry = self._store.get(key)
        if entry is None:
            return True
        _, expiry = entry
        return self._time.time() > expiry

    async def setex(self, key: str, seconds: int, value: str) -> None:
        expiry = self._time.time() + seconds
        self._store[key] = (value, expiry)

    async def get(self, key: str) -> str | None:
        if self._is_expired(key):
            self._store.pop(key, None)
            return None
        return self._store[key][0]

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
        # FIX-04: hard-fail in production — never silently degrade token revocation
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment == "production":
            logger.critical(
                "Redis is unreachable in production (%s). "
                "Refusing to start with MockRedis — token revocation would be broken. "
                "Set REDIS_URL to a reachable Redis instance.",
                exc,
            )
            raise RuntimeError(
                "Redis is required in production for token revocation. "
                "Set REDIS_URL to a reachable Redis instance."
            ) from exc

        logger.critical(
            "Redis unavailable (%s). Falling back to in-process MockRedis — "
            "TTLs are now honoured in-memory but revocations will be lost on restart. "
            "Set ENVIRONMENT=production to prevent this fallback.",
            exc,
        )
        _redis_client = _MockRedis()

    return _redis_client
