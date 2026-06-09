from fastapi import APIRouter, Depends, UploadFile, File, Form
from app.services.ai_service import analyze_image_task
from app.dependencies import get_current_user
from app.models.user import User
import base64

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/scan")
async def scan_image(
    task_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # In a real app, we would process the image file
    # For now, we'll just read it to simulate activity
    content = await file.read()
    image_base64 = base64.b64encode(content).decode('utf-8')

    result = await analyze_image_task(image_base64, task_type)
    return result
