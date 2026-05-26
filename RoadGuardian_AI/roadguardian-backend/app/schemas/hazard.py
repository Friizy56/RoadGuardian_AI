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
    assigned_to: Optional[str] = Field(None, description="Name of the assigned repair crew")
    assigned_at: Optional[datetime] = Field(None, description="Timestamp when the crew was assigned")
    resolved_image_url: Optional[str] = Field(None, description="URL of the resolution proof image")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes explaining reparation")
    resolved_by_id: Optional[int] = Field(None, description="User ID of the authority who resolved the report")
    resolved_by_name: Optional[str] = Field(None, description="Name of the authority who resolved the report")
    reporter_name: Optional[str] = Field(None, description="Full name or credential of the reporting user")

    @model_validator(mode="before")
    @classmethod
    def resolve_relations(cls, data: Any) -> Any:
        """
        ORM validator resolving the computed `reporter_name` and `resolved_by_name`
        parameters from their associated `User` model relationships if present.
        """
        # Resolve reporter_name
        if isinstance(data, dict):
            user = data.get("user")
            if user:
                if isinstance(user, dict):
                    data["reporter_name"] = user.get("full_name") or user.get("email")
                else:
                    data["reporter_name"] = getattr(user, "full_name", None) or getattr(user, "email", None)
            
            resolved_by = data.get("resolved_by")
            if resolved_by:
                if isinstance(resolved_by, dict):
                    data["resolved_by_name"] = resolved_by.get("full_name") or resolved_by.get("email")
                else:
                    data["resolved_by_name"] = getattr(resolved_by, "full_name", None) or getattr(resolved_by, "email", None)
        else:
            user = getattr(data, "user", None)
            if user:
                try:
                    data.reporter_name = getattr(user, "full_name", None) or getattr(user, "email", None)
                except AttributeError:
                    pass
            
            resolved_by = getattr(data, "resolved_by", None)
            if resolved_by:
                try:
                    data.resolved_by_name = getattr(resolved_by, "full_name", None) or getattr(resolved_by, "email", None)
                except AttributeError:
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


class HotspotPrediction(BaseModel):
    """Schema representing a single predicted high-risk grid hotspot"""
    model_config = ConfigDict(from_attributes=True)

    latitude: float = Field(..., description="Calculated center latitude coordinate of the prediction zone")
    longitude: float = Field(..., description="Calculated center longitude coordinate of the prediction zone")
    risk_level: str = Field(..., description="Predicted hazard risk density level: high or medium")
    expected_hazards_per_week: float = Field(..., description="Estimated new hazard occurrences expected per week")
    peak_time_hour: int = Field(..., description="Forecasted daily peak occurrence hour of day (0 to 23)")
    avg_severity: float = Field(..., description="Forecasted average severity of issues in the zone")
    common_type: HazardType = Field(..., description="Most common hazard classification inside this zone")


class HotspotsResponse(BaseModel):
    """Schema representing complete spatial-temporal hotspots predictions"""
    model_config = ConfigDict(from_attributes=True)

    predicted_hotspots: List[HotspotPrediction] = Field(..., description="List of predicted hotspot grids")
    confidence: float = Field(..., description="Calculated forecasting confidence index (0.0 to 1.0)")
    analysis_period_days: int = Field(..., description="Total lookback timeframe in days analyzed")
    total_hazards_analyzed: int = Field(..., description="Total number of records consumed by the analysis")


class RecurringPattern(BaseModel):
    """Schema representing a repeating hazard occurrence cluster"""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Primary seed hazard ID forming the recurrence cluster")
    type: HazardType = Field(..., description="Type of repeating hazard")
    latitude: float = Field(..., description="Latitude coordinate of repeating issue")
    longitude: float = Field(..., description="Longitude coordinate of repeating issue")
    recurrence_count: int = Field(..., description="Total number of times this issue has recurring reports")
    first_seen: datetime = Field(..., description="First reported timestamp of this issue")
    last_seen: datetime = Field(..., description="Last reported timestamp of this issue")


class RecurringPatternsResponse(BaseModel):
    """Schema representing recurring hazard patterns response"""
    model_config = ConfigDict(from_attributes=True)

    recurring_hazards: List[RecurringPattern] = Field(..., description="Top recurring hazard patterns detected")
