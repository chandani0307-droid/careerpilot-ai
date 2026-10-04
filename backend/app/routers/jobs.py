from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.db import get_db
from ..models.schemas import JobOut, JobSearchIn, JobSearchOut
from ..models.tables import Job
from ..services.contacts import find_hr_emails
from ..services.jobs.aggregator import search_jobs
from ..services.store import ensure_application, profile_data, upsert_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/search", response_model=JobSearchOut)
def search(body: JobSearchIn, db: Session = Depends(get_db)):
    profile = profile_data(db)
    queries = [body.query] if body.query else []
    if not queries and profile:
        queries = [r.replace(" / ", " ") for r in (profile.get("target_roles") or [])[:2]] + [" ".join((profile.get("skills") or [])[:2])]
    jobs, report = search_jobs(queries or ["software developer"], body.region, body.location, body.limit)
    rows = upsert_jobs(db, jobs, profile)
    rows.sort(key=lambda r: r.match_score, reverse=True)
    return {"jobs": rows[: body.limit], "report": report, "used_profile": profile is not None}


@router.get("", response_model=list[JobOut])
def list_jobs(region: str = "all", q: str = "", min_score: int = Query(0, ge=0, le=100), saved: bool = False, db: Session = Depends(get_db)):
    stmt = select(Job).where(Job.match_score >= min_score).order_by(Job.match_score.desc(), Job.created_at.desc()).limit(300)
    if region != "all":
        stmt = stmt.where(Job.region == region)
    if saved:
        stmt = stmt.where(Job.saved.is_(True))
    rows = list(db.scalars(stmt))
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in f"{r.title} {r.company} {' '.join(r.tags or [])}".lower()]
    return rows


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.post("/{job_id}/save", response_model=JobOut)
def toggle_save(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    job.saved = not job.saved
    db.commit()
    if job.saved:
        ensure_application(db, job, "saved")
    return job


@router.get("/{job_id}/contacts")
def contacts(job_id: str, domain: str = ""):
    """Optional: looks up HR emails with Hunter.io when HUNTER_API_KEY is set."""
    return {"configured": bool(settings.hunter_api_key), "results": find_hr_emails(domain)}
