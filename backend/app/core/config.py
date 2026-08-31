from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")
    app_name: str = "Sales Analytics API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://sales_app:change-me-locally@localhost:5432/sales_analytics"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = "replace-this-for-local-development-only"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
