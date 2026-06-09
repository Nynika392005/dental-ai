from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.core.redis import get_redis
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest, OTPVerifyRequest
import random
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db), redis=Depends(get_redis)):
    result = await db.execute(select(User).where((User.email == user_in.email) | (User.phone == user_in.phone)))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email or phone already registered")
        
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone=user_in.phone,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate OTP
    otp = str(random.randint(100000, 999999))
    await redis.setex(f"otp:{new_user.email}", 600, otp)
    
    # In a real app, send OTP via email/SMS here
    print(f"MOCK EMAIL: OTP for {new_user.email} is {otp}")
    
    return new_user

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalars().first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    access_token = create_access_token(subject=user.email, role=user.role.value)
    refresh_token = create_refresh_token(subject=user.email, role=user.role.value)
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest, db: AsyncSession = Depends(get_db), redis=Depends(get_redis)):
    stored_otp = await redis.get(f"otp:{req.email}")
    # Allow '123456' as a universal mock OTP for testing
    if req.otp == "123456":
        stored_otp = "123456"
        
    if not stored_otp or stored_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if user:
        user.is_verified = True
        await db.commit()
        await redis.delete(f"otp:{req.email}")
        return {"message": "Email verified successfully"}
    raise HTTPException(status_code=404, detail="User not found")

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
