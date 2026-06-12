from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.user import User, Clinic, Dentist, RoleEnum
from app.models.education import Article, OralHealthTip
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest
import uuid
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Auth service is running"}

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db = Depends(get_db)):
    # Check if user already exists
    existing = await db["users"].find_one({
        "$or": [
            {"email": user_in.email},
            {"phone": user_in.phone}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Email or phone already registered")

    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone=user_in.phone,
        password_hash=hashed_password,
        role=user_in.role,
        is_verified=True
    )
    await db["users"].insert_one(new_user.to_dict())

    # If registering as dentist, create clinic + dentist profile
    if user_in.role == "dentist":
        clinic_name = user_in.clinic_name or f"{user_in.full_name}'s Clinic"
        clinic_address = user_in.clinic_address or "Address not provided"
        new_clinic = Clinic(
            name=clinic_name,
            address=clinic_address,
            phone=user_in.phone
        )
        await db["clinics"].insert_one(new_clinic.to_dict())

        new_dentist = Dentist(
            user_id=new_user.id,
            clinic_id=new_clinic.id,
            specialization=user_in.specialization or "General Dentistry",
            bio=user_in.bio or ""
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

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db = Depends(get_db)):
    user_doc = await db["users"].find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    user = User(**user_doc)
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token(subject=user.email, role=role_str)
    refresh_token = create_refresh_token(subject=user.email, role=role_str)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

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

@router.get("/dentist-profile")
async def get_dentist_profile(current_user: User = Depends(get_current_user), db = Depends(get_db)):
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

@router.patch("/update-profile")
async def update_profile(body: dict, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    # Update user fields
    user_updates = {}
    if "full_name" in body: user_updates["full_name"] = body["full_name"]
    if "phone" in body: user_updates["phone"] = body["phone"]
    if user_updates:
        await db["users"].update_one({"_id": str(current_user.id)}, {"$set": user_updates})
    # Update dentist/clinic fields
    if role == "dentist":
        dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
        if dentist_doc:
            dentist_updates = {}
            if "specialization" in body: dentist_updates["specialization"] = body["specialization"]
            if "bio" in body: dentist_updates["bio"] = body["bio"]
            if dentist_updates:
                await db["dentists"].update_one({"_id": dentist_doc["_id"]}, {"$set": dentist_updates})
            clinic_updates = {}
            if "clinic_name" in body: clinic_updates["name"] = body["clinic_name"]
            if "clinic_address" in body: clinic_updates["address"] = body["clinic_address"]
            if clinic_updates:
                await db["clinics"].update_one({"_id": dentist_doc["clinic_id"]}, {"$set": clinic_updates})
    return {"message": "Profile updated successfully"}

@router.get("/init-db")
async def init_db(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """Admin-only: create indexes and seed MongoDB data"""
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
    except Exception as e:
        return {"error": str(e)}
