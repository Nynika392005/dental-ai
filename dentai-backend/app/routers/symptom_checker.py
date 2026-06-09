from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.symptom_checker import SymptomAssessment
from app.models.user import User
from app.schemas.symptom_checker import SymptomAssessmentCreate, SymptomAssessmentResponse
from app.dependencies import get_current_user
from app.services.ai_service import analyze_symptoms

router = APIRouter(prefix="/symptoms", tags=["symptoms"])

@router.post("/analyze", response_model=SymptomAssessmentResponse)
async def check_symptoms(
    req: SymptomAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Call AI service for assessment
    analysis = await analyze_symptoms(req.symptoms)
    
    assessment = SymptomAssessment(
        user_id=current_user.id,
        symptoms=req.symptoms,
        ai_assessment=analysis.get("ai_assessment", "Please consult a dentist."),
        urgency_level=analysis.get("urgency_level", "monitor")
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    
    return assessment
