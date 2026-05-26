"""
Module 7: Weather & Traffic API Services
========================================
Purpose: Provides real-time external integrations (e.g., OpenWeatherMap) and 
         dynamic simulated contexts (e.g., hourly traffic mapping) to support
         enriched hazard scoring calculations.
Dependencies: aiohttp, app.config
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

import aiohttp
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class WeatherService:
    """
    Service responsible for querying live climatic attributes from external API providers.
    """

    @staticmethod
    async def get_weather_condition(lat: float, lng: float) -> dict:
        """
        Retrieves real-time weather information from OpenWeatherMap (free tier).
        Gracefully resolves default standard fallbacks in case of credentials omission or connection timeouts.
        """
        api_key = settings.OPENWEATHER_API_KEY
        if not api_key:
            logger.info("ℹ️ OPENWEATHER_API_KEY not configured. Defaulting to clear weather condition.")
            return {"condition": "clear", "severity_modifier": 0.0, "temperature": 25.0, "humidity": 50.0}
        
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={api_key}"
        
        # Enforce 3 seconds HTTP timeout limit to protect core execution threads
        timeout = aiohttp.ClientTimeout(total=3.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.warning(f"⚠️ OpenWeatherMap API returned status {response.status}. Falling back.")
                        return {"condition": "unknown", "severity_modifier": 0.0}
                    
                    data = await response.json()
                    weather_main = data['weather'][0]['main'].lower()
                    
                    modifiers = {
                        'rain': 2.0,
                        'drizzle': 1.5,
                        'thunderstorm': 2.5,
                        'fog': 1.0,
                        'snow': 1.5,
                        'clear': 0.0,
                        'clouds': 0.5
                    }
                    
                    return {
                        "condition": weather_main,
                        "severity_modifier": modifiers.get(weather_main, 0.0),
                        "temperature": data['main']['temp'] - 273.15,  # Kelvin to Celsius
                        "humidity": data['main']['humidity']
                    }
            except Exception as e:
                logger.error(f"❌ Failed to fetch current weather details: {e}. Falling back.")
                return {"condition": "unknown", "severity_modifier": 0.0}


class TrafficService:
    """
    Service responsible for querying spatial traffic congestion metrics.
    For hackathon and demonstration scenarios, provides premium dynamic time-of-day simulation fallback.
    """

    @staticmethod
    async def get_traffic_density(lat: float, lng: float) -> dict:
        """
        Calculates localized traffic density level based on historical peak patterns and hours of day.
        """
        from datetime import datetime
        hour = datetime.now().hour
        
        # 8 AM to 10 AM, and 5 PM to 7 PM (17 to 19) map to heavy commuter traffic congestion patterns
        if 8 <= hour <= 10 or 17 <= hour <= 19:
            density = "high"
            modifier = 2.0
        # 11 AM to 4 PM (16) maps to moderate midday traffic patterns
        elif 11 <= hour <= 16:
            density = "medium"
            modifier = 1.0
        # Off-peak night and early morning hours
        else:
            density = "low"
            modifier = 0.0
        
        return {
            "density": density,
            "severity_modifier": modifier,
            "source": "mock"
        }
