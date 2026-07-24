import uuid
import enum
from datetime import datetime

class AppointmentStatus(str, enum.Enum):
    upcoming = "Upcoming"
    completed = "Completed"
    cancelled = "Cancelled"
    missed = "Missed"

class Appointment:
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
            
        self.patient_id = kwargs.get("patient_id")
        if isinstance(self.patient_id, str):
            try:
                self.patient_id = uuid.UUID(self.patient_id)
            except ValueError:
                pass
                
        self.dentist_id = kwargs.get("dentist_id")
        if isinstance(self.dentist_id, str):
            try:
                self.dentist_id = uuid.UUID(self.dentist_id)
            except ValueError:
                pass
                
        self.clinic_id = kwargs.get("clinic_id")
        if isinstance(self.clinic_id, str):
            try:
                self.clinic_id = uuid.UUID(self.clinic_id)
            except ValueError:
                pass
                
        self.scheduled_at = kwargs.get("scheduled_at")
        if isinstance(self.scheduled_at, str):
            try:
                # Parse ISO datetime string and ensure it's timezone-naive
                # This handles both 'Z' suffix and timezone offsets
                self.scheduled_at = datetime.fromisoformat(self.scheduled_at.replace('Z', '+00:00')).replace(tzinfo=None)
            except ValueError:
                try:
                    self.scheduled_at = datetime.fromisoformat(self.scheduled_at)
                except ValueError:
                    pass
                
        self.reason = kwargs.get("reason")
        
        status_val = kwargs.get("status", AppointmentStatus.upcoming)
        
        # Convert legacy strings to Enum representation if valid
        if status_val in ["scheduled", "confirmed"]:
            status_val = AppointmentStatus.upcoming
        elif status_val in ["completed", "Completed"]:
            status_val = AppointmentStatus.completed
        elif status_val in ["cancelled", "Cancelled"]:
            status_val = AppointmentStatus.cancelled
        elif status_val in ["expired", "missed", "Missed"]:
            status_val = AppointmentStatus.missed

        try:
            raw_status = AppointmentStatus(status_val)
            now_dt = datetime.utcnow().replace(tzinfo=None)  # Make sure it's naive
            scheduled_dt = self.scheduled_at if isinstance(self.scheduled_at, datetime) else now_dt
            
            # Ensure scheduled_dt is also naive (remove timezone if present)
            if isinstance(scheduled_dt, datetime) and scheduled_dt.tzinfo is not None:
                scheduled_dt = scheduled_dt.replace(tzinfo=None)
            
            if raw_status not in [AppointmentStatus.cancelled, AppointmentStatus.completed] and scheduled_dt < now_dt:
                self.status = AppointmentStatus.missed
            else:
                self.status = raw_status
        except ValueError:
            self.status = AppointmentStatus.upcoming
                
        self.notes = kwargs.get("notes")
        self.created_at = kwargs.get("created_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "patient_id": str(self.patient_id),
            "dentist_id": str(self.dentist_id),
            "clinic_id": str(self.clinic_id),
            "scheduled_at": self.scheduled_at.isoformat() if isinstance(self.scheduled_at, datetime) else self.scheduled_at,
            "reason": self.reason,
            "status": self.status.value if isinstance(self.status, enum.Enum) else self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        }
