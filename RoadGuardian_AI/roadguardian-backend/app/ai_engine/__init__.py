"""
Module 8 & 9: AI Engines Package Initialization
===============================================
Purpose: Export computer vision and speech recognition engine interfaces.
"""

import logging

logger = logging.getLogger(__name__)

try:
    from app.ai_engine.vision import detect_hazard_severity
except ImportError as e:
    logger.warning(f"Could not import vision AI engine: {e}")
    detect_hazard_severity = None

try:
    from app.ai_engine.voice import transcribe_voice_report
except ImportError as e:
    logger.warning(f"Could not import voice AI engine: {e}")
    transcribe_voice_report = None

__all__ = ["detect_hazard_severity", "transcribe_voice_report"]
