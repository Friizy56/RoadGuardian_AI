"""
Module 5: Hazard Schemas
=======================
Purpose: Pydantic schemas for data validation and serialization of hazards.
Dependencies: pydantic, enum, datetime
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator


# ==========================================
# Enums
# ==========================================

class HazardType(str, Enum):
    pothole = "pothole"
    crack = "crack"
    waterlogging = "waterlogging"
    broken_dividers = "broken_dividers"
    missing_signs = "missing_signs"
    other = "other"


class UrgencyLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class HazardStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    resolved = "resolved"
    rejected = "rejected"


# ==========================================
# Request Schemas
# ==========================================

class HazardUploadRequest(BaseModel):
    """Schema representing direct citizen hazard reporting inputs"""
    model_config = ConfigDict(from_attributes=True)

    hazard_type: HazardType = Field(..., description="The classified type of the infrastructure hazard")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of the hazard location (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of the hazard location (-180 to 180)")
    description: Optional[str] = Field(None, max_length=500, description="Optional textual description or comments")


class VoiceReportRequest(BaseModel):
    """Schema representing automated voice hazard report inputs"""
    model_config = ConfigDict(from_attributes=True)

    audio_base64: str = Field(..., description="Base64 encoded string of audio report file")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of the voice report location (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of the voice report location (-180 to 180)")


class SeverityAnalyzeRequest(BaseModel):
    """Schema representing inputs to calculate AI severity scores"""
    model_config = ConfigDict(from_attributes=True)

    hazard_type: HazardType = Field(..., description="Hazard type category")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="AI visual model detection confidence score (0.0 to 1.0)")
    traffic_density: Optional[str] = Field(None, description="Optional traffic condition context (e.g. heavy, moderate, light)")
    weather_condition: Optional[str] = Field(None, description="Optional weather context (e.g. rainy, clear, heavy_snow)")


# ==========================================
# Response Schemas
# ==========================================

class HazardResponse(BaseModel):
    """Schema representing serialized hazard models returned to clients"""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique database identifier of the hazard record")
    hazard_type: HazardType = Field(..., description="Type of road hazard")
    latitude: float = Field(..., description="Geographical latitude coordinate")
    longitude: float = Field(..., description="Geographical longitude coordinate")
    severity_score: float = Field(..., description="Assessed severity score from 0.0 to 10.0")
    confidence_score: float = Field(..., description="AI model prediction confidence score (0.0 to 1.0)")
    urgency_level: UrgencyLevel = Field(..., description="Calculated urgency level of the hazard")
    status: HazardStatus = Field(..., description="Platform status of the hazard report")
    image_url: Optional[str] = Field(None, description="Supabase bucket URL of the uploaded hazard image")
    description: Optional[str] = Field(None, description="Text description or transcipt associated with report")
    created_at: datetime = Field(..., description="Submission timestamp")
    resolved_at: Optional[datetime] = Field(None, description="Timestamp when the hazard was marked resolved")
    reporter_name: Optional[str] = Field(None, description="Full name or credential of the reporting user")

    @model_validator(mode="before")
    @classmethod
    def resolve_reporter_name(cls, data: Any) -> Any:
        """
        ORM validator resolving the computed `reporter_name` parameter from 
        the associated `User` model relationship if present.
        """
        if isinstance(data, dict):
            user = data.get("user")
            if user:
                if isinstance(user, dict):
                    data["reporter_name"] = user.get("full_name") or user.get("email")
                else:
                    data["reporter_name"] = getattr(user, "full_name", None) or getattr(user, "email", None)
        else:
            user = getattr(data, "user", None)
            if user:
                # Set dynamic attribute on the ORM object model or mapped proxy
                try:
                    data.reporter_name = getattr(user, "full_name", None) or getattr(user, "email", None)
                except AttributeError:
                    # Fallback if object is immutable read-only
                    pass
        return data


class HeatmapClusterResponse(BaseModel):
    """Schema representing grouped spatial hazard counts for frontend maps"""
    model_config = ConfigDict(from_attributes=True)

    center_lat: float = Field(..., description="Center latitude coordinate of the cluster group")
    center_lng: float = Field(..., description="Center longitude coordinate of the cluster group")
    hazard_count: int = Field(..., description="Total hazards within the cluster area")
    severity_avg: float = Field(..., description="Average severity score of all hazards in the cluster")
    hazard_types: Dict[HazardType, int] = Field(..., description="Count breakdowns of individual hazard types")
    cluster_radius_meters: float = Field(..., description="Radius defining the boundaries of the cluster in meters")


class DashboardAnalyticsResponse(BaseModel):
    """Schema representing analytical summaries for authority dashboard panels"""
    model_config = ConfigDict(from_attributes=True)

    total_hazards: int = Field(..., description="Total number of reports submitted")
    pending_count: int = Field(..., description="Total pending hazard submissions")
    resolved_count: int = Field(..., description="Total verified resolved issues")
    avg_severity: float = Field(..., description="Average system-wide severity score")
    high_urgency_count: int = Field(..., description="Total hazards flagged critical or high urgency")
    recent_hazards: List[HazardResponse] = Field(..., description="List of the most recent hazard reports")


class SeverityScoreResponse(BaseModel):
    """Schema representing calculated hazard severity and urgency metrics"""
    model_config = ConfigDict(from_attributes=True)

    severity_score: float = Field(..., ge=0.0, le=10.0, description="Calculated hazard severity score (0.0 to 10.0)")
    urgency_level: UrgencyLevel = Field(..., description="Resolved priority levels")
    factors: Dict[str, Any] = Field(..., description="Explanatory breakdown of mathematical weights applied")


class BadgeResponse(BaseModel):
    """Schema representing gamification badges achieved by citizens"""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Badge primary key identifier")
    badge_name: str = Field(..., description="Name of the achieved badge")
    points_awarded: int = Field(..., description="Points rewarded to the user for this achievement")
    description: str = Field(..., description="Details and milestones completed for this badge")
    earned_at: datetime = Field(..., description="Earned timestamp")
