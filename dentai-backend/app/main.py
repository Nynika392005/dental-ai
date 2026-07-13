import logging
import asyncio
from datetime import datetime
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

async def auto_mark_missed_appointments_loop():
    logger.info("Starting auto-mark missed appointments background loop")
    while True:
        try:
            from app.core.database import check_db_connection
            db = await check_db_connection()
            now_dt = datetime.utcnow()
            cursor = db["appointments"].find({"status": "Upcoming"})
            async for doc in cursor:
                scheduled_at_str = doc.get("scheduled_at")
                if scheduled_at_str:
                    try:
                        scheduled_dt = datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00')).replace(tzinfo=None)
                        if scheduled_dt < now_dt:
                            await db["appointments"].update_one(
                                {"_id": doc["_id"]},
                                {"$set": {"status": "Missed"}}
                            )
                            logger.info(f"Background task automatically marked appointment {doc['_id']} as Missed")
                    except Exception as e:
                        logger.error(f"Error checking status for appointment {doc.get('_id')}: {e}")
        except Exception as e:
            logger.error(f"Error in auto-mark missed loop: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"DentAI API starting up (env={settings.ENVIRONMENT})")
    try:
        from app.core.database import check_db_connection
        db = await check_db_connection()
        logger.info("Database connection established.")
        
        # Ensure the unique compound index exists on appointments (Feature 1)
        try:
            await db["appointments"].drop_index("dentist_id_1_scheduled_at_1")
            logger.info("Dropped existing dentist_id_1_scheduled_at_1 index.")
        except Exception:
            pass

        await db["appointments"].create_index(
            [("dentist_id", 1), ("scheduled_at", 1)],
            unique=True,
            partialFilterExpression={"status": "Upcoming"}
        )
        logger.info("Created unique compound index for Upcoming appointments.")
        
        # Start auto-mark missed loop
        asyncio.create_task(auto_mark_missed_appointments_loop())
    except Exception as e:
        logger.error(f"Database connection or index creation failure: {e}")
    try:
        from app.core.redis import get_redis
        await get_redis()
        logger.info("Redis connection established.")
    except Exception as e:
        logger.error(f"Redis connection failure: {e}")
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
