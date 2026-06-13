from pydantic import BaseModel, constr
from typing import List, Optional
import uuid
from datetime import datetime

# FIX-07: Added max_length constraint on message to prevent DoS and AI cost exhaustion.
# A 4000-character limit covers all legitimate dental chat use cases.
class MessageCreate(BaseModel):
    message: constr(min_length=1, max_length=4000)
    conversation_id: Optional[uuid.UUID] = None
    # FIX-07: attachments validated as a bounded list of strings, not an untyped list.
    attachments: Optional[List[constr(max_length=2048)]] = None

    class Config:
        # Prevent extra fields from being accepted
        extra = "forbid"

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
