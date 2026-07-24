import base64
import logging
import asyncio
import time
import json
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request

from app.dependencies import get_current_user
from app.models.user import User
from app.services.ai_service import analyze_image_task
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_TASK_TYPES = {"tooth", "medicine", "food", "habit"}
# Reduced from 5MB to 2MB to minimize base64 memory overhead and AI processing costs
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

# Concurrency limiter to prevent DoS on processing resources
concurrency_semaphore = asyncio.Semaphore(2)

@router.post("/scan")
async def scan_image(
    request: Request,
    task_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis)
):
    # --- Rate Limiting Checks ---
    # IP-based rate limiting (5 scans per 60 seconds)
    # User-based rate limiting (5 scans per 60 seconds)
    # Use proxy-safe IP key derivation
    from app.core.limiter import get_ip_key
    ip_addr = get_ip_key(request)
    current_time = int(time.time())
    
    ip_key = f"rate_limit:scan:ip:{ip_addr}"
    user_key = f"rate_limit:scan:user:{current_user.id}"
    
    # Custom atomic sliding window checking logic compatible with MockRedis and real Redis
    for key, limit_val in [(ip_key, 5), (user_key, 5)]:
        # Using a list string representation in redis to keep track of query timestamps
        current_data = await redis.get(key)
        timestamps = []
        if current_data:
            try:
                timestamps = [t for t in json.loads(current_data) if current_time - t < 60]
            except Exception:
                pass
        
        if len(timestamps) >= limit_val:
            raise HTTPException(status_code=429, detail="Too many upload scans. Limit is 5 per minute.")
        
        timestamps.append(current_time)
        await redis.setex(key, 120, json.dumps(timestamps))

    # --- Task Validation ---
    if task_type.strip().lower() not in ALLOWED_TASK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task_type. Must be one of: {sorted(ALLOWED_TASK_TYPES)}",
        )

    # Validate MIME type from Content-Type header (client-supplied — not trusted alone)
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed (JPEG, PNG, WEBP)",
        )

    # --- Streaming read and size control (reject before reading everything in memory) ---
    content_chunks = []
    total_bytes = 0
    # Read stream chunks iteratively (64 KB each)
    while True:
        chunk = await file.read(65536)  # 64 KB chunks
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")
        content_chunks.append(chunk)
    
    content = b"".join(content_chunks)

    # SECURITY: magic-byte validation — this check is mandatory.
    try:
        import filetype  # noqa: PLC0415
    except ImportError:
        logger.error("'filetype' package is not installed — cannot validate image magic bytes.")
        raise HTTPException(
            status_code=500,
            detail="File validation service unavailable.",
        )

    kind = filetype.guess(content)
    if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File content does not match a valid image type.",
        )

    safe_task = task_type.strip().lower()
    image_base64 = base64.b64encode(content).decode("utf-8")
    
    # Process within concurrency limits
    async with concurrency_semaphore:
        result = await analyze_image_task(image_base64, safe_task)
    return result

@router.post("/test-scan")
async def test_scan_image(
    request: Request,
    task_type: str = Form(...),
    file: UploadFile = File(...),
    redis = Depends(get_redis)
):
    """
    TEST ENDPOINT: Scan without authentication for debugging
    Remove this endpoint in production!
    """
    # --- Rate Limiting Checks (IP only for test) ---
    from app.core.limiter import get_ip_key
    ip_addr = get_ip_key(request)
    current_time = int(time.time())
    
    ip_key = f"rate_limit:test_scan:ip:{ip_addr}"
    
    # Rate limit: 10 test scans per minute
    current_data = await redis.get(ip_key)
    timestamps = []
    if current_data:
        try:
            timestamps = [t for t in json.loads(current_data) if current_time - t < 60]
        except Exception:
            pass
    
    if len(timestamps) >= 10:
        raise HTTPException(status_code=429, detail="Too many test scans. Limit is 10 per minute.")
    
    timestamps.append(current_time)
    await redis.setex(ip_key, 120, json.dumps(timestamps))

    # --- Task Validation ---
    if task_type.strip().lower() not in ALLOWED_TASK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task_type. Must be one of: {sorted(ALLOWED_TASK_TYPES)}",
        )

    # Validate MIME type from Content-Type header (client-supplied — not trusted alone)
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed (JPEG, PNG, WEBP)",
        )

    # --- Streaming read and size control ---
    content_chunks = []
    total_bytes = 0
    while True:
        chunk = await file.read(65536)  # 64 KB chunks
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 2 MB.")
        content_chunks.append(chunk)
    
    content = b"".join(content_chunks)

    # SECURITY: magic-byte validation
    try:
        import filetype  # noqa: PLC0415
    except ImportError:
        logger.error("'filetype' package is not installed — cannot validate image magic bytes.")
        raise HTTPException(
            status_code=500,
            detail="File validation service unavailable.",
        )

    kind = filetype.guess(content)
    if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File content does not match a valid image type.",
        )

    safe_task = task_type.strip().lower()
    image_base64 = base64.b64encode(content).decode("utf-8")
    
    # Process within concurrency limits
    async with concurrency_semaphore:
        result = await analyze_image_task(image_base64, safe_task)
    
    # Add test indicator
    result["test_endpoint"] = True
    result["note"] = "Using test endpoint - authentication bypassed"
    
    return result
