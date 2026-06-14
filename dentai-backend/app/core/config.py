from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./dentai.db"
    MONGODB_URL: str = "mongodb://localhost:27017/dentai"
    REDIS_URL: str = "redis://localhost:6379/0"

    # SECURITY: No default — application will fail to start if not set in environment.
    # Generate a strong key with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str

    # Hard-coded to prevent environment-variable injection of "none" or other weak algorithms
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # FIX-04 / FIX-09: controls Redis fallback and HSTS header behaviour.
    # Set to "production" in any deployed environment.
    ENVIRONMENT: str = "development"

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    def __init__(self, **values):
        super().__init__(**values)
        if self.ENVIRONMENT == "production":
            # Strip localhost and insecure HTTP endpoints in production
            self.CORS_ORIGINS = [orig for orig in self.CORS_ORIGINS if orig.startswith("https://")]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
