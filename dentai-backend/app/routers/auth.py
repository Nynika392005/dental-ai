from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db, engine, Base
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.core.redis import get_redis
from app.models.user import User, Clinic, Dentist, RoleEnum
from app.models.education import Article, ArticleCategory, OralHealthTip
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest, OTPVerifyRequest
import random
import uuid
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Check if exists
        result = await db.execute(select(User).where((User.email == user_in.email) | (User.phone == user_in.phone)))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email or phone already registered")

        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            full_name=user_in.full_name,
            email=user_in.email,
            phone=user_in.phone,
            password_hash=hashed_password,
            role=user_in.role,
            is_verified=True # AUTO-VERIFY for demo stability
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except Exception as e:
        print(f"REGISTRATION ERROR: {e}")
        # Ensure tables exist just in case
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalars().first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    access_token = create_access_token(subject=user.email, role=user.role.value)
    refresh_token = create_refresh_token(subject=user.email, role=user.role.value)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/seed-data")
async def trigger_seed(db: AsyncSession = Depends(get_db)):
    """Secret endpoint to populate database with demo data"""
    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Check if articles already exist
    check = await db.execute(select(Article))
    if check.scalars().first():
        return {"message": "Database already contains data."}

    # Add Initial Content
    clinics = [Clinic(id=uuid.uuid4(), name="Pearl Dental", address="123 Care St", phone="555-0101")]
    tips = [OralHealthTip(tip_text="Brush twice a day!", category="hygiene")]
    articles = [
        Article(title="Root Canal Guide", slug="root-canal", content="Procedure details...", category=ArticleCategory.procedures, is_published=True),
        Article(title="Food & Teeth", slug="food-teeth", content="Sugar impact...", category=ArticleCategory.nutrition, is_published=True)
    ]

    db.add_all(clinics + tips + articles)
    await db.commit()
    return {"message": "Demo data seeded successfully!"}
