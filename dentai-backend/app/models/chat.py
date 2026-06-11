import uuid
from datetime import datetime

class Conversation:
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
                
        self.title = kwargs.get("title")
        self.is_deleted = kwargs.get("is_deleted", False)
        self.created_at = kwargs.get("created_at") or datetime.utcnow()
        self.updated_at = kwargs.get("updated_at") or datetime.utcnow()
        
        # In MongoDB, we can embed messages or store them in a separate collection.
        # We'll support both, but primarily keep messages in a relationship list.
        raw_messages = kwargs.get("messages", [])
        self.messages = [Message(**m) if isinstance(m, dict) else m for m in raw_messages]

    def to_dict(self):
        return {
            "_id": str(self.id),
            "user_id": str(self.user_id),
            "title": self.title,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            # We don't necessarily store the nested messages list in the conversations collection 
            # if we use a separate messages collection, but it's handy to have.
        }

class Message:
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
            
        self.conversation_id = kwargs.get("conversation_id")
        if isinstance(self.conversation_id, str):
            try:
                self.conversation_id = uuid.UUID(self.conversation_id)
            except ValueError:
                pass
                
        self.role = kwargs.get("role")
        self.content = kwargs.get("content")
        self.attachments = kwargs.get("attachments", [])
        self.feedback = kwargs.get("feedback")
        self.tokens_used = kwargs.get("tokens_used")
        self.created_at = kwargs.get("created_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "role": self.role,
            "content": self.content,
            "attachments": self.attachments,
            "feedback": self.feedback,
            "tokens_used": self.tokens_used,
            "created_at": self.created_at
        }
