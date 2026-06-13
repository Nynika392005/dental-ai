import logging
import re

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.symptom_checker import SymptomAssessment
from app.models.user import User
from app.schemas.symptom_checker import SymptomAssessmentCreate, SymptomAssessmentResponse
from app.services.ai_service import analyze_symptoms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/symptoms", tags=["symptoms"])

# SECURITY: allow-list of safe characters for symptom text.
# This prevents prompt-injection strings such as "Ignore all previous instructions…"
# from reaching the LLM verbatim.
_SAFE_SYMPTOM_RE = re.compile(r"^[a-zA-Z0-9 ,.\-']+$")
MAX_SYMPTOM_LENGTH = 200
MAX_SYMPTOM_COUNT = 20


def _sanitise_symptoms(symptoms: list[str]) -> list[str]:
    """
    Validate and sanitise the symptom list before it is passed to the LLM.
    Raises HTTPException if any entry fails validation.
    """
    if not symptoms:
        raise HTTPException(status_code=400, detail="At least one symptom is required.")
    if len(symptoms) > MAX_SYMPTOM_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Too many symptoms. Maximum is {MAX_SYMPTOM_COUNT}.",
        )

    sanitised = []
    for raw in symptoms:
        s = raw.strip()
        if not s:
            continue
        if len(s) > MAX_SYMPTOM_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Each symptom must be at most {MAX_SYMPTOM_LENGTH} characters.",
            )
        # SECURITY: reject strings containing prompt-injection indicators
        if not _SAFE_SYMPTOM_RE.match(s):
            raise HTTPException(
                status_code=400,
                detail="Symptom description contains invalid characters.",
            )
        sanitised.append(s)

    if not sanitised:
        raise HTTPException(status_code=400, detail="At least one valid symptom is required.")
    return sanitised


@router.post("/analyze", response_model=SymptomAssessmentResponse)
async def check_symptoms(
    req: SymptomAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    # SECURITY: sanitise symptoms before passing to AI to mitigate prompt injection
    safe_symptoms = _sanitise_symptoms(req.symptoms)

    analysis = await analyze_symptoms(safe_symptoms)

    assessment = SymptomAssessment(
        user_id=current_user.id,
        symptoms=safe_symptoms,
        ai_assessment=analysis.get("ai_assessment", "Please consult a dentist."),
        urgency_level=analysis.get("urgency_level", "monitor"),
    )
    await db["symptom_assessments"].insert_one(assessment.to_dict())

    return {
        "id": assessment.id,
        "symptoms": assessment.symptoms,
        "ai_assessment": assessment.ai_assessment,
        "urgency_level": assessment.urgency_level.value,
        "created_at": assessment.created_at,
    }
