"""
Module 3: Authentication Dependencies & Security Utilities
==========================================================
Purpose: JWT handling, password hashing, and FastAPI user extraction dependency.
Dependencies: jose, passlib, fastapi, sqlalchemy, app.config, app.database, app.models.hazard
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from typing import Any

# ======================
# Supabase Integration (lazy import)
# ======================
# Import supabase lazily so the app can start even if the package or
# optional realtime dependencies are missing in local dev environments.
supabase_client = None
create_client = None
Client = None
try:
    from supabase import create_client as _create_client, Client as _Client
    create_client = _create_client
    Client = _Client
except Exception as e:
    # Supabase (or its transitive deps) may be unavailable in local/dev.
    # We'll leave `create_client`/`Client` as None and only initialize
    # the client if both the settings and the import are available.
    print(f"Supabase import unavailable in auth dependencies: {e}")

if create_client is not None and settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    except Exception as e:
        print(f"Failed to initialize Supabase client in auth dependencies: {e}")

# ======================
# Security Configuration
# ======================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ======================
# Cryptography Helpers
# ======================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored bcrypt hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for plain password"""
    return pwd_context.hash(password)

# ======================
# JWT Token Management
# ======================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token"""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

# ======================
# FastAPI Dependency
# ======================
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Dependency to extract and verify current authenticated user.
    Supports local JWTs, Supabase OAuth JWTs, and VIP demo guest tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Import User model lazily to avoid import-time DB/model dependencies
    from app.models.hazard import User

    email = None
    role = "citizen"
    full_name = "User"

    # 1. Handle demo guest tokens only in debug mode.
    if settings.DEBUG and token in ("mock-guest-token-authority", "mock-guest-token"):
        email = "president@roadguardian.gov.in"
        role = "authority"
        full_name = "Hon'ble Head of State"
    elif settings.DEBUG and token == "mock-guest-token-citizen":
        email = "citizen@roadguardian.gov.in"
        role = "citizen"
        full_name = "Strategic Citizen Observer"
    else:
        # 2. Try standard local JWT decoding
        payload = decode_access_token(token)
        if payload is not None:
            email = payload.get("sub")
        
        # 3. Fallback to Supabase JWT verification if standard decoding failed
        if email is None and supabase_client is not None:
            try:
                user_resp = supabase_client.auth.get_user(token)
                if user_resp and user_resp.user:
                    email = user_resp.user.email
                    full_name = user_resp.user.user_metadata.get("full_name", "Citizen")
            except Exception:
                # Token is invalid or expired
                raise credentials_exception

    if email is None:
        raise credentials_exception

    # 4. Fetch or auto-provision the user locally
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user is None:
        # Check email criteria to auto-assign authority role for government domain addresses
        if any(keyword in email.lower() for keyword in ["president", "authority", "officer", ".gov", "roadguardian.gov.in"]):
            role = "authority"
            
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            full_name=full_name,
            role=role,
            points=9999 if email == "president@roadguardian.gov.in" else 0
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except Exception as e:
            await db.rollback()
            # Race condition: another request might have inserted the user at the exact same time
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user:
                raise credentials_exception
        
    return user