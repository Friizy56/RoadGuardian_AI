"""
Module 7: Hazard Routing Controller
====================================
Purpose: FastAPI APIRouter handlers for managing reported infrastructure hazards.
Dependencies: fastapi, sqlalchemy, app.auth, app.services, app.schemas
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

import os
import time
import shutil
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.hazard import User, Hazard
from app.services.hazard_service import HazardService
from app.schemas.hazard import (
    HazardStatus,
    HazardType,
    HazardUploadRequest,
    VoiceReportRequest,
    SeverityAnalyzeRequest,
    HazardResponse,
    HeatmapClusterResponse,
    DashboardAnalyticsResponse,
    SeverityScoreResponse
)

logger = logging.getLogger(__name__)

# Initialize Router
router = APIRouter(prefix="/hazards", tags=["Hazards"])

# Ensure uploads folder exists locally
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==========================================
# AI Service Mock Fallback Abstractions
# ==========================================

try:
    from app.ai_engine.vision import detect_hazard_severity
except (ImportError, AttributeError):
    async def detect_hazard_severity(image_path: str) -> float:
        """
        Mock fallback evaluator for YOLO model.
        Returns a mock prediction confidence score of 0.88.
        """
        logger.info(f"🔮 Vision fallback called for path: {image_path}. Mocking confidence: 0.88")
        return 0.88

try:
    from app.ai_engine.voice import transcribe_voice_report
except (ImportError, AttributeError):
    async def transcribe_voice_report(audio_path: str) -> str:
        """
        Mock fallback transcription layer for Whisper.
        Returns a mock transcript.
        """
        logger.info(f"🔮 Speech fallback called for path: {audio_path}. Mocking transcript.")
        return "large pothole in the middle of the road posing an immediate hazard"


# ==========================================
# Schema for PATCH Update
# ==========================================

class HazardStatusUpdateRequest(BaseModel):
    status: HazardStatus


# ==========================================
# API Endpoints
# ==========================================

@router.post("/upload", response_model=HazardResponse, status_code=status.HTTP_201_CREATED)
async def upload_hazard(
    image: UploadFile = File(..., description="Image file of the reported hazard"),
    hazard_type: HazardType = Form(..., description="Classified category type of the hazard"),
    latitude: float = Form(..., description="Latitude coordinate of the hazard (-90 to 90)"),
    longitude: float = Form(..., description="Longitude coordinate of the hazard (-180 to 180)"),
    description: Optional[str] = Form(None, description="Optional text context description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a new hazard report containing an image.
    Performs local storage writing, calls YOLO detection stubs, and builds DB records.
    """
    # Coordinate boundary checks
    if not (-90.0 <= latitude <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90.0 and 90.0 degrees."
        )
    if not (-180.0 <= longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180.0 and 180.0 degrees."
        )

    # Standardize image filename: {user_id}_{timestamp}.jpg
    # Retain the original file extension if possible
    orig_ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{current_user.id}_{int(time.time())}{orig_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        # Save image locally
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    except Exception as e:
        logger.error(f"❌ Failed to save image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not write file to local disk storage."
        )

    # Evaluate using YOLO model stub
    confidence = await detect_hazard_severity(filepath)

    # Build hazard creation arguments dictionary
    hazard_data = {
        "hazard_type": hazard_type.value,
        "latitude": latitude,
        "longitude": longitude,
        "description": description,
        "confidence_score": confidence,
        "traffic_density": "medium",  # Standard baseline fallback
        "weather": "clear"            # Standard baseline fallback
    }

    # Map image URL path relatively
    relative_url = f"/uploads/{filename}"

    # Commit report to database using hazard services
    new_hazard = await HazardService.create_hazard(
        db=db,
        user_id=current_user.id,
        data=hazard_data,
        image_url=relative_url
    )

    return new_hazard


@router.post("/voice-report", response_model=HazardResponse, status_code=status.HTTP_201_CREATED)
async def upload_voice_hazard(
    audio: UploadFile = File(..., description="Audio recording of voice report description"),
    latitude: float = Form(..., description="Latitude coordinate of the voice report (-90 to 90)"),
    longitude: float = Form(..., description="Longitude coordinate of the voice report (-180 to 180)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a hazard report using voice recordings.
    Transcribes audio using Whisper STT stubs, resolves severity, and persists records.
    """
    # Coordinate boundary checks
    if not (-90.0 <= latitude <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90.0 and 90.0 degrees."
        )
    if not (-180.0 <= longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180.0 and 180.0 degrees."
        )

    # Save audio file temporarily
    orig_ext = os.path.splitext(audio.filename)[1] or ".wav"
    filename = f"voice_{current_user.id}_{int(time.time())}{orig_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
    except Exception as e:
        logger.error(f"❌ Failed to save audio file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not write audio file to storage."
        )

    # Transcribe audio using Whisper model stub
    transcript = await transcribe_voice_report(filepath)

    # Standard parser logic mapping transcripts to hazard types
    # Simple semantic keyword scanning
    transcript_lower = transcript.lower()
    inferred_type = HazardType.other
    if "pothole" in transcript_lower:
        inferred_type = HazardType.pothole
    elif "crack" in transcript_lower:
        inferred_type = HazardType.crack
    elif "water" in transcript_lower or "flood" in transcript_lower or "logging" in transcript_lower:
        inferred_type = HazardType.waterlogging
    elif "divider" in transcript_lower or "barrier" in transcript_lower:
        inferred_type = HazardType.broken_dividers
    elif "sign" in transcript_lower or "board" in transcript_lower:
        inferred_type = HazardType.missing_signs

    # Build hazard payload mapping details
    hazard_data = {
        "hazard_type": inferred_type.value,
        "latitude": latitude,
        "longitude": longitude,
        "description": f"[Voice Transcript]: {transcript}",
        "confidence_score": 0.80,     # Standard confidence baseline for voice transcripts
        "traffic_density": "medium",
        "weather": "clear"
    }

    # Commit report to database using service
    new_hazard = await HazardService.create_hazard(
        db=db,
        user_id=current_user.id,
        data=hazard_data,
        image_url=None  # Voice reports do not initially contain visual assets
    )

    # Clean up local audio file after transaction succeeds to free disk space
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.warning(f"⚠️ Failed to remove temp audio file: {e}")

    return new_hazard


@router.get("/heatmap", response_model=List[HeatmapClusterResponse])
async def get_heatmap(
    north: Optional[float] = None,
    south: Optional[float] = None,
    east: Optional[float] = None,
    west: Optional[float] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns coordinate grids grouped into spatial heatmap clusters.
    Supports rectangle filtering if bounding coordinates are provided.
    """
    bounds = None
    if all(v is not None for v in [north, south, east, west]):
        bounds = {
            "min_lat": south,
            "max_lat": north,
            "min_lng": west,
            "max_lng": east
        }

    clusters = await HazardService.get_heatmap_clusters(db, bounds)
    return clusters


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
async def get_dashboard_analytics(db: AsyncSession = Depends(get_db)):
    """
    Exposes report aggregates and metrics lists for analytical summaries.
    """
    stats = await HazardService.get_dashboard_stats(db)
    return stats


@router.post("/analyze-severity", response_model=SeverityScoreResponse)
async def analyze_severity(payload: SeverityAnalyzeRequest):
    """
    Exposes calculations demonstrating severity ratings and urgencies 
    based on custom parameters. No persistence is saved.
    """
    analysis = await HazardService.calculate_severity_score(
        hazard_type=payload.hazard_type.value,
        confidence=payload.confidence_score,
        traffic_density=payload.traffic_density,
        weather=payload.weather_condition
    )
    return analysis


@router.get("/my-reports", response_model=List[HazardResponse])
async def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns lists of reports reported by the current active citizen.
    """
    stmt = (
        select(Hazard)
        .where(Hazard.user_id == current_user.id)
        .options(selectinload(Hazard.user))
        .order_by(Hazard.created_at.desc())
    )
    res = await db.execute(stmt)
    hazards = res.scalars().all()
    return hazards


@router.patch("/{hazard_id}/status", response_model=HazardResponse)
async def update_hazard_status(
    hazard_id: int,
    payload: HazardStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the status of a hazard report. Restricted to authority/admin accounts.
    Triggers citizen points allocation and gamification rewards when marked 'verified'.
    """
    # Restrict action to authority accounts
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authority or admin accounts are permitted to modify report status."
        )

    # Query target hazard record
    stmt = (
        select(Hazard)
        .where(Hazard.id == hazard_id)
        .options(selectinload(Hazard.user))
    )
    res = await db.execute(stmt)
    hazard = res.scalar_one_or_none()

    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard report with ID {hazard_id} not found."
        )

    # Trigger point increments and badge rewards on transitioning to 'verified' status
    if payload.status == HazardStatus.verified and hazard.status != "verified":
        await HazardService.process_verified_report(db, hazard.id)
    else:
        # Standard updates for resolved or rejected status transitions
        hazard.status = payload.status.value
        if payload.status == HazardStatus.resolved:
            hazard.resolved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(hazard)

    return hazard
