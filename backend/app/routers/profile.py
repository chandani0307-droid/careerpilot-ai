from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.schemas import ProfileOut, ProfilePatch, TailorIn
from ..models.tables import Job, Profile
from ..services import writer
from ..services.resume_parser import extract_text
from ..services.store import upsert_jobs

router = APIRouter(tags=["resume & profile"])
MAX_BYTES = 5 * 1024 * 1024


def _out(row: Profile) -> dict:
    return {
        "filename": row.filename,
        "updated_at": row.updated_at,
        "data": row.data,
        "resume_chars": len(row.resume_text or ""),
    }


def _get_user_profile(db: Session, session_id: str) -> Profile | None:
    """Session ID ke basis par database se user ka profile record fetch karta hai."""
    return db.query(Profile).filter(Profile.session_id == session_id).first()


@router.post("/resume/upload", response_model=ProfileOut)
def upload_resume(
    file: UploadFile = File(...),
    x_session_id: str = Header(default="default_session"),
    db: Session = Depends(get_db),
):
    raw = file.file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "File is larger than 5 MB.")
    try:
        text = extract_text(file.filename or "", raw)
    except ValueError as exc:
        raise HTTPException(415, str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(422, f"Could not read this file: {exc}")
    if len(text) < 80:
        raise HTTPException(
            422,
            "No readable text found. If this is a scanned PDF, export a text-based PDF or upload a DOCX.",
        )
    
    data = writer.analyze_resume(text, file.filename or "")

    # Hardcoded id=1 ki jagah unique session_id query kar rahe hain
    row = _get_user_profile(db, x_session_id)
    if not row:
        row = Profile(session_id=x_session_id)

    row.filename, row.resume_text, row.data = file.filename or "resume", text, data
    db.add(row)
    db.commit()
    db.refresh(row)

    # re-score any jobs we already have against the new profile
    jobs = db.query(Job).all()
    if jobs:
        upsert_jobs(
            db,
            [
                {
                    "id": j.id,
                    "title": j.title,
                    "tags": j.tags,
                    "description": j.description,
                    "region": j.region,
                    "location": j.location,
                }
                for j in jobs
            ],
            data,
        )
    return _out(row)


@router.get("/profile", response_model=ProfileOut | None)
def get_profile(
    x_session_id: str = Header(default="default_session"),
    db: Session = Depends(get_db),
):
    row = _get_user_profile(db, x_session_id)
    return _out(row) if row else None


@router.patch("/profile", response_model=ProfileOut)
def patch_profile(
    body: ProfilePatch,
    x_session_id: str = Header(default="default_session"),
    db: Session = Depends(get_db),
):
    row = _get_user_profile(db, x_session_id)
    if not row:
        raise HTTPException(404, "Upload a resume first.")
    row.data = {**row.data, **body.model_dump(exclude_none=True)}
    db.commit()
    return _out(row)


@router.post("/resume/tailor")
def tailor(
    body: TailorIn,
    x_session_id: str = Header(default="default_session"),
    db: Session = Depends(get_db),
):
    row, job = _get_user_profile(db, x_session_id), db.get(Job, body.job_id)
    if not row:
        raise HTTPException(404, "Upload a resume first.")
    if not job:
        raise HTTPException(404, "Job not found.")
    return writer.tailor_for_job(
        row.data, {c.name: getattr(job, c.name) for c in Job.__table__.columns}
    )