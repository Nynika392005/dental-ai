from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

class SymptomAssessmentCreate(BaseModel):
    symptoms: List[str]

class SymptomAssessmentResponse(BaseModel):
    id: uuid.UUID
    symptoms: List[str]
    ai_assessment: str
    urgency_level: str
    created_at: datetime

    class Config:
        from_attributes = True
