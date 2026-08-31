from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_session_factory() -> sessionmaker:
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    database = get_session_factory()()
    try:
        yield database
    finally:
        database.close()
