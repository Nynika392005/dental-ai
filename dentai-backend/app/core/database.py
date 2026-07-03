import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

_db_instance = None

async def check_db_connection():
    """Production-grade MongoDB connection management."""
    global _db_instance
    if _db_instance is not None:
        return _db_instance

    try:
        # settings.MONGODB_URL should be your MongoDB Atlas or Render Postgres string
        # If you are using PostgreSQL, we should revert to SQLAlchemy.
        # Given your current logic is NoSQL, we will enforce a real MongoDB connection.
        client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)

        # Ping the server to verify connection
        await client.admin.command('ismaster')

        db_name = settings.MONGODB_URL.split('/')[-1] or "dentai"
        _db_instance = client[db_name]
        logger.info(f"Connected to production database: {db_name}")
        return _db_instance

    except Exception as e:
        logger.critical(f"DATABASE CONNECTION FAILED: {e}")
        # In production, we fail fast. The app should not run without a DB.
        raise RuntimeError("Could not connect to a production database. JSON fallback is disabled for security.")

async def get_db():
    db = await check_db_connection()
    yield db
