from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.services.ai_service import analyze_image_task
from app.dependencies import get_current_user
from app.models.user import User
import base64

router = APIRouter(prefix="/analysis", tags=["analysis"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_TASK_TYPES = {"tooth", "medicine", "food", "habit"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

@router.post("/scan")
async def scan_image(
    task_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Validate task type
    if task_type.strip().lower() not in ALLOWED_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid task_type. Must be one of: {ALLOWED_TASK_TYPES}")

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only image files are allowed (JPEG, PNG, WEBP)")

    # Read and enforce size limit
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB")

    # Validate actual file bytes match claimed image type using filetype library
    try:
        import filetype
        kind = filetype.guess(content)
        if kind is None or kind.mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail="File content does not match a valid image type")
    except ImportError:
        pass  # filetype library not available, skip deep check

    image_base64 = base64.b64encode(content).decode('utf-8')
    result = await analyze_image_task(image_base64, task_type.strip().lower())
    return result
