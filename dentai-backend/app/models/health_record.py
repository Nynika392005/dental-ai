from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy import JSON as ARRAY
from sqlalchemy import Uuid as UUID, JSON as JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    last_visit_date = Column(DateTime)
    known_conditions = Column(ARRAY(String))
    notes = Column(String)
    xray_urls = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="health_record")
