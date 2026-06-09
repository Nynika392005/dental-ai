from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy import Uuid as UUID, JSON as JSONB
import uuid
import enum
from datetime import datetime
from app.core.database import Base

class UrgencyLevel(str, enum.Enum):
    urgent = "urgent"
    soon = "soon"
    monitor = "monitor"
    routine = "routine"

class SymptomAssessment(Base):
    __tablename__ = "symptom_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    symptoms = Column(JSONB, nullable=False)
    ai_assessment = Column(String)
    urgency_level = Column(Enum(UrgencyLevel), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
