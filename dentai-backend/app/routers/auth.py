import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.dependencies import get_current_user
from app.models.user import Clinic, Dentist, RoleEnum, User
from app.schemas.user import (
    LoginRequest,
    RefreshRequest,
    Token,
    UserCreate,
    UserResponse,
    UserUpdateRequest,
)

# Reuse the same scheme instance for token extraction in the logout endpoint
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Health check (unauthenticated — intentional)
# ---------------------------------------------------------------------------
@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Auth service is running"}


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db=Depends(get_db)):
    existing = await db["users"].find_one(
        {"$or": [{"email": user_in.email}, {"phone": user_in.phone}]}
    )
    if existing:
        # SECURITY: same message for both email and phone to avoid enumeration
        raise HTTPException(status_code=400, detail="Registration failed. Please check your details.")

    hashed_password = get_password_hash(user_in.password)

    # SECURITY: role is always forced server-side regardless of what the client
    # sent.  Patients self-register as "patient"; dentists self-register as
    # "dentist".  Admin accounts can only be created out-of-band.
    safe_role = RoleEnum(user_in.role) if user_in.role in ("patient", "dentist") else RoleEnum.patient

    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone=user_in.phone,
        password_hash=hashed_password,
        role=safe_role,
        # SECURITY: accounts start unverified; set True only after OTP/email
        # confirmation.  For this college project we keep True so the mobile
        # app works, but the flag is now explicit and easy to enforce later.
        is_verified=True,
    )
    await db["users"].insert_one(new_user.to_dict())

    if safe_role == RoleEnum.dentist:
        clinic_name = user_in.clinic_name or f"{user_in.full_name}'s Clinic"
        clinic_address = user_in.clinic_address or "Address not provided"
        new_clinic = Clinic(name=clinic_name, address=clinic_address, phone=user_in.phone)
        await db["clinics"].insert_one(new_clinic.to_dict())

        new_dentist = Dentist(
            user_id=new_user.id,
            clinic_id=new_clinic.id,
            specialization=user_in.specialization or "General Dentistry",
            bio=user_in.bio or "",
        )
        await db["dentists"].insert_one(new_dentist.to_dict())

    return {
        "id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "phone": new_user.phone,
        "role": new_user.role.value if hasattr(new_user.role, "value") else new_user.role,
        "is_verified": new_user.is_verified,
        "created_at": new_user.created_at,
    }


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db=Depends(get_db)):
    user_doc = await db["users"].find_one({"email": login_data.email})

    # SECURITY: always run verify_password even on a miss to prevent timing attacks
    dummy_hash = "$2b$12$KIXTSmFpmbj9StrPBOfaWeRx/XEZXOW1iP7GpUHMiSzl9bFP2nWRe"
    stored_hash = user_doc["password_hash"] if user_doc else dummy_hash

    if not verify_password(login_data.password, stored_hash) or not user_doc:
        # SECURITY: identical message for wrong email and wrong password
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    user = User(**user_doc)
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

    access_token = create_access_token(subject=user.email, role=role_str)
    refresh_token = create_refresh_token(subject=user.email, role=role_str)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------
@router.post("/refresh", response_model=Token)
async def refresh_token(body: RefreshRequest, db=Depends(get_db), redis=Depends(get_redis)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])

        # SECURITY: only accept tokens explicitly typed as "refresh"
        if payload.get("type") != "refresh":
            raise credentials_exception

        email: str | None = payload.get("sub")
        if not email:
            raise credentials_exception

        # SECURITY: honour revocation for refresh tokens too
        jti: str | None = payload.get("jti")
        if jti:
            revoked = await redis.get(f"revoked_jti:{jti}")
            if revoked:
                raise credentials_exception

    except JWTError:
        raise credentials_exception

    user_doc = await db["users"].find_one({"email": email})
    if not user_doc:
        raise credentials_exception

    user = User(**user_doc)
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

    new_access = create_access_token(subject=user.email, role=role_str)
    new_refresh = create_refresh_token(subject=user.email, role=role_str)
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Logout  (revokes the current access token via its jti)
# ---------------------------------------------------------------------------
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
    token: str = Depends(_oauth2_scheme),
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        jti: str | None = payload.get("jti")
        exp: int | None = payload.get("exp")
        if jti and exp:
            # Store the revoked jti until the token naturally expires
            now = int(datetime.utcnow().timestamp())
            ttl = max(exp - now, 1)
            await redis.setex(f"revoked_jti:{jti}", ttl, "1")
    except JWTError:
        pass  # token already invalid — nothing to revoke
    return None


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role.value if hasattr(current_user.role, "value") else current_user.role,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at,
    }


# ---------------------------------------------------------------------------
# Dentist profile
# ---------------------------------------------------------------------------
@router.get("/dentist-profile")
async def get_dentist_profile(current_user: User = Depends(get_current_user), db=Depends(get_db)):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role != "dentist":
        raise HTTPException(status_code=403, detail="Not a dentist account")

    dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
    if not dentist_doc:
        raise HTTPException(status_code=404, detail="Dentist profile not found")

    clinic_doc = await db["clinics"].find_one({"_id": dentist_doc.get("clinic_id")})
    return {
        "dentist_id": dentist_doc["_id"],
        "specialization": dentist_doc.get("specialization"),
        "bio": dentist_doc.get("bio"),
        "clinic_id": dentist_doc.get("clinic_id"),
        "clinic_name": clinic_doc["name"] if clinic_doc else None,
        "clinic_address": clinic_doc["address"] if clinic_doc else None,
        "clinic_phone": clinic_doc["phone"] if clinic_doc else None,
    }


# ---------------------------------------------------------------------------
# Update profile  (typed schema replaces raw dict)
# ---------------------------------------------------------------------------
@router.patch("/update-profile")
async def update_profile(
    body: UserUpdateRequest,           # SECURITY: typed Pydantic schema, not raw dict
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # Build validated user-level updates
    user_updates: dict = {}
    if body.full_name is not None:
        user_updates["full_name"] = body.full_name
    if body.phone is not None:
        # SECURITY: ensure new phone is not already taken by another account
        conflict = await db["users"].find_one({"phone": body.phone})
        if conflict and str(conflict.get("_id")) != str(current_user.id):
            raise HTTPException(status_code=400, detail="Phone number already in use.")
        user_updates["phone"] = body.phone

    if user_updates:
        await db["users"].update_one({"_id": str(current_user.id)}, {"$set": user_updates})

    # Dentist-specific updates
    if role == "dentist":
        dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
        if dentist_doc:
            dentist_updates: dict = {}
            if body.specialization is not None:
                dentist_updates["specialization"] = body.specialization
            if body.bio is not None:
                dentist_updates["bio"] = body.bio
            if dentist_updates:
                await db["dentists"].update_one({"_id": dentist_doc["_id"]}, {"$set": dentist_updates})

            clinic_updates: dict = {}
            if body.clinic_name is not None:
                clinic_updates["name"] = body.clinic_name
            if body.clinic_address is not None:
                clinic_updates["address"] = body.clinic_address
            if clinic_updates:
                await db["clinics"].update_one({"_id": dentist_doc["clinic_id"]}, {"$set": clinic_updates})

    return {"message": "Profile updated successfully"}


# ---------------------------------------------------------------------------
# Init DB  — SECURITY: changed to POST, admin-only, with explicit warning.
# For production use, run `python seed.py` from the CLI instead.
# ---------------------------------------------------------------------------
@router.post("/init-db")
async def init_db(current_user: User = Depends(get_current_user), db=Depends(get_db)):
    """Admin-only: create indexes and seed MongoDB data. Use CLI in production."""
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        await db["users"].create_index("email", unique=True)
        await db["users"].create_index("phone", unique=True)
        await db["articles"].create_index("slug", unique=True)
        from seed import seed_mongodb_data
        await seed_mongodb_data(db)
        return {"message": "MongoDB databases initialized and seeded successfully!"}
    except Exception as exc:
        # SECURITY: do not echo raw exception detail to the client
        logger.exception("init-db failed")
        raise HTTPException(status_code=500, detail="Database initialisation failed.")
