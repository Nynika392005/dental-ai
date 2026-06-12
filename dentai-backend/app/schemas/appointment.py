from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from pydantic import constr

class AppointmentCreate(BaseModel):
    dentist_id: uuid.UUID
    clinic_id: uuid.UUID
    scheduled_at: datetime
    reason: Optional[constr(max_length=300)] = None
    notes: Optional[constr(max_length=2000)] = None

class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    dentist_id: uuid.UUID
    clinic_id: uuid.UUID
    scheduled_at: datetime
    reason: Optional[str]
    status: str
    notes: Optional[str]

    class Config:
        from_attributes = True
