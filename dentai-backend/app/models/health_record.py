import uuid
from datetime import datetime

class HealthRecord:
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
                
        self.last_visit_date = kwargs.get("last_visit_date")
        if isinstance(self.last_visit_date, str):
            try:
                self.last_visit_date = datetime.fromisoformat(self.last_visit_date)
            except ValueError:
                pass
                
        self.known_conditions = kwargs.get("known_conditions", [])
        self.notes = kwargs.get("notes")
        self.xray_urls = kwargs.get("xray_urls", [])
        self.created_at = kwargs.get("created_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "user_id": str(self.user_id),
            "last_visit_date": self.last_visit_date.isoformat() if isinstance(self.last_visit_date, datetime) else self.last_visit_date,
            "known_conditions": self.known_conditions,
            "notes": self.notes,
            "xray_urls": self.xray_urls,
            "created_at": self.created_at
        }
