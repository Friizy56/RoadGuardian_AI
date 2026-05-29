"""
Module 3: Authentication API Endpoints
======================================
Purpose: User registration, login, and profile retrieval endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import get_password_hash, verify_password, create_access_token, get_current_user
from app.database import get_db
from typing import Any, List

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ======================
# Request/Response Schemas
# ======================
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    points: int = 0
    role: str = "citizen"
    
    class Config:
        from_attributes = True

# ======================
# Endpoints
# ======================
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new citizen/authority user"""
    # Import User model lazily so module import doesn't require ORM models present
    from app.models.hazard import User

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT"""
    from app.models.hazard import User

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

class UserSync(BaseModel):
    full_name: str | None = None
    role: str = "citizen"

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: Any = Depends(get_current_user)):
    """Get authenticated user profile"""
    return current_user

@router.post("/sync", response_model=UserResponse)
async def sync_user(
    payload: UserSync,
    current_user: Any = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Synchronize user metadata and role from frontend session.
    Automatically called on successful frontend Supabase/OAuth state changes.
    """
    if payload.full_name:
        current_user.full_name = payload.full_name
    
    if payload.role in ["citizen", "authority"]:
        # For demonstration/testing, allow any email to assume the authority role
        current_user.role = payload.role
        
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.get("/leaderboard", response_model=List[UserResponse])
async def get_leaderboard(period: str = "all_time", db: AsyncSession = Depends(get_db)):
    """Get top 100 users sorted by points for the leaderboard"""
    from app.models.hazard import User, GamificationBadge
    from sqlalchemy import select, func
    import datetime
    
    if period == "this_month":
        now = datetime.datetime.now()
        start_of_month = datetime.datetime(now.year, now.month, 1)
        
        result = await db.execute(
            select(User, func.sum(GamificationBadge.points_awarded).label("month_points"))
            .join(GamificationBadge, User.id == GamificationBadge.user_id)
            .where(GamificationBadge.awarded_at >= start_of_month)
            .group_by(User.id)
            .order_by(func.sum(GamificationBadge.points_awarded).desc())
            .limit(100)
        )
        
        users = []
        for row in result.all():
            u = row.User
            users.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "points": row.month_points,
                "role": u.role
            })
        return users
    else:
        result = await db.execute(
            select(User)
            .order_by(User.points.desc())
            .limit(100)
        )
        return result.scalars().all()