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

# Allowed origins me Render Frontend domain add kiya hai
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://careerpilot-ai-1-cvit.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"  # Production testing ke liye sab allow kar sakte hain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (profile.router, jobs.router, tracker.router, agent.router, analytics.router):
    app.include_router(r, prefix="/api")