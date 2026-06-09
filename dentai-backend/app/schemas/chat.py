from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

class MessageCreate(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None
    attachments: Optional[list] = None

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True
