from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db, engine, Base
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.user import User, Clinic, Dentist, RoleEnum
from app.models.education import Article, ArticleCategory, OralHealthTip
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest
import uuid
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Auth service is running"}

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Check if user already exists
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
            is_verified=True # Auto-verify for demo
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except Exception as e:
        # If failure, try to create tables automatically
        print(f"DB Error during registration: {e}")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        raise HTTPException(status_code=500, detail=f"Database Setup Error. Please try again in 10 seconds.")

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

@router.get("/init-db")
async def init_db():
    """Manual trigger to create all tables and seed data"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        return {"message": "Database tables created successfully!"}
    except Exception as e:
        return {"error": str(e)}
