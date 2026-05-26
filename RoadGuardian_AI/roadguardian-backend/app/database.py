"""
Module 2: Database Connection & Session Management
===================================================
Purpose: Async PostgreSQL connection via SQLAlchemy with automatic SQLite fallback.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import os

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# ======================
# Async URL Conversion
# ======================
def get_async_db_url(url: str) -> str:
    if not url: return ""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

# ======================
# Engine Initialization with Fallback
# ======================
import socket
from urllib.parse import urlparse

USE_MOCK_DB = False

try:
    async_url = get_async_db_url(settings.DATABASE_URL)
    if not async_url:
        raise ValueError("DATABASE_URL is empty")
        
    # Synchronously verify DNS resolution before engine creation
    parsed = urlparse(async_url)
    host = parsed.hostname
    if not host:
        raise ValueError("Host not specified in DATABASE_URL")
        
    # Perform standard DNS resolution check
    socket.gethostbyname(host)
    
    engine = create_async_engine(
        async_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
    )
    logger.info("✅ Connected to PostgreSQL (Supabase)")
except Exception as e:
    # Fallback to SQLite for local development
    logger.warning(f"⚠️ Cloud DB connection pre-check failed: {e}")
    logger.warning("🔄 Falling back to local SQLite database...")
    engine = create_async_engine(
        "sqlite+aiosqlite:///./roadguardian_dev.db",
        echo=settings.DEBUG,
    )
    USE_MOCK_DB = True

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# ORM Base Class
class Base(DeclarativeBase):
    pass

# ======================
# Session Management
# ======================
@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ======================
# Initialization & Test
# ======================
async def test_db_connection() -> bool:
    from sqlalchemy import text
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {e}")
        return False

async def init_db() -> None:
    """
    Initializes the database by creating all tables defined by the ORM models.
    This function should be called at application startup.
    """
    logger.info("🔄 Initializing database...")
    try:
        async with engine.begin() as conn:
            # This command inspects all classes that inherit from Base
            # and creates the corresponding tables in the database.
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created successfully (if they didn't exist).")
    except Exception as e:
        logger.error(f"❌ CRITICAL: Could not create database tables: {e}")
        # We still have the fallback to SQLite, but table creation might fail there too.
        # If the primary DB connection fails, the fallback logic in this file handles it.
        # This part specifically handles failure during the table creation step.
        if "getaddrinfo failed" in str(e):
            logger.error("   Hint: This is a network issue. The database host is unreachable.")
        raise