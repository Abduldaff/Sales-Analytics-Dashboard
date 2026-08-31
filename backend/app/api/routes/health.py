from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import create_engine

from app.core.config import get_settings

router = APIRouter()


def _database_status() -> dict[str, Any]:
    settings = get_settings()
    try:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url}
    except (SQLAlchemyError, Exception) as error:
        return {"status": "unavailable", "error": str(error)[:200]}


def _redis_status() -> dict[str, Any]:
    settings = get_settings()
    try:
        client = Redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        return {"status": "ok", "url": settings.redis_url}
    except (RedisError, Exception) as error:
        return {"status": "unavailable", "error": str(error)[:200]}


@router.get("/health", summary="Check service health")
def health_check() -> dict[str, Any]:
    health = {
        "status": "ok",
        "service": "sales-analytics-api",
        "database": _database_status(),
        "redis": _redis_status(),
    }
    return health
