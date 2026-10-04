from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.db import Base, engine
from .models import tables  # noqa: F401  (register tables)
from .routers import agent, analytics, jobs, profile, tracker


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title=f"{settings.app_name} API", version="1.0.0", lifespan=lifespan)

# Allow ALL origins temporarily to completely fix CORS connection issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production & local testing ke liye Sab domains allow kar rahe hain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (profile.router, jobs.router, tracker.router, agent.router, analytics.router):
    app.include_router(r, prefix="/api")