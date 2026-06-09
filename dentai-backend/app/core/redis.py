import redis.asyncio as redis
from app.core.config import settings

class MockRedis:
    def __init__(self):
        self.store = {}
    async def setex(self, key, time, value):
        self.store[key] = value
    async def get(self, key):
        return self.store.get(key)
    async def delete(self, key):
        if key in self.store:
            del self.store[key]

redis_client = MockRedis()

async def get_redis():
    return redis_client
