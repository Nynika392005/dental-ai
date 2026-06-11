from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# Initialize Motor Client
client = AsyncIOMotorClient(settings.MONGODB_URL)

# Extract database name from connection string, default to 'dentai'
db_name = "dentai"
parts = settings.MONGODB_URL.split("://")
if len(parts) > 1:
    path_part = parts[1].split("/")[-1]
    name = path_part.split("?")[0]
    if name:
        db_name = name

db = client[db_name]

async def get_db():
    """Dependency provider yielding the async database instance"""
    yield db
