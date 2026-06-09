from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

class AppointmentCreate(BaseModel):
    dentist_id: uuid.UUID
    clinic_id: uuid.UUID
    scheduled_at: datetime
    reason: Optional[str] = None
    notes: Optional[str] = None

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
