from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "MediGuard AI"
    APP_VERSION: str = "3.0.0"
    DEBUG: bool = False

    # CORS is hardcoded in main.py — do NOT set ALLOWED_ORIGINS in .env
    # Keeping this field only for compatibility but it is not used by main.py
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "mediguard-ai"

    DEFAULT_MODEL: str = "gpt-4o"
    DEFAULT_TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 2048
    MAX_RETRIES: int = 3

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "env_ignore_empty": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()