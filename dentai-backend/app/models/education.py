from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Enum
from sqlalchemy import Uuid as UUID
import uuid
import enum
from datetime import datetime
from app.core.database import Base

class ArticleCategory(str, enum.Enum):
    hygiene = "hygiene"
    procedures = "procedures"
    children = "children"
    emergency = "emergency"
    nutrition = "nutrition"
    orthodontics = "orthodontics"

class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    content = Column(String, nullable=False)
    category = Column(Enum(ArticleCategory), nullable=False)
    thumbnail_url = Column(String)
    read_time_minutes = Column(Integer, default=5)
    author = Column(String)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class OralHealthTip(Base):
    __tablename__ = "oral_health_tips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tip_text = Column(String, nullable=False)
    category = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
