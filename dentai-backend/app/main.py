import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.routers import (
    auth,
    chat as chat_router,
    education as education_router,
    appointments,
    symptom_checker as symptom_router,
    ai_analysis,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"DentAI API starting up (env={settings.ENVIRONMENT})")
    try:
        from app.core.database import check_db_connection
        await check_db_connection()
        logger.info("Database connection established.")
    except Exception as e:
        logger.error(f"Database connection failure: {e}")
    yield
    logger.info("DentAI API shutting down")

app = FastAPI(
    title="DentAI Professional API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs"
)

# Standard Security Middlewares (CORS, Rate Limiting)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(chat_router.router)
app.include_router(education_router.router)
app.include_router(appointments.router)
app.include_router(symptom_router.router)
app.include_router(ai_analysis.router)

@app.get("/")
async def root():
    return {
        "service": "DentAI API",
        "status": "operational",
        "environment": settings.ENVIRONMENT
    }
