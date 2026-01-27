from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Path to project root (3 levels higher than this folder)
PROJECT_ROOT = Path(__file__).resolve().parents[3]

"""
Application Settings Module defines configuration settings for the 
ML service using Pydantic Settings. Settings are loaded from 
environment variables and/or a .env file.

The settings are cached using @lru_cache to avoid re-reading
environment variables on every access.
"""
class Settings(BaseSettings):
    """
    This class uses Pydantic Settings to automatically load configuration
    from environment variables and .env files. All settings have sensible
    defaults for local development.
    """

    # Model configuration
    embed_model_name: str = "BAAI/bge-base-en-v1.5"
    embed_model_cache_dir: str = "./embed_model_cache"
    skills_extraction_model_name: str = "feliponi/hirly-ner-multi"
    skills_extraction_model_cache_dir: str = "./model_cache"

    # Anthropic API KEY for CV generation
    anthropic_api_key: str = ""
    cv_model_name: str = "claude-3-haiku-20240307"

    #Server configuration
    host: str = "0.0.0.0"
    port: int = 8080

    class Config:
        """Pydantic configuration for settings loading"""

        # Load settings from config file if exists
        env_file = PROJECT_ROOT / ".env"

        # Ignore extra environment variables (don't raise errors)
        extra = "ignore"

#
@lru_cache
def get_settings() -> Settings:
    """
    This function returns a singleton Settings instance. The @lru_cache
    decorator ensures the settings are only loaded once and reused
    for all subsequent calls.
    """
    return Settings()