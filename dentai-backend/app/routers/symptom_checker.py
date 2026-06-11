from fastapi import APIRouter, Depends
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
    db = Depends(get_db)
):
    # Call AI service for assessment
    analysis = await analyze_symptoms(req.symptoms)
    
    assessment = SymptomAssessment(
        user_id=current_user.id,
        symptoms=req.symptoms,
        ai_assessment=analysis.get("ai_assessment", "Please consult a dentist."),
        urgency_level=analysis.get("urgency_level", "monitor")
    )
    await db["symptom_assessments"].insert_one(assessment.to_dict())
    
    return {
        "id": assessment.id,
        "symptoms": assessment.symptoms,
        "ai_assessment": assessment.ai_assessment,
        "urgency_level": assessment.urgency_level.value,
        "created_at": assessment.created_at
    }
