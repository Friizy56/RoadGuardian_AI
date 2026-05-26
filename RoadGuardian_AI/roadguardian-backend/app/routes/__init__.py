"""
Module 7: Routes Package Initialization
=======================================
Purpose: Export hazard routes for centralized importing in main.py.
"""

from app.routes.hazards import router as hazards_router

__all__ = ["hazards_router"]
