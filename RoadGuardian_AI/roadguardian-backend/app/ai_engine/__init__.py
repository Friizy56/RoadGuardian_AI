"""
Module 8 & 9: AI Engines Package Initialization
===============================================
Purpose: Export computer vision and speech recognition engine interfaces.
"""

from app.ai_engine.vision import detect_hazard_severity
from app.ai_engine.voice import transcribe_voice_report

__all__ = ["detect_hazard_severity", "transcribe_voice_report"]
