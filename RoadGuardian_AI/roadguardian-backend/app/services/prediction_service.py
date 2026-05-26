"""
Module 8: Hazard Prediction & Analytics Service
================================================
Purpose: Spatial-temporal and location-based recurring analysis 
         for predictive hotspot routing and infrastructure monitoring.
Dependencies: sqlalchemy, collections, app.models
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import List, Dict
from app.models.hazard import Hazard
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func


class PredictionService:
    """
    Service responsible for machine-learning-inspired spatial trend analysis and hazard recurrence pattern evaluations.
    """

    @staticmethod
    async def predict_hotspots(db: AsyncSession, days_lookback: int = 30) -> dict:
        """
        Predicts high-risk zones based on historical spatial clusters and recency density metrics.
        Clusters coordinates into approx 1.1km grid areas (0.01 degree increments).
        """
        # Get hazards from last N days that have been verified or resolved
        cutoff_date = datetime.utcnow() - timedelta(days=days_lookback)
        result = await db.execute(
            select(Hazard)
            .where(Hazard.created_at >= cutoff_date)
            .where(Hazard.status.in_(['verified', 'resolved']))
        )
        hazards = result.scalars().all()
        
        if len(hazards) < 5:
            return {
                "predicted_hotspots": [], 
                "confidence": 0.0,
                "analysis_period_days": days_lookback,
                "total_hazards_analyzed": len(hazards)
            }
        
        # Cluster by location (grid-based rounding to 0.01 degree)
        hotspots = defaultdict(list)
        for hazard in hazards:
            grid_key = (round(hazard.latitude, 2), round(hazard.longitude, 2))
            hotspots[grid_key].append(hazard)
        
        # Find high-frequency grids (grids possessing >= 3 hazard records)
        predicted = []
        for (lat, lng), hazards_in_grid in hotspots.items():
            if len(hazards_in_grid) >= 3:
                # Calculate trend based on reports recency within the last 7 days
                recent_count = sum(
                    1 for h in hazards_in_grid 
                    if h.created_at >= datetime.utcnow() - timedelta(days=7)
                )
                
                # Determine average severity rating within cluster
                avg_severity = sum(h.severity_score for h in hazards_in_grid) / len(hazards_in_grid)
                
                # Retrieve time-of-day peak pattern detection
                hours = [h.created_at.hour for h in hazards_in_grid]
                peak_hour = Counter(hours).most_common(1)[0][0] if hours else 12
                
                predicted.append({
                    "latitude": round(lat + 0.005, 4),  # Center offset of grid
                    "longitude": round(lng + 0.005, 4),
                    "risk_level": "high" if recent_count >= 2 else "medium",
                    "expected_hazards_per_week": round(float(recent_count), 1),
                    "peak_time_hour": peak_hour,
                    "avg_severity": round(float(avg_severity), 1),
                    "common_type": Counter([h.hazard_type for h in hazards_in_grid]).most_common(1)[0][0]
                })
        
        confidence = min(0.95, len(predicted) / 10.0)
        
        return {
            "predicted_hotspots": predicted,
            "confidence": round(float(confidence), 2),
            "analysis_period_days": days_lookback,
            "total_hazards_analyzed": len(hazards)
        }
    
    @staticmethod
    async def get_recurring_patterns(db: AsyncSession) -> dict:
        """
        Locates recurring hazard nodes (e.g., same recurring pothole or divider issue within 50m radius).
        Evaluates historical reports over the last 60 days.
        """
        # Retrieve historical reports
        cutoff = datetime.utcnow() - timedelta(days=60)
        result = await db.execute(
            select(Hazard).where(Hazard.created_at >= cutoff)
        )
        hazards = result.scalars().all()
        
        # Group by spatial proximity boundaries (50m, approx 0.0005 degree difference)
        recurring = []
        for hazard in hazards:
            nearby = [
                h for h in hazards 
                if h.id != hazard.id 
                and abs(h.latitude - hazard.latitude) < 0.0005
                and abs(h.longitude - hazard.longitude) < 0.0005
                and h.hazard_type == hazard.hazard_type
            ]
            
            # Grids having >= 2 matching neighbors form recurring reports
            if len(nearby) >= 2 and hazard.id not in [r['id'] for r in recurring]:
                recurring.append({
                    "id": hazard.id,
                    "type": hazard.hazard_type,
                    "latitude": hazard.latitude,
                    "longitude": hazard.longitude,
                    "recurrence_count": len(nearby) + 1,
                    "first_seen": min([h.created_at for h in nearby + [hazard]]),
                    "last_seen": max([h.created_at for h in nearby + [hazard]])
                })
        
        return {"recurring_hazards": recurring[:10]}
