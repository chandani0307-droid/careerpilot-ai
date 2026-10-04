from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..agents.graph import run_agent
from ..core.config import settings
from ..core.db import get_db
from ..models.schemas import AgentRunIn, AgentRunOut, ChatIn, InterviewIn
from ..models.tables import AgentRun, Job
from ..services import writer
from ..services.llm import llm
from ..services.store import profile_data, quick_stats

router = APIRouter(tags=["agent, assistant & interview"])


@router.post("/agent/run", response_model=AgentRunOut)
def agent_run(body: AgentRunIn, db: Session = Depends(get_db)):
    return run_agent(db, body.model_dump())


@router.get("/agent/runs", response_model=list[AgentRunOut])
def agent_runs(db: Session = Depends(get_db)):
    return list(db.scalars(select(AgentRun).order_by(AgentRun.id.desc()).limit(20)))


@router.post("/assistant/chat")
def chat(body: ChatIn, db: Session = Depends(get_db)):
    history = [m.model_dump() for m in body.messages][-12:]
    if not history or history[-1]["role"] != "user":
        raise HTTPException(400, "Last message must be from the user.")
    profile = profile_data(db)
    reply = writer.assistant_reply(profile, history, quick_stats(db))
    chips = ["Summarize my resume", "How do I improve my ATS score?", "Find jobs for me"] if profile else ["How does this work?"]
    return {"reply": reply, "suggestions": chips, "mode": llm.provider}


@router.post("/interview/prep")
def interview(body: InterviewIn, db: Session = Depends(get_db)):
    profile = profile_data(db) or {}
    job = db.get(Job, body.job_id) if body.job_id else None
    role = job.title if job else (body.role or (profile.get("target_roles") or ["Software Engineer"])[0])
    company = job.company if job else (body.company or "the company")
    skills = (job.tags or []) + (job.missing_skills or []) if job else (profile.get("skills") or [])[:5]
    prep = writer.interview_prep(profile, role, company, list(dict.fromkeys(skills)), job.description if job else "")
    return {"role": role, "company": company, **prep}


@router.get("/health")
def health():
    return {
        "status": "ok", "app": settings.app_name, "llm_provider": llm.provider, "llm_error": llm.last_error,
        "job_providers": settings.job_providers, "adzuna": bool(settings.adzuna_app_id and settings.adzuna_app_key),
        "smtp": settings.smtp_configured, "mock_jobs_fallback": settings.mock_fallback,
        "database": settings.database_url.split(":")[0],
    }
