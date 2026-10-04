from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

_url = settings.database_url
# PostgreSQL-ready: set DATABASE_URL=postgresql+psycopg://user:pass@host/db (and `pip install "psycopg[binary]"`)
engine = create_engine(_url, connect_args={"check_same_thread": False} if _url.startswith("sqlite") else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
