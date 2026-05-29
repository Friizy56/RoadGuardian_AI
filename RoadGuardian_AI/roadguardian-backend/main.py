import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn

from app.config import settings
from app.database import init_db, get_db, test_db_connection
try:
    from app.auth import auth_router
    app_auth_available = True
except Exception:
    auth_router = None
    app_auth_available = False
    # Auth router import failed; will log after logger is configured
from app.utils.websocket import manager

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
        # Fail startup loudly so orchestrators know the app isn't healthy
        raise
    
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
    # If a 404 occurred for a client-side SPA route, serve the SPA index so the
    # frontend router can handle the path. Avoid doing this for API/static paths.
    if exc.status_code == 404:
        path = request.url.path.lstrip('/')
        first_seg = path.split('/', 1)[0] if path else ''
        if first_seg not in ('static', 'api', 'auth', 'docs'):
            return FileResponse(_STATIC_INDEX)

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


# Include authentication router if available
if app_auth_available and auth_router is not None:
    app.include_router(auth_router)
else:
    logger.warning("⚠️ Skipping inclusion of auth router due to import issues.")

# Include hazards router dynamically (ImportError exception fallback until implemented)
try:
    from app.routes.hazards import router as hazards_router
    app.include_router(hazards_router)
    logger.info("✅ Hazards router loaded successfully.")
except (ImportError, AttributeError):
    logger.warning("⚠️ Hazards router (app.routes.hazards) not found or unimplemented. Skipping inclusion.")


# WebSocket endpoint route for real-time updates
@app.websocket("/ws/hazards")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_INDEX = STATIC_DIR / "index.html"

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
else:
    logger.warning("⚠️ Static directory not found; skipping static file mount.")


# Core endpoints
@app.get("/")
async def root():
    """Redirects root welcome endpoint to interactive web application dashboard"""
    if not STATIC_INDEX.exists():
        return JSONResponse(status_code=503, content={"detail": "Frontend static assets are unavailable"})
    return RedirectResponse(url="/static/index.html")



@app.get("/authority")
async def authority_page():
    """Serve SPA index for the Authority dashboard route."""
    if not STATIC_INDEX.exists():
        return JSONResponse(status_code=503, content={"detail": "Frontend static assets are unavailable"})
    return FileResponse(_STATIC_INDEX)


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


@app.get("/health/db")
async def health_db():
    """Async health check using `test_db_connection()` helper."""
    try:
        ok = await test_db_connection()
        if ok:
            return {"status": "ok", "database": "connected"}
        return JSONResponse(status_code=503, content={"status": "error", "database": "disconnected"})
    except Exception as exc:
        logger.error(f"❌ /health/db check failed: {exc}")
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(exc)})


# SPA fallback: serve index.html for any other GET path so client-side routing works
from fastapi.responses import FileResponse
from pathlib import Path
_STATIC_INDEX = str(Path(__file__).resolve().parent / "static" / "index.html")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # If path starts with api or static or docs, let other routes handle it
    first_seg = full_path.split('/', 1)[0] if full_path else ''
    if first_seg in ("static", "auth", "api", "docs"):
        raise HTTPException(status_code=404)
    if not STATIC_INDEX.exists():
        return JSONResponse(status_code=503, content={"detail": "Frontend static assets are unavailable"})
    return FileResponse(_STATIC_INDEX)



if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
