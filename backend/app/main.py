from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.db import Base, engine
from .models import tables  # noqa: F401  (register tables)
from .routers import agent, analytics, jobs, profile, tracker


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)  # swap for Alembic migrations when you move to PostgreSQL in production
    yield


app = FastAPI(title=f"{settings.app_name} API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
for r in (profile.router, jobs.router, tracker.router, agent.router, analytics.router):
    app.include_router(r, prefix="/api")
