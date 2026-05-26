"""
Module 5: Schemas Package Initialization
=========================================
Purpose: Export all Pydantic validation models and enums for centralized importing.
"""

from app.schemas.hazard import (
    HazardType,
    UrgencyLevel,
    HazardStatus,
    HazardUploadRequest,
    VoiceReportRequest,
    SeverityAnalyzeRequest,
    HazardResponse,
    HeatmapClusterResponse,
    DashboardAnalyticsResponse,
    SeverityScoreResponse,
    BadgeResponse,
    HotspotPrediction,
    HotspotsResponse,
    RecurringPattern,
    RecurringPatternsResponse
)

__all__ = [
    "HazardType",
    "UrgencyLevel",
    "HazardStatus",
    "HazardUploadRequest",
    "VoiceReportRequest",
    "SeverityAnalyzeRequest",
    "HazardResponse",
    "HeatmapClusterResponse",
    "DashboardAnalyticsResponse",
    "SeverityScoreResponse",
    "BadgeResponse",
    "HotspotPrediction",
    "HotspotsResponse",
    "RecurringPattern",
    "RecurringPatternsResponse"
]
