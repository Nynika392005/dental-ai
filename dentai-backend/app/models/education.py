import uuid
import enum
from datetime import datetime

class ArticleCategory(str, enum.Enum):
    hygiene = "hygiene"
    procedures = "procedures"
    children = "children"
    emergency = "emergency"
    nutrition = "nutrition"
    orthodontics = "orthodontics"

class Article:
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
            
        self.title = kwargs.get("title")
        self.slug = kwargs.get("slug")
        self.content = kwargs.get("content")
        
        category_val = kwargs.get("category", ArticleCategory.hygiene)
        if isinstance(category_val, enum.Enum):
            self.category = category_val
        else:
            try:
                self.category = ArticleCategory(category_val)
            except ValueError:
                self.category = ArticleCategory.hygiene
                
        self.thumbnail_url = kwargs.get("thumbnail_url")
        self.read_time_minutes = kwargs.get("read_time_minutes", 5)
        self.author = kwargs.get("author")
        self.is_published = kwargs.get("is_published", False)
        self.created_at = kwargs.get("created_at") or datetime.utcnow()
        self.updated_at = kwargs.get("updated_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "title": self.title,
            "slug": self.slug,
            "content": self.content,
            "category": self.category.value if isinstance(self.category, enum.Enum) else self.category,
            "thumbnail_url": self.thumbnail_url,
            "read_time_minutes": self.read_time_minutes,
            "author": self.author,
            "is_published": self.is_published,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class Bookmark:
    def __init__(self, **kwargs):
        self.user_id = kwargs.get("user_id")
        if isinstance(self.user_id, str):
            try:
                self.user_id = uuid.UUID(self.user_id)
            except ValueError:
                pass
                
        self.article_id = kwargs.get("article_id")
        if isinstance(self.article_id, str):
            try:
                self.article_id = uuid.UUID(self.article_id)
            except ValueError:
                pass
                
        self.created_at = kwargs.get("created_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "user_id": str(self.user_id),
            "article_id": str(self.article_id),
            "created_at": self.created_at
        }

class OralHealthTip:
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
            
        self.tip_text = kwargs.get("tip_text")
        self.category = kwargs.get("category")
        self.created_at = kwargs.get("created_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "tip_text": self.tip_text,
            "category": self.category,
            "created_at": self.created_at
        }
