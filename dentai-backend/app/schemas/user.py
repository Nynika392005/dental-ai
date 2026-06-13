import re
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator
from pydantic import constr


# ---------------------------------------------------------------------------
# Password complexity validator (reused across schemas)
# ---------------------------------------------------------------------------
def _validate_password_complexity(value: str) -> str:
    """
    Enforces:
      - At least 8 characters (min_length on the field handles this)
      - At least one uppercase letter
      - At least one digit
      - At least one special character
    """
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]", value):
        raise ValueError("Password must contain at least one special character.")
    return value


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    full_name: constr(min_length=1, max_length=100)
    email: EmailStr
    # Digits, spaces, +, -, (), max 20 chars
    phone: constr(min_length=7, max_length=20, pattern=r"^[\d\s\+\-\(\)]+$")
    password: constr(min_length=8, max_length=128)

    # SECURITY: "admin" is intentionally excluded from the allowed literal values.
    # The server ignores the role field and always assigns "patient" by default
    # in the router; this schema just prevents unexpected values from reaching
    # deeper layers.
    role: Literal["patient", "dentist"] = "patient"

    # Dentist-only optional fields
    specialization: Optional[constr(max_length=100)] = None
    bio: Optional[constr(max_length=1000)] = None
    clinic_name: Optional[constr(max_length=150)] = None
    clinic_address: Optional[constr(max_length=300)] = None

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        return _validate_password_complexity(v)


# ---------------------------------------------------------------------------
# Profile update (typed schema replaces raw dict)
# ---------------------------------------------------------------------------
class UserUpdateRequest(BaseModel):
    full_name: Optional[constr(min_length=1, max_length=100)] = None
    # Allow only valid phone-number characters
    phone: Optional[constr(min_length=7, max_length=20, pattern=r"^[\d\s\+\-\(\)]+$")] = None
    # Dentist-only
    specialization: Optional[constr(max_length=100)] = None
    bio: Optional[constr(max_length=1000)] = None
    clinic_name: Optional[constr(max_length=150)] = None
    clinic_address: Optional[constr(max_length=300)] = None


# ---------------------------------------------------------------------------
# Responses / tokens
# ---------------------------------------------------------------------------
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
    password: str  # No complexity check on login — just pass it to bcrypt


class RefreshRequest(BaseModel):
    refresh_token: str


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
