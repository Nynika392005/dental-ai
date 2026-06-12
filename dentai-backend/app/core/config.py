from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./dentai.db"
    MONGODB_URL: str = "mongodb://localhost:27017/dentai"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str  # No default — must be set via environment variable
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Provide a fallback only for local dev if SECRET_KEY is truly missing
import os
if not os.getenv("SECRET_KEY"):
    import os as _os
    _os.environ.setdefault("SECRET_KEY", "dev-only-insecure-key-change-in-production")

settings = Settings()
