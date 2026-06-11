import uuid
from datetime import datetime
import enum

class RoleEnum(str, enum.Enum):
    patient = "patient"
    dentist = "dentist"
    admin = "admin"

class User:
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
            
        self.full_name = kwargs.get("full_name")
        self.email = kwargs.get("email")
        self.phone = kwargs.get("phone")
        self.password_hash = kwargs.get("password_hash")
        
        role_val = kwargs.get("role", RoleEnum.patient)
        if isinstance(role_val, enum.Enum):
            self.role = role_val
        else:
            try:
                self.role = RoleEnum(role_val)
            except ValueError:
                self.role = RoleEnum.patient
                
        self.is_verified = kwargs.get("is_verified", False)
        self.created_at = kwargs.get("created_at") or datetime.utcnow()
        self.updated_at = kwargs.get("updated_at") or datetime.utcnow()

    def to_dict(self):
        return {
            "_id": str(self.id),
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "password_hash": self.password_hash,
            "role": self.role.value if isinstance(self.role, enum.Enum) else self.role,
            "is_verified": self.is_verified,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class Clinic:
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
            
        self.name = kwargs.get("name")
        self.address = kwargs.get("address")
        self.phone = kwargs.get("phone")

    def to_dict(self):
        return {
            "_id": str(self.id),
            "name": self.name,
            "address": self.address,
            "phone": self.phone
        }

class Dentist:
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
                
        self.clinic_id = kwargs.get("clinic_id")
        if isinstance(self.clinic_id, str):
            try:
                self.clinic_id = uuid.UUID(self.clinic_id)
            except ValueError:
                pass
                
        self.specialization = kwargs.get("specialization")
        self.bio = kwargs.get("bio")
        self.photo_url = kwargs.get("photo_url")

    def to_dict(self):
        return {
            "_id": str(self.id),
            "user_id": str(self.user_id),
            "clinic_id": str(self.clinic_id),
            "specialization": self.specialization,
            "bio": self.bio,
            "photo_url": self.photo_url
        }
