import uuid
import enum
from datetime import datetime

class UrgencyLevel(str, enum.Enum):
    urgent = "urgent"
    soon = "soon"
    monitor = "monitor"
    routine = "routine"

class SymptomAssessment:
    def __init__(self, **kwargs):
        raw_id = kwargs.get("id") or kwargs.get("_id")
        if isinstance(raw_id, str):
            try:
                self.id = uuid.UUID(raw_id)
            except ValueError:
                self.id = raw_id
        elif isinstance(raw_id, uuid.UUID):
            self.id = raw_id
        else:
            self.id = uuid.uuid4()
            
        self.user_id = kwargs.get("user_id")
        if isinstance(self.user_id, str):
            try:
                self.user_id = uuid.UUID(self.user_id)
            except ValueError:
                pass
                
        self.symptoms = kwargs.get("symptoms", [])
        self.ai_assessment = kwargs.get("ai_assessment")
        
        urgency_val = kwargs.get("urgency_level", UrgencyLevel.monitor)
        if isinstance(urgency_val, enum.Enum):
            self.urgency_level = urgency_val
        else:
            try:
                self.urgency_level = UrgencyLevel(urgency_val)
            except ValueError:
                self.urgency_level = UrgencyLevel.monitor
                
        self.created_at = kwargs.get("created_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "user_id": str(self.user_id),
            "symptoms": self.symptoms,
            "ai_assessment": self.ai_assessment,
            "urgency_level": self.urgency_level.value if isinstance(self.urgency_level, enum.Enum) else self.urgency_level,
            "created_at": self.created_at
        }
