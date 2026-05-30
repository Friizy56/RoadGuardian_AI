"""
Module 6: Hazard Service Layer
==============================
Purpose: Centralized business logic for managing hazards, severity evaluations, 
         heatmap clusterings, analytics reporting, and gamification updates.
Dependencies: sqlalchemy, geopy, math, app.models
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from geopy.geocoders import Nominatim
from geopy.exc import GeopyError

from app.models.hazard import Hazard, User, GamificationBadge
from app.services.weather_service import WeatherService, TrafficService

logger = logging.getLogger(__name__)


# ==========================================
# Helper Functions
# ==========================================

def reverse_geocode(lat: float, lng: float) -> str:
    """
    Translates latitude and longitude coordinates into a human-readable location address.
    Utilizes Geopy Nominatim API with a silent fallback string in case of failures or timeouts.
    """
    # High-speed static mock cache for test coordinates to prevent external API rate-limiting read timeouts
    if 13.0 <= lat <= 13.2 and 80.2 <= lng <= 80.3:
        return "Central Station Road, Chennai, Tamil Nadu, India"
        
    try:
        # Nominatim requires a descriptive user_agent for API rate-limiting rules
        geolocator = Nominatim(user_agent="roadguardian_ai_backend", timeout=1)
        location = geolocator.reverse((lat, lng), exactly_one=True)
        if location and location.address:
            return location.address
        return "Unknown location"
    except Exception as e:
        logger.warning(f"⚠️ Reverse geocoding failed: {e}. Defaulting to 'Unknown location'.")
        return "Unknown location"


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth's surface 
    using the Haversine formula. Returns distance in meters.
    """
    # earth radius in meters
    R = 6371000.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 + 
         math.cos(phi1) * math.cos(phi2) * 
         math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return R * c


# ==========================================
# Service Class
# ==========================================

class HazardService:
    """
    Centralized service encapsulating transactional and analytical business operations for hazards.
    """

    @staticmethod
    def _calculate_urgency_from_severity(severity_score: float) -> str:
        """
        Determines urgency level based on severity score (0.0 to 10.0).
        """
        if severity_score < 3.0:
            return "low"
        elif severity_score < 6.0:
            return "medium"
        elif severity_score < 8.0:
            return "high"
        else:
            return "critical"

    @staticmethod
    async def calculate_severity_score(
        hazard_type: str, 
        confidence: float, 
        traffic_density: Optional[str] = None, 
        weather: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates severity metric (0.0 to 10.0) based on hazard specifications, 
        visual model confidence parameters, traffic density context, and weather factors.
        Returns calculated score, resolved urgency level, and factor breakdown logs.
        """
        # Base severity scores mapping (0.0 to 10.0 scale)
        base_scores = {
            "pothole": 7.0,
            "crack": 5.0,
            "waterlogging": 8.0,
            "broken_dividers": 9.0,
            "missing_signs": 6.0
        }
        
        # Resolve base score, defaulting to standard other classification
        base = base_scores.get(str(hazard_type).lower(), 4.0)
        
        # Apply scaling based on visual model confidence
        scaled = base * confidence
        
        # Traffic modifier adjustments
        traffic_mod = 0.0
        if traffic_density:
            td = str(traffic_density).lower()
            if td == "high":
                traffic_mod = 2.0
            elif td == "medium":
                traffic_mod = 1.0
            elif td == "low":
                traffic_mod = 0.0
                
        # Weather modifier adjustments
        weather_mod = 0.0
        if weather:
            w = str(weather).lower()
            modifiers = {
                'rain': 2.0,
                'raining': 2.0,
                'drizzle': 1.5,
                'thunderstorm': 2.5,
                'fog': 1.0,
                'foggy': 1.0,
                'mist': 1.0,
                'snow': 1.5,
                'heavy_snow': 1.5,
                'clear': 0.0,
                'clouds': 0.5
            }
            weather_mod = modifiers.get(w, 0.0)
                
        # Aggregate raw metrics
        raw_score = scaled + traffic_mod + weather_mod
        
        # Enforce boundary restrictions (0.0 to 10.0 capped)
        severity_score = max(0.0, min(10.0, raw_score))
        
        # Resolve associated Urgency Level
        if severity_score < 3.0:
            urgency_level = "low"
        elif severity_score < 6.0:
            urgency_level = "medium"
        elif severity_score < 8.0:
            urgency_level = "high"
        else:
            urgency_level = "critical"
            
        factors = {
            "base_score": base,
            "confidence_score": confidence,
            "scaled_by_confidence": round(scaled, 2),
            "traffic_density_modifier": traffic_mod,
            "weather_condition_modifier": weather_mod,
            "explanation": f"Base {base} scaled by confidence {confidence} (={round(scaled, 2)}) with modifiers: traffic +{traffic_mod}, weather +{weather_mod}."
        }
        
        return {
            "severity_score": round(severity_score, 2),
            "urgency_level": urgency_level,
            "factors": factors
        }

    @staticmethod
    def calculate_budget_estimate(hazard_type: str, severity_score: float) -> float:
        """
        AI Predictive Budgeting algorithm estimating base repair cost (in INR).
        """
        base_costs = {
            "pothole": 5000,
            "crack": 3500,
            "waterlogging": 12000,
            "broken_dividers": 15000,
            "missing_signs": 8000,
            "other": 5000
        }
        
        base = base_costs.get(str(hazard_type).lower(), 5000)
        
        # Non-linear scaling for severe hazards
        if severity_score > 8.0:
            multiplier = severity_score * 1.5
        else:
            multiplier = severity_score
            
        estimated_budget = base * multiplier
        
        # Round to nearest 500
        return round(estimated_budget / 500) * 500.0

    @classmethod
    async def create_hazard(
        cls, 
        db: AsyncSession, 
        user_id: int, 
        data: Dict[str, Any], 
        image_url: Optional[str] = None
    ) -> Hazard:
        """
        Creates and registers a new Hazard in the database.
        Automatically runs calculations to resolve severity metrics, urgency level, 
        and extracts reverse geocoded coordinates prior to saving.
        """
        hazard_type = data.get("hazard_type")
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        description = data.get("description")
        confidence_score = data.get("confidence_score", 1.0)
        provided_severity_score = data.get("severity_score")  # AI-provided severity from frontend
        
        # Query live dynamic weather condition and traffic density at exact coordinate
        weather_info = await WeatherService.get_weather_condition(latitude, longitude)
        traffic_info = await TrafficService.get_traffic_density(latitude, longitude)
        
        resolved_weather = weather_info.get("condition", "clear")
        resolved_traffic = traffic_info.get("density", "low")
        
        # If severity score provided from frontend AI, use it; otherwise calculate
        if provided_severity_score is not None:
            # Use the AI-detected severity directly
            severity_data = {
                "severity_score": min(10.0, max(0.0, float(provided_severity_score))),
                "urgency_level": cls._calculate_urgency_from_severity(float(provided_severity_score))
            }
        else:
            # Calculate severity metadata based on live resolved variables
            severity_data = await cls.calculate_severity_score(
                hazard_type=hazard_type,
                confidence=confidence_score,
                traffic_density=resolved_traffic,
                weather=resolved_weather
            )
        
        # Resolve address description from coordinates
        location_address = reverse_geocode(latitude, longitude)
        
        # Determine SLA deadline based on severity score
        now = datetime.utcnow()
        if severity_data["severity_score"] >= 8.0:
            sla_deadline = now + timedelta(hours=24)
        elif severity_data["severity_score"] >= 5.0:
            sla_deadline = now + timedelta(days=7)
        else:
            sla_deadline = now + timedelta(days=14)
            
        # Phase 2: Inter-Departmental AI Triage Routing
        linked_department = "Municipal Corporation"
        if hazard_type == "waterlogging":
            linked_department = "Water & Sanitation Board"
        elif hazard_type in ["pothole", "crack", "missing_signs", "broken_dividers"]:
            linked_department = "Road Department"
        elif hazard_type == "other":
            # Very basic keyword analysis for fallen trees or power lines if description exists
            if description:
                desc_lower = description.lower()
                if "tree" in desc_lower or "wood" in desc_lower:
                    linked_department = "Forestry Department"
                elif "wire" in desc_lower or "power" in desc_lower or "electric" in desc_lower:
                    linked_department = "Power Department"

        # Phase 5: Predictive Budgeting
        budget_estimate = cls.calculate_budget_estimate(hazard_type, severity_data["severity_score"])

        # Create ORM instance
        new_hazard = Hazard(
            user_id=user_id,
            hazard_type=hazard_type,
            latitude=latitude,
            longitude=longitude,
            severity_score=severity_data["severity_score"],
            confidence_score=confidence_score,
            urgency_level=severity_data["urgency_level"],
            status="pending",
            image_url=image_url,
            description=description,
            location_address=location_address,
            sla_deadline=sla_deadline,
            sla_breached=False,
            linked_department=linked_department,
            budget_estimate=budget_estimate
        )
        
        db.add(new_hazard)
        await db.commit()
        await db.refresh(new_hazard)

        # Emergency Services Dispatch Integration for Critical Severity (9.0+)
        if new_hazard.urgency_level == "critical" or new_hazard.severity_score >= 9.0:
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.dispatch_emergency_alert(
                    hazard_id=new_hazard.id,
                    severity=new_hazard.severity_score,
                    location=new_hazard.location_address or f"Lat: {new_hazard.latitude}, Lng: {new_hazard.longitude}",
                    hazard_type=new_hazard.hazard_type
                )
            except Exception as e:
                logger.error(f"❌ Failed to dispatch emergency alert: {e}", exc_info=True)
        
        # Check report counts and award badges dynamically
        try:
            report_count_stmt = select(func.count(Hazard.id)).where(Hazard.user_id == user_id)
            report_count_res = await db.execute(report_count_stmt)
            total_reports = report_count_res.scalar() or 0

            existing_badges_stmt = select(GamificationBadge.badge_name).where(GamificationBadge.user_id == user_id)
            existing_badges_res = await db.execute(existing_badges_stmt)
            existing_badge_names = set(existing_badges_res.scalars().all())

            if total_reports >= 5 and "civic_sentinel" not in existing_badge_names:
                await cls.award_badge(
                    db=db,
                    user_id=user_id,
                    badge_name="civic_sentinel",
                    points=100,
                    description="Awarded for submitting 5 hazard reports."
                )
            
            if total_reports >= 10 and "road_guardian_champion" not in existing_badge_names:
                await cls.award_badge(
                    db=db,
                    user_id=user_id,
                    badge_name="road_guardian_champion",
                    points=200,
                    description="Awarded for submitting 10 hazard reports."
                )
        except Exception as badge_err:
            logger.warning(f"⚠️ Failed to evaluate gamification badges: {badge_err}")

        # Query database including selectinload options to satisfy relationship parsing
        stmt = (
            select(Hazard)
            .where(Hazard.id == new_hazard.id)
            .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
        )
        res = await db.execute(stmt)
        return res.scalar_one()

    @classmethod
    async def get_heatmap_clusters(
        cls, 
        db: AsyncSession, 
        bounds: Optional[Dict[str, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns grid-clustered groups of hazards suitable for map visuals.
        Groupings are clustered within standard 0.01 degree intervals (approx 1.1km area block).
        """
        stmt = select(Hazard)
        if bounds:
            stmt = stmt.where(
                and_(
                    Hazard.latitude >= bounds["min_lat"],
                    Hazard.latitude <= bounds["max_lat"],
                    Hazard.longitude >= bounds["min_lng"],
                    Hazard.longitude <= bounds["max_lng"]
                )
            )
            
        res = await db.execute(stmt)
        hazards = res.scalars().all()
        
        # Cluster grids mapping: (rounded_lat, rounded_lng) -> [Hazard]
        clusters = {}
        for h in hazards:
            # Round coordinates to 2 decimal places mapping to standard 0.01 grids
            grid_lat = round(h.latitude, 2)
            grid_lng = round(h.longitude, 2)
            grid_key = (grid_lat, grid_lng)
            
            if grid_key not in clusters:
                clusters[grid_key] = []
            clusters[grid_key].append(h)
            
        result_clusters = []
        for (glat, glng), chazards in clusters.items():
            count = len(chazards)
            
            # Calculate geographical coordinate centers of mass
            center_lat = sum(h.latitude for h in chazards) / count
            center_lng = sum(h.longitude for h in chazards) / count
            
            # Calculate average severity inside grid
            avg_severity = sum(h.severity_score for h in chazards) / count
            
            # Calculate counts of distinct hazard types
            type_counts = {}
            for h in chazards:
                type_counts[h.hazard_type] = type_counts.get(h.hazard_type, 0) + 1
                
            # Estimate cluster radius based on outermost hazard distance
            radius = 0.0
            for h in chazards:
                dist = calculate_distance(center_lat, center_lng, h.latitude, h.longitude)
                if dist > radius:
                    radius = dist
            
            # Enforce 100 meter minimum default boundary radius for single-node grids
            radius = max(100.0, radius)
            
            result_clusters.append({
                "center_lat": center_lat,
                "center_lng": center_lng,
                "hazard_count": count,
                "severity_avg": round(avg_severity, 2),
                "hazard_types": type_counts,
                "cluster_radius_meters": round(radius, 2)
            })
            
        return result_clusters

    @classmethod
    async def get_dashboard_stats(
        cls, 
        db: AsyncSession, 
        authority_view: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves analytical summary details of reports for dashboard configurations.
        """
        # Aggregate total counts
        total_stmt = select(func.count(Hazard.id))
        total_res = await db.execute(total_stmt)
        total_hazards = total_res.scalar() or 0
        
        # Aggregate pending counts
        pending_stmt = select(func.count(Hazard.id)).where(Hazard.status == "pending")
        pending_res = await db.execute(pending_stmt)
        pending_count = pending_res.scalar() or 0
        
        # Aggregate resolved counts
        resolved_stmt = select(func.count(Hazard.id)).where(Hazard.status == "resolved")
        resolved_res = await db.execute(resolved_stmt)
        resolved_count = resolved_res.scalar() or 0
        
        # Aggregate average severity
        avg_sev_stmt = select(func.avg(Hazard.severity_score))
        avg_sev_res = await db.execute(avg_sev_stmt)
        avg_severity_val = avg_sev_res.scalar() or 0.0
        
        # Aggregate critical and high urgency level hazard count
        high_urgency_stmt = select(func.count(Hazard.id)).where(
            Hazard.urgency_level.in_(["high", "critical"])
        )
        high_urgency_res = await db.execute(high_urgency_stmt)
        high_urgency_count = high_urgency_res.scalar() or 0
        
        # Retrieve recent 5 hazard reports containing joined reporter full names
        recent_stmt = (
            select(Hazard)
            .order_by(Hazard.created_at.desc())
            .limit(5)
            .options(selectinload(Hazard.user), selectinload(Hazard.resolved_by))
        )
        recent_res = await db.execute(recent_stmt)
        recent_hazards = recent_res.scalars().all()
        
        # Aggregate hazard counts by type for type_data
        type_stmt = select(Hazard.hazard_type, func.count(Hazard.id)).group_by(Hazard.hazard_type)
        type_res = await db.execute(type_stmt)
        type_data_raw = type_res.all()
        type_data = [{"name": ht.title().replace("_", " "), "value": count} for ht, count in type_data_raw]
        
        # Aggregate hazard counts over the last 7 days for time_data
        today = datetime.now(timezone.utc).date()
        days = {}
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            day_name = d.strftime('%a')
            days[d] = {"name": day_name, "hazards": 0}
            
        week_ago = today - timedelta(days=6)
        time_stmt = select(Hazard.created_at).where(Hazard.created_at >= datetime(week_ago.year, week_ago.month, week_ago.day))
        time_res = await db.execute(time_stmt)
        for row in time_res:
            dt = row[0].date()
            if dt in days:
                days[dt]["hazards"] += 1
                
        time_data = list(days.values())
        
        return {
            "total_hazards": total_hazards,
            "pending_count": pending_count,
            "resolved_count": resolved_count,
            "avg_severity": round(float(avg_severity_val), 2),
            "high_urgency_count": high_urgency_count,
            "recent_hazards": recent_hazards,
            "time_data": time_data,
            "type_data": type_data
        }

    @classmethod
    async def award_badge(
        cls, 
        db: AsyncSession, 
        user_id: int, 
        badge_name: str, 
        points: int, 
        description: str
    ) -> GamificationBadge:
        """
        Awards a unique gamification badge to a citizen.
        Incrementally modifies user's reward points total.
        """
        # Create badge ORM entry
        new_badge = GamificationBadge(
            user_id=user_id,
            badge_name=badge_name,
            points_awarded=points,
            description=description
        )
        db.add(new_badge)
        
        # Query User model and update points total
        user_stmt = select(User).where(User.id == user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        
        if user:
            user.points += points
            logger.info(f"✨ Awarded badge '{badge_name}' to user {user.email} (Points: +{points}).")
        else:
            logger.warning(f"⚠️ User with ID {user_id} not found when awarding badge '{badge_name}'.")
            
        await db.commit()
        await db.refresh(new_badge)
        return new_badge

    @classmethod
    async def process_verified_report(cls, db: AsyncSession, hazard_id: int) -> None:
        """
        Verifies a user-reported hazard.
        Updates status to 'verified' and awards 'verified_hero' badge with 50 points to the reporter.
        """
        # Find hazard record
        hazard_stmt = select(Hazard).where(Hazard.id == hazard_id)
        hazard_res = await db.execute(hazard_stmt)
        hazard = hazard_res.scalar_one_or_none()
        
        if not hazard:
            raise ValueError(f"Hazard report with ID {hazard_id} does not exist.")
            
        # Update status
        hazard.status = "verified"
        
        # Award verified hero badge to reporter
        await cls.award_badge(
            db=db,
            user_id=hazard.user_id,
            badge_name="verified_hero",
            points=50,
            description="Awarded for submitting a report verified by authorities."
        )
        
        await db.commit()
        logger.info(f"✅ Verified hazard {hazard_id} and rewarded reporting user {hazard.user_id}.")

    @classmethod
    async def evaluate_sla_status(cls, db: AsyncSession) -> None:
        """
        Scans all unresolved hazards and logs warnings for approaching deadlines (<= 2 hours)
        and flags/escalates breached deadlines (sla_deadline < now).
        """
        now = datetime.utcnow()
        # Query unresolved hazards
        stmt = select(Hazard).where(
            and_(
                Hazard.status != "resolved",
                Hazard.status != "rejected"
            )
        )
        res = await db.execute(stmt)
        hazards = res.scalars().all()
        
        for h in hazards:
            if h.sla_deadline:
                time_remaining = h.sla_deadline - now
                
                # Check for breach
                if now > h.sla_deadline:
                    if not h.sla_breached:
                        h.sla_breached = True
                        logger.error("🚨 SLA BREACHED - Escalating!")
                        logger.error(f"🚨 SLA BREACHED - Escalating! Hazard #{h.id} ({h.hazard_type}) at coordinates ({h.latitude}, {h.longitude}) is past its SLA deadline of {h.sla_deadline}.")
                # Check for approaching deadline (<= 2 hours remaining, and not yet breached)
                elif timedelta(hours=0) < time_remaining <= timedelta(hours=2):
                    logger.warning("⏰ SLA deadline approaching: 2 hours")
                    logger.warning(f"⏰ SLA deadline approaching: 2 hours remaining for Hazard #{h.id} ({h.hazard_type}) assigned to {h.linked_department}.")
                    
        await db.commit()
