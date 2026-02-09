"""
Configuration Management using Pydantic Settings

This module handles all application configuration using environment variables
with type validation and default values.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Environment variables are loaded from .env file in development.
    In production, they should be set in the deployment environment.
    """
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://smarthome:password@localhost:5432/smarthome"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # TLS/HTTPS Configuration (if enabled)
    TLS_ENABLED: bool = False
    TLS_CA_CERT: str = "../certs/ca.crt"
    TLS_SERVER_CERT: str = "../certs/server.crt"
    TLS_SERVER_KEY: str = "../certs/server.key"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Application Settings
    PROJECT_NAME: str = "Smart Home"
    VERSION: str = "0.1.0"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create global settings instance
settings = Settings()
