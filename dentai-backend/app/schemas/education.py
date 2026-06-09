from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

class ArticleResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    content: str
    category: str
    thumbnail_url: Optional[str]
    read_time_minutes: int
    author: Optional[str]
    is_published: bool
    created_at: datetime

    class Config:
        from_attributes = True

class OralHealthTipResponse(BaseModel):
    id: uuid.UUID
    tip_text: str
    category: Optional[str]

    class Config:
        from_attributes = True
