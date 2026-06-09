from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: constr(min_length=8)
    role: str = "patient"

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
