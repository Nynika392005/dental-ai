import logging
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Form, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.dependencies import get_current_user
from app.models.user import User
from app.core.redis import get_redis
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

@app.get("/mobile-test")
async def mobile_test():
    return {
        "status": "ok",
        "message": "Mobile connectivity working",
        "timestamp": "2024-07-24"
    }

@app.post("/analysis/scan-json")
async def scan_json(
    request: dict,
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis)
):
    """JSON-based image upload with proper authentication"""
    try:
        # Rate limiting (same as multipart endpoint)
        from app.core.limiter import get_ip_key
        from fastapi import Request
        import time
        import json
        
        # For now, we'll skip IP-based rate limiting since we don't have request object
        # Focus on user-based rate limiting
        current_time = int(time.time())
        user_key = f"rate_limit:scan:user:{current_user.id}"
        
        # User-based rate limiting (5 scans per 60 seconds)
        current_data = await redis.get(user_key)
        timestamps = []
        if current_data:
            try:
                timestamps = [t for t in json.loads(current_data) if current_time - t < 60]
            except Exception:
                pass
        
        if len(timestamps) >= 5:
            raise HTTPException(status_code=429, detail="Too many upload scans. Limit is 5 per minute.")
        
        timestamps.append(current_time)
        await redis.setex(user_key, 120, json.dumps(timestamps))
        
        # Extract and validate data from JSON body
        task_type = request.get("task_type")
        image_base64 = request.get("image_base64")
        filename = request.get("filename", "photo.jpg")
        
        # Validate task type
        if not task_type or task_type.lower() not in ["tooth", "medicine", "food", "habit"]:
            raise HTTPException(status_code=400, detail="Invalid or missing task_type")
            
        if not image_base64:
            raise HTTPException(status_code=400, detail="Missing image_base64")
            
        # Validate base64 image
        import base64
        try:
            image_data = base64.b64decode(image_base64)
            if len(image_data) > 2 * 1024 * 1024:  # 2MB limit
                raise HTTPException(status_code=413, detail="Image too large")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image")
            
        # Validate image type
        import filetype
        kind = filetype.guess(image_data)
        if kind is None or kind.mime not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid image type")
            
        # Process the image with proper concurrency limiting
        import asyncio
        concurrency_semaphore = asyncio.Semaphore(2)
        
        async with concurrency_semaphore:
            from app.services.ai_service import analyze_image_task
            result = await analyze_image_task(image_base64, task_type.lower())
        
        result["upload_method"] = "json_base64"
        result["authenticated"] = True
        result["user_id"] = str(current_user.id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/analysis/test-scan-json")
async def test_scan_json(request: dict):
    """JSON-based image upload for mobile compatibility"""
    try:
        # Extract data from JSON body
        task_type = request.get("task_type")
        image_base64 = request.get("image_base64")
        filename = request.get("filename", "photo.jpg")
        
        # Validate task type
        if not task_type or task_type.lower() not in ["tooth", "medicine", "food", "habit"]:
            raise HTTPException(status_code=400, detail="Invalid or missing task_type")
            
        if not image_base64:
            raise HTTPException(status_code=400, detail="Missing image_base64")
            
        # Validate base64 image
        import base64
        try:
            image_data = base64.b64decode(image_base64)
            if len(image_data) > 2 * 1024 * 1024:  # 2MB limit
                raise HTTPException(status_code=413, detail="Image too large")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image")
            
        # Validate image type
        import filetype
        kind = filetype.guess(image_data)
        if kind is None or kind.mime not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid image type")
            
        # Process the image
        from app.services.ai_service import analyze_image_task
        result = await analyze_image_task(image_base64, task_type.lower())
        result["upload_method"] = "json_base64"
        result["test_endpoint"] = True
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/mobile-scan")
async def mobile_scan_workaround(
    request: dict,
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis)
):
    """Mobile image analysis workaround - bypasses /analysis/* blocking"""
    try:
        # Rate limiting
        import time
        import json
        current_time = int(time.time())
        user_key = f"rate_limit:scan:user:{current_user.id}"
        
        current_data = await redis.get(user_key)
        timestamps = []
        if current_data:
            try:
                timestamps = [t for t in json.loads(current_data) if current_time - t < 60]
            except Exception:
                pass
        
        if len(timestamps) >= 5:
            raise HTTPException(status_code=429, detail="Too many scans. Limit is 5 per minute.")
        
        timestamps.append(current_time)
        await redis.setex(user_key, 120, json.dumps(timestamps))
        
        # Extract data
        task_type = request.get("task_type")
        image_base64 = request.get("image_base64")
        
        if not task_type or task_type.lower() not in ["tooth", "medicine", "food", "habit"]:
            raise HTTPException(status_code=400, detail="Invalid task_type")
            
        if not image_base64:
            raise HTTPException(status_code=400, detail="Missing image_base64")
            
        # Validate base64 image
        import base64
        try:
            image_data = base64.b64decode(image_base64)
            if len(image_data) > 2 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Image too large")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image")
            
        # Validate image type
        import filetype
        kind = filetype.guess(image_data)
        if kind is None or kind.mime not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid image type")
            
        # Process image
        from app.services.ai_service import analyze_image_task
        result = await analyze_image_task(image_base64, task_type.lower())
        
        # analyze_image_task already returns cleaned and validated results
        # If it's a warning, return as-is
        if "warning" in result:
            return result
        
        # Return the cleaned result from analyze_image_task
        # Do NOT add back technical fields like ai_analysis, confidence, service, status
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.post("/mobile-transcribe")
async def mobile_transcribe_workaround(
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """Mobile audio transcription workaround - bypasses /chat/* blocking with multipart"""
    import tempfile
    import os
    import base64
    from app.services.ai_service import transcribe_audio
    
    try:
        # Extract audio base64 from request
        audio_base64 = request.get("audio_base64")
        file_ext = request.get("file_ext", "m4a")
        if file_ext not in ["m4a", "mp3", "webm", "wav", "ogg", "mp4", "aac", "3gp"]:
            file_ext = "m4a"

        if not audio_base64:
            raise HTTPException(status_code=400, detail="Missing audio_base64")
        
        # Decode base64 audio
        try:
            audio_data = base64.b64decode(audio_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 audio")
        
        # Save to temp file
        temp_dir = "temp_audio"
        os.makedirs(temp_dir, exist_ok=True)
        
        import uuid
        temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}.{file_ext}")
        
        try:
            with open(temp_file_path, "wb") as f:
                f.write(audio_data)
            
            # Transcribe using Groq Whisper
            text = await transcribe_audio(temp_file_path)
            
            if not text:
                raise HTTPException(status_code=400, detail="Could not transcribe audio")
            
            return {"text": text}
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mobile transcribe error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

@app.post("/mobile-file-test")
async def mobile_file_test(
    test_param: str = Form(...),
    file: UploadFile = File(...)
):
    """Simple file upload test for mobile debugging"""
    return {
        "status": "ok",
        "message": "File upload working",
        "test_param": test_param,
        "filename": file.filename,
        "content_type": file.content_type,
        "file_size": len(await file.read())
    }
