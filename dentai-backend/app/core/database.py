import logging
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

_db_instance = None

def _parse_db_name(url: str) -> str:
    """
    Reliably extract the database name from a MongoDB URI.
    mongodb+srv://user:pass@host/DBNAME?params  →  DBNAME
    Falls back to 'dentai' if the path is missing or empty.
    """
    try:
        path = urlparse(url).path  # e.g. '/dentai'
        name = path.lstrip('/')
        return name if name else "dentai"
    except Exception:
        return "dentai"

async def check_db_connection():
    """Production-grade MongoDB connection management."""
    global _db_instance
    if _db_instance is not None:
        return _db_instance

    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=3000)
        await client.admin.command('ismaster')

        db_name = _parse_db_name(settings.MONGODB_URL)
        _db_instance = client[db_name]
        logger.info(f"Connected to production database: '{db_name}'")
        return _db_instance

    except Exception as e:
        logger.critical(f"DATABASE CONNECTION FAILED: {e}")
        raise RuntimeError("Could not connect to a production database.")

async def get_db():
    db = await check_db_connection()
    yield db
