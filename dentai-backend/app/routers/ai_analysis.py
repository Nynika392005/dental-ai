import base64
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies import get_current_user
from app.models.user import User
from app.services.ai_service import analyze_image_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_TASK_TYPES = {"tooth", "medicine", "food", "habit"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/scan")
async def scan_image(
    task_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Validate task type against strict allow-list
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

    # Read body and enforce hard size cap
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")

    # SECURITY: magic-byte validation — this check is mandatory.
    # Removed the silent ImportError fallback; if filetype is missing the
    # upload is rejected rather than silently bypassing the check.
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
    result = await analyze_image_task(image_base64, safe_task)
    return result
