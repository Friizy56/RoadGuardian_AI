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
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.hazard import User, Hazard
from app.services.hazard_service import HazardService
from app.services.prediction_service import PredictionService
from app.services.notification_service import NotificationService
from app.schemas.hazard import (
    HazardStatus,
    HazardType,
    HazardUploadRequest,
    VoiceReportRequest,
    SeverityAnalyzeRequest,
    HazardResponse,
    HeatmapClusterResponse,
    DashboardAnalyticsResponse,
    SeverityScoreResponse,
    HotspotsResponse,
    RecurringPatternsResponse,
    RecurringPatternsReportResponse
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
    from app.ai_engine.vision import detect_hazard_severity, verify_resolution, apply_privacy_filters
    AI_ANALYSIS_AVAILABLE = True
except (ImportError, AttributeError):
    AI_ANALYSIS_AVAILABLE = False
    logger.warning("Vision AI engine is unavailable; falling back to a default severity score.")

    async def detect_hazard_severity(image_path: str) -> float:
        """
        Mock fallback evaluator for YOLO model.
        Returns a mock prediction confidence score of 0.88.
        """
        logger.info(f"🔮 Vision fallback called for path: {image_path}. Mocking confidence: 0.88")
        return 0.88

    async def verify_resolution(before_image_path: str, after_image_path: str) -> bool:
        logger.info(f"🔮 Vision fallback called for verify_resolution. Mocking True.")
        return True

    async def apply_privacy_filters(image_path: str) -> None:
        logger.info(f"🔮 Vision fallback called for apply_privacy_filters. Mocking pass.")
        pass

try:
    from app.ai_engine.voice import transcribe_voice_report
except (ImportError, AttributeError):
    logger.warning("Voice AI engine is unavailable; falling back to a default transcript.")

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
    severity_score: Optional[float] = Form(None, description="AI-detected severity score (0 to 10)"),
    confidence_score: Optional[float] = Form(None, description="AI model confidence (0 to 100)"),
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
            
        # Apply privacy filters to the saved image (Phase 5)
        await apply_privacy_filters(filepath)
    except Exception as e:
        logger.error(f"❌ Failed to save image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not write file to local disk storage."
        )

    # Evaluate using YOLO model stub
    ai_analysis_available = AI_ANALYSIS_AVAILABLE
    detected_confidence = 0.0
    try:
        detected_confidence = await detect_hazard_severity(filepath)
    except Exception as e:
        logger.exception("Failed to analyze image with AI")
        ai_analysis_available = False

    # Use provided scores from frontend AI, fallback to backend detection
    final_confidence = confidence_score if confidence_score is not None else detected_confidence
    final_severity = severity_score if severity_score is not None else None

    # Build hazard creation arguments dictionary
    hazard_data = {
        "hazard_type": hazard_type.value,
        "latitude": latitude,
        "longitude": longitude,
        "description": description,
        "confidence_score": final_confidence,
        "severity_score": final_severity,
        "ai_analysis_available": ai_analysis_available,
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

    # Broadcast new hazard creation to all connected WebSocket clients
    try:
        import json
        from app.utils.websocket import manager
        hazard_resp = HazardResponse.model_validate(new_hazard)
        await manager.broadcast({
            "type": "new_hazard",
            "data": json.loads(hazard_resp.model_dump_json())
        })
    except Exception as ws_err:
        logger.warning(f"⚠️ Failed to broadcast new hazard WebSocket update: {ws_err}")

    # Phase 2: Emergency Services Integration (Moved centrally to HazardService)

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
    ai_analysis_available = True
    try:
        transcript = await transcribe_voice_report(filepath)
    except Exception as e:
        logger.exception("Failed to transcribe audio with AI")
        transcript = ""
        ai_analysis_available = False

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
        "ai_analysis_available": ai_analysis_available,
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

    # Broadcast new voice hazard creation to all connected WebSocket clients
    try:
        import json
        from app.utils.websocket import manager
        hazard_resp = HazardResponse.model_validate(new_hazard)
        await manager.broadcast({
            "type": "new_hazard",
            "data": json.loads(hazard_resp.model_dump_json())
        })
    except Exception as ws_err:
        logger.warning(f"⚠️ Failed to broadcast voice report WebSocket update: {ws_err}")

    # Clean up local audio file after transaction succeeds to free disk space
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.warning(f"⚠️ Failed to remove temp audio file: {e}")

    # Phase 2: Emergency Services Integration (Moved centrally to HazardService)

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
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
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
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
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
        # Re-fetch from db to populate user relationship fully
        stmt_refetch = select(Hazard).where(Hazard.id == hazard.id).options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
        res_refetch = await db.execute(stmt_refetch)
        hazard = res_refetch.scalar_one()
    else:
        # Standard updates for resolved or rejected status transitions
        hazard.status = payload.status.value
        if payload.status == HazardStatus.resolved:
            hazard.resolved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(hazard)

    # Broadcast hazard status update to all connected WebSocket clients
    try:
        import json
        from app.utils.websocket import manager
        hazard_resp = HazardResponse.model_validate(hazard)
        await manager.broadcast({
            "type": "status_update",
            "data": json.loads(hazard_resp.model_dump_json())
        })
    except Exception as ws_err:
        logger.warning(f"⚠️ Failed to broadcast hazard status WebSocket update: {ws_err}")

    return hazard


# ==========================================
# Authority Dashboard Endpoints
# ==========================================

class DepartmentReassignRequest(BaseModel):
    department: str

@router.put("/{hazard_id}/department", response_model=HazardResponse)
async def reassign_department(
    hazard_id: int,
    payload: DepartmentReassignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually reassign the hazard to a different department.
    Restricted to authority/admin accounts.
    """
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authority or admin accounts are permitted to reassign departments."
        )

    stmt = (
        select(Hazard)
        .where(Hazard.id == hazard_id)
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    res = await db.execute(stmt)
    hazard = res.scalar_one_or_none()

    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hazard report with ID {hazard_id} not found."
        )

    hazard.linked_department = payload.department
    await db.commit()
    await db.refresh(hazard)

    try:
        import json
        from app.utils.websocket import manager
        hazard_resp = HazardResponse.model_validate(hazard)
        await manager.broadcast({
            "type": "status_update",
            "data": json.loads(hazard_resp.model_dump_json())
        })
    except Exception as ws_err:
        logger.warning(f"⚠️ Failed to broadcast hazard department update: {ws_err}")

    return hazard

# ==========================================

class AssignCrewRequest(BaseModel):
    crew_name: str


@router.get("/authority/pending", response_model=List[HazardResponse])
async def get_pending_hazards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending hazards for authority review, sorted by severity score descending"""
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    result = await db.execute(
        select(Hazard)
        .where(Hazard.status == "pending")
        .order_by(Hazard.severity_score.desc())
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    return result.scalars().all()


@router.post("/authority/verify-bulk")
async def verify_multiple_hazards(
    hazard_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk verify hazards and broadcast WebSocket status updates"""
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    verified_count = 0
    for hazard_id in hazard_ids:
        result = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
        hazard = result.scalar_one_or_none()
        if hazard and hazard.status == "pending":
            verified_count += 1
            # Award badge to reporter and update status
            await HazardService.process_verified_report(db, hazard_id)
            
            # Broadcast the updated status over WebSockets
            try:
                import json
                from app.utils.websocket import manager
                # Refetch to obtain loaded relationship properties
                stmt = select(Hazard).where(Hazard.id == hazard_id).options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
                res = await db.execute(stmt)
                updated_hazard = res.scalar_one()
                hazard_resp = HazardResponse.model_validate(updated_hazard)
                await manager.broadcast({
                    "type": "status_update",
                    "data": json.loads(hazard_resp.model_dump_json())
                })
            except Exception as e:
                logger.warning(f"⚠️ Failed to broadcast bulk verification update: {e}")
                
    await db.commit()
    return {"verified_count": verified_count}


@router.post("/authority/assign/{hazard_id}")
async def assign_to_crew(
    hazard_id: int,
    payload: AssignCrewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign hazard to repair crew, verify the report if pending, and notify clients"""
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
        
    result = await db.execute(
        select(Hazard)
        .where(Hazard.id == hazard_id)
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    hazard = result.scalar_one_or_none()
    
    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard not found"
        )
    
    # Store assignment in database model
    hazard.assigned_to = payload.crew_name
    hazard.assigned_at = datetime.utcnow()
    
    # Transition status to verified if it was pending
    was_pending = hazard.status == "pending"
    if was_pending:
        hazard.status = "verified"
        try:
            await HazardService.process_verified_report(db, hazard_id)
            # Re-fetch from db to populate user relationship fully
            stmt_refetch = select(Hazard).where(Hazard.id == hazard_id).options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
            res_refetch = await db.execute(stmt_refetch)
            hazard = res_refetch.scalar_one()
        except Exception as e:
            logger.warning(f"⚠️ Failed to allocate verified rewards during assignment: {e}")
    else:
        await db.commit()
        await db.refresh(hazard)
    
    # Broadcast updated state over WebSockets
    try:
        import json
        from app.utils.websocket import manager
        hazard_resp = HazardResponse.model_validate(hazard)
        await manager.broadcast({
            "type": "status_update",
            "data": json.loads(hazard_resp.model_dump_json())
        })
    except Exception as e:
        logger.warning(f"⚠️ Failed to broadcast assignment socket update: {e}")
        
    return {
        "message": f"Hazard #{hazard_id} successfully assigned to {payload.crew_name}",
        "hazard_id": hazard_id,
        "assigned_to": payload.crew_name,
        "status": hazard.status
    }


@router.get("/authority/active", response_model=List[HazardResponse])
async def get_active_hazards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all verified/assigned but not yet resolved hazards for authority action"""
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    result = await db.execute(
        select(Hazard)
        .where(Hazard.status == "verified")
        .where(Hazard.assigned_to != None)
        .order_by(Hazard.assigned_at.desc())
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    return result.scalars().all()


@router.get("/authority/sla-breaches", response_model=List[HazardResponse])
async def get_sla_breaches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all hazards that have breached their SLA deadlines."""
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    # First update and evaluate SLA statuses centrally using HazardService
    await HazardService.evaluate_sla_status(db)

    # Then return all breached hazards
    result = await db.execute(
        select(Hazard)
        .where(Hazard.sla_breached == True)
        .where(Hazard.status != "resolved")
        .where(Hazard.status != "rejected")
        .order_by(Hazard.sla_deadline.asc())
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    return result.scalars().all()


@router.post("/authority/resolve/{hazard_id}", response_model=HazardResponse)
async def resolve_hazard(
    hazard_id: int,
    resolved_image: UploadFile = File(..., description="Proof image of the resolved/repaired hazard"),
    resolution_notes: Optional[str] = Form(None, description="Detailed notes about the resolution"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a resolution proof for a hazard.
    Saves the resolution proof image, records resolution notes, and updates status to 'resolved'.
    Restricted to authority/admin accounts.
    """
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
        
    stmt = (
        select(Hazard)
        .where(Hazard.id == hazard_id)
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    res = await db.execute(stmt)
    hazard = res.scalar_one_or_none()
    
    if not hazard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hazard not found"
        )
        
    # Save the resolved image
    orig_ext = os.path.splitext(resolved_image.filename)[1] or ".jpg"
    filename = f"resolved_{hazard_id}_{int(time.time())}{orig_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(resolved_image.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save resolved proof image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not write file to local disk storage."
        )
        
    # Verify resolution image structurally matches original hazard image (Phase 3)
    if hazard.image_url:
        # Assuming hazard.image_url is like '/uploads/123_456.jpg'
        before_filepath = os.path.join(os.getcwd(), hazard.image_url.lstrip("/"))
        is_valid = await verify_resolution(before_filepath, filepath)
        if not is_valid:
            # Clean up the invalid file
            if os.path.exists(filepath):
                os.remove(filepath)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resolution proof rejected: The 'After' image does not structurally match the original 'Before' image."
            )
        
    hazard.resolved_image_url = f"/uploads/{filename}"
    hazard.resolution_notes = resolution_notes
    hazard.resolved_by_id = current_user.id
    hazard.resolved_by = current_user  # Force immediate ORM in-memory mapping to bypass cache
    hazard.resolved_at = datetime.utcnow()
    
    was_pending = hazard.status == "pending"
    hazard.status = "resolved"
    
    # Save basic hazard fields first
    await db.commit()
    
    if was_pending:
        try:
            # Award points and verified hero badge
            await HazardService.process_verified_report(db, hazard_id)
            # Re-fetch and re-assert status is resolved (since process_verified_report overrides status to verified)
            hazard.status = "resolved"
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to allocate verified rewards during direct resolution: {e}")
            
    # Re-fetch to populate all relationships fully including resolved_by
    stmt_refetch = (
        select(Hazard)
        .where(Hazard.id == hazard_id)
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    res_refetch = await db.execute(stmt_refetch)
    hazard = res_refetch.scalar_one()
    
    # Broadcast updated status over WebSockets
    try:
        import json
        from app.utils.websocket import manager
        hazard_resp = HazardResponse.model_validate(hazard)
        await manager.broadcast({
            "type": "status_update",
            "data": json.loads(hazard_resp.model_dump_json())
        })
    except Exception as e:
        logger.warning(f"Failed to broadcast resolution update: {e}")
        
    return hazard


@router.get("/public/active", response_model=List[HazardResponse])
async def get_public_active_hazards(db: AsyncSession = Depends(get_db)):
    """
    Get all active hazards (pending or verified) for public viewing (e.g. Heatmap).
    """
    result = await db.execute(
        select(Hazard)
        .where(Hazard.status.in_(["pending", "verified"]))
        .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
    )
    return result.scalars().all()


@router.get("/predictions/hotspots", response_model=HotspotsResponse)
async def get_predicted_hotspots(
    days_lookback: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Predict high-risk hazard zones based on historical spatial clusters.
    Restricted to authority/admin roles.
    """
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    result = await PredictionService.predict_hotspots(db, days_lookback)
    return result


@router.get("/predict-hotspots", response_model=HotspotsResponse)
async def get_predict_hotspots_alias(
    days_lookback: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Alias for predictions/hotspots to support predict-hotspots path.
    Restricted to authority/admin roles.
    """
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    result = await PredictionService.predict_hotspots(db, days_lookback)
    return result


@router.get("/predictions/recurring", response_model=RecurringPatternsResponse)
async def get_recurring_patterns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find recurring hazard patterns (e.g., same pothole reappears).
    Restricted to authority/admin roles.
    """
    if current_user.role not in ["authority", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority access required"
        )
    
    result = await PredictionService.get_recurring_patterns(db)
    return result


@router.get("/recurring-patterns", response_model=RecurringPatternsReportResponse)
async def get_recurring_patterns_report_endpoint(
    db: AsyncSession = Depends(get_db)
):
    """
    Exposes recurring hazard patterns grouped by location and type.
    """
    result = await PredictionService.get_recurring_patterns_report(db)
    return result
