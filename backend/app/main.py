from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging


def _split_origins(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()] if value else ["http://localhost:5173"]


configure_logging()
settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", openapi_url=f"{settings.api_v1_prefix}/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=_split_origins(settings.cors_origins), allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])
app.include_router(api_router, prefix=settings.api_v1_prefix)
