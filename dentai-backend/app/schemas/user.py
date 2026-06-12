from pydantic import BaseModel, EmailStr, constr
from typing import Optional, Literal
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    full_name: constr(max_length=100)
    email: EmailStr
    phone: constr(max_length=20)
    password: constr(min_length=8, max_length=128)
    role: Literal["patient", "dentist"] = "patient"   # prevents admin self-registration
    # Dentist-only fields
    specialization: Optional[constr(max_length=100)] = None
    bio: Optional[constr(max_length=1000)] = None
    clinic_name: Optional[constr(max_length=150)] = None
    clinic_address: Optional[constr(max_length=300)] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
