"""
Module 2: Database Connection & Session Management
===================================================
Purpose: Async PostgreSQL connection via SQLAlchemy.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# ======================
# Async URL Conversion
# ======================
def get_async_db_url(url: str) -> str:
    if not url: return ""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if url.startswith("postgresql+asyncpg://") and "prepared_statement_cache_size=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}prepared_statement_cache_size=0"

    return url

# ======================
# Engine Initialization
# ======================

async_url = get_async_db_url(settings.DATABASE_URL)
if not async_url:
    raise ValueError("DATABASE_URL is empty")

engine_connect_args = {}
if "postgresql+asyncpg" in async_url:
    engine_connect_args["statement_cache_size"] = 0
    engine_connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"

engine = create_async_engine(
    async_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    poolclass=NullPool,
    connect_args=engine_connect_args
)
logger.info("✅ Connected to PostgreSQL (Supabase)")

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

try:
    from app.models.base import Base
except Exception:
    Base = None
    logger.warning("⚠️ app.models package not found; database table creation will be skipped if models are missing.")

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
    try:
        # Import models here so they are registered with Base.metadata before create_all
        try:
            import app.models.hazard  # noqa: F401
        except Exception:
            logger.warning("⚠️ No model modules found to register; skipping model imports.")

        if Base is None:
            logger.warning("⚠️ Base metadata not available; skipping create_all.")
            return

        async with engine.begin() as conn:
            # This command inspects all classes that inherit from Base
            # and creates the corresponding tables in the database.
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created successfully (if they didn't exist).")
    except Exception as e:
        logger.error(f"❌ CRITICAL: Could not create database tables: {e}")
        raise