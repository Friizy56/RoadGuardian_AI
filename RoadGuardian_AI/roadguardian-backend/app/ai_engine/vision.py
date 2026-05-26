"""
Module 8: YOLOv8 Computer Vision Engine
======================================
Purpose: Lazy-loaded YOLOv8 model singleton wrapper for detecting road infrastructure hazards.
Dependencies: ultralytics, app.config
Author: RoadGuardian AI Team
Last Updated: 2026-05-27
"""

import os
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Private global model container (Singleton pattern)
_model = None


def get_model():
    """
    Lazy-loads and returns the YOLOv8 model instance.
    Guarantees a single instantiation across the life of the application.
    """
    global _model
    if _model is None:
        logger.info("Initializing YOLOv8 model instance...")
        try:
            from ultralytics import YOLO
            
            # Ensure model file directory exists locally
            model_dir = os.path.dirname(settings.YOLO_MODEL_PATH)
            if model_dir:
                os.makedirs(model_dir, exist_ok=True)
                
            # Instantiate model (Ultralytics auto-downloads to the path if missing)
            _model = YOLO(settings.YOLO_MODEL_PATH)
            logger.info("✅ YOLOv8 model successfully loaded.")
        except Exception as e:
            logger.error(f"❌ Failed to load YOLOv8 model from '{settings.YOLO_MODEL_PATH}': {e}")
            raise
    return _model


async def detect_hazard_severity(image_path: str) -> float:
    """
    Analyzes a road image using YOLOv8 object detection.
    Aggregates bounding boxes and extracts the highest confidence score of detected hazards.
    
    Returns:
        float: Highest confidence score (0.0 to 1.0) of any detected hazard.
               Defaults to 0.50 if no specific hazards are parsed,
               or 0.85 as a graceful fallback if dependencies/model loads fail.
    """
    if not os.path.exists(image_path):
        logger.error(f"❌ Image file not found at path: {image_path}")
        return 0.0

    try:
        # Resolve lazy singleton model
        model = get_model()
        
        # Run inference synchronously (YOLO executes locally)
        # Disable verbosity logs to keep clean console stdout
        results = model(image_path, verbose=False)
        
        if not results:
            logger.info("ℹ️ YOLO inference returned no results.")
            return 0.50

        max_confidence = 0.0
        for result in results:
            if hasattr(result, "boxes") and result.boxes is not None and len(result.boxes) > 0:
                # Extract confidences array from cpu tensor
                confidences = result.boxes.conf.cpu().numpy()
                if len(confidences) > 0:
                    current_max = float(max(confidences))
                    if current_max > max_confidence:
                        max_confidence = current_max

        if max_confidence > 0.0:
            logger.info(f"🎯 YOLO inference completed. Max hazard confidence detected: {round(max_confidence, 2)}")
            return max_confidence
            
        logger.info("ℹ️ YOLO model executed but no hazards were identified.")
        return 0.50

    except Exception as e:
        # Fallback to standard baseline confidence to ensure reporting pipelines remain operational
        logger.warning(
            f"⚠️ YOLOv8 inference failed: {e}. "
            "Falling back to baseline confidence score (0.85) to ensure service continuity."
        )
        return 0.85
