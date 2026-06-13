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
        extra="ignore",
    )


# SECURITY: Removed hardcoded fallback secret key.
# If SECRET_KEY is missing from the environment, pydantic-settings will raise
# a ValidationError and the application will refuse to start — which is the
# correct behaviour. Never add a default value for SECRET_KEY.
settings = Settings()
