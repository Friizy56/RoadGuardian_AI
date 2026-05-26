import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn

from app.config import settings
from app.database import init_db, get_db
from app.auth import auth_router

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("🚀 Starting up RoadGuardian AI API...")
    try:
        await init_db()
        logger.info("✅ Database tables successfully verified/created.")
    except Exception as e:
        logger.critical(f"❌ Database initialization failed on startup: {e}")
    
    yield
    
    # Shutdown actions
    logger.info("🔌 Shutting down RoadGuardian AI API...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# CORS middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom exception handler for standard HTTP errors"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Custom global exception handler for uncaught server errors"""
    logger.error(f"🔥 Unhandled server exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include authentication router
app.include_router(auth_router)

# Include hazards router dynamically (ImportError exception fallback until implemented)
try:
    from app.routes.hazards import router as hazards_router
    app.include_router(hazards_router)
    logger.info("✅ Hazards router loaded successfully.")
except (ImportError, AttributeError):
    logger.warning("⚠️ Hazards router (app.routes.hazards) not found or unimplemented. Skipping inclusion.")


# Mount the web application static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# Core endpoints
@app.get("/")
async def root():
    """Redirects root welcome endpoint to interactive web application dashboard"""
    return RedirectResponse(url="/static/index.html")


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint validating service status and database connection"""
    try:
        # Perform query to test DB response
        await db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "disconnected",
                "detail": str(e)
            }
        )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
