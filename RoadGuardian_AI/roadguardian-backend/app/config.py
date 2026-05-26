"""
Module 1: Configuration Management
===================================
Purpose: Centralized configuration loader using Pydantic Settings
Dependencies: pydantic, python-dotenv
Author: RoadGuardian AI Team
Last Updated: 2026-05-26

Usage:
    from app.config import settings
    print(settings.APP_NAME)

Setup Commands:
    pip install -r requirements.txt
    cp .env.example .env
    # Edit .env with your credentials
    python -c "from app.config import settings; print('Config loaded successfully!')"
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings Class
    
    Loads environment variables from .env file and provides type-safe
    configuration access throughout the application.
    """
    
    # ======================
    # Application Settings
    # ======================
    APP_NAME: str = "RoadGuardian AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # ======================
    # Server Configuration
    # ======================
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # ======================
    # Database Configuration
    # ======================
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""
    
    # ======================
    # AI Services
    # ======================
    YOLO_MODEL_PATH: str = "models/yolov8n.pt"
    WHISPER_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    
    # ======================
    # Storage Configuration
    # ======================
    SUPABASE_BUCKET_NAME: str = "hazard-uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    
    # ======================
    # Logging Configuration
    # ======================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # Pydantic Settings Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def max_upload_size_bytes(self) -> int:
        """Convert MB to bytes"""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    
    Returns:
        Settings: Singleton settings object
    """
    return Settings()


# Global settings instance
settings = get_settings()


if __name__ == "__main__":
    # Test configuration loading
    print(f"✓ Application: {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"✓ Debug Mode: {settings.DEBUG}")
    print(f"✓ Server: {settings.HOST}:{settings.PORT}")
    print(f"✓ Database URL configured: {bool(settings.DATABASE_URL)}")
    print(f"✓ Supabase URL configured: {bool(settings.SUPABASE_URL)}")
    print(f"✓ YOLO Model Path: {settings.YOLO_MODEL_PATH}")
    print("\n✅ Configuration loaded successfully!")