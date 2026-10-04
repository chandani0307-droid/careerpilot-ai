"""Applications tracker + outreach actions with the human-approval gate."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.schemas import ActionDraftIn, ActionOut, ActionPatch, ApplicationIn, ApplicationOut, ApplicationPatch, ApproveIn
from ..models.tables import Action, Application, Job
from ..services import writer
from ..services.mailer import send_or_link
from ..services.store import ensure_action, ensure_application, profile_data, utcnow

router = APIRouter(tags=["applications & approvals"])


# ---------- applications ----------
@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(db: Session = Depends(get_db)):
    return list(db.scalars(select(Application).order_by(Application.updated_at.desc())))


@router.post("/applications", response_model=ApplicationOut)
def create_application(body: ApplicationIn, db: Session = Depends(get_db)):
    job = db.get(Job, body.job_id) if body.job_id else None
    if job:
        return ensure_application(db, job, body.status, notes=body.notes or None)
    app = Application(**body.model_dump())
    db.add(app)
    db.commit()
    return app


@router.patch("/applications/{app_id}", response_model=ApplicationOut)
def patch_application(app_id: int, body: ApplicationPatch, db: Session = Depends(get_db)):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(404, "Application not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(app, k, v)
    if body.status == "applied" and not app.applied_at:
        app.applied_at = utcnow()
    db.commit()
    return app


@router.delete("/applications/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    app = db.get(Application, app_id)
    if app:
        db.delete(app)
        db.commit()
    return {"ok": True}


# ---------- actions (email / linkedin / apply) ----------
@router.get("/actions", response_model=list[ActionOut])
def list_actions(status: str = "", type: str = "", db: Session = Depends(get_db)):
    stmt = select(Action).order_by(Action.updated_at.desc()).limit(300)
    if status:
        stmt = stmt.where(Action.status == status)
    if type:
        stmt = stmt.where(Action.type == type)
    return list(db.scalars(stmt))


@router.post("/actions/draft", response_model=ActionOut)
def draft_action(body: ActionDraftIn, db: Session = Depends(get_db)):
    job, profile = db.get(Job, body.job_id), profile_data(db)
    if not job:
        raise HTTPException(404, "Job not found")
    if not profile:
        raise HTTPException(400, "Upload a resume first.")
    jd = {c.name: getattr(job, c.name) for c in Job.__table__.columns}
    if body.type == "email":
        mail = writer.draft_email(profile, jd)
        return ensure_action(db, "email", job, status="draft", recipient=job.hr_email, subject=mail["subject"], body=mail["body"])
    if body.type == "linkedin":
        return ensure_action(db, "linkedin", job, status="draft", target_url=job.linkedin_url, body=writer.draft_linkedin(profile, jd))
    doc = writer.tailor_for_job(profile, jd)
    ensure_application(db, job, "drafted", cover_letter=doc["cover_letter"], tailored_summary=doc["summary"])
    return ensure_action(db, "apply", job, status="draft", subject=f"Apply: {job.title}", body=doc["cover_letter"])


def _editable(db: Session, action_id: int) -> Action:
    act = db.get(Action, action_id)
    if not act:
        raise HTTPException(404, "Action not found")
    if act.status in {"executed", "rejected"}:
        raise HTTPException(409, f"This action is already {act.status}.")
    return act


@router.patch("/actions/{action_id}", response_model=ActionOut)
def patch_action(action_id: int, body: ActionPatch, db: Session = Depends(get_db)):
    act = _editable(db, action_id)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(act, k, v)
    db.commit()
    return act


@router.post("/actions/{action_id}/submit", response_model=ActionOut)
def submit_for_approval(action_id: int, db: Session = Depends(get_db)):
    act = _editable(db, action_id)
    act.status = "pending"
    db.commit()
    return act


@router.post("/actions/{action_id}/reject", response_model=ActionOut)
def reject(action_id: int, db: Session = Depends(get_db)):
    act = _editable(db, action_id)
    act.status = "rejected"
    db.commit()
    return act


@router.post("/actions/{action_id}/approve", response_model=ActionOut)
def approve(action_id: int, body: ApproveIn, db: Session = Depends(get_db)):
    """The ONLY code path that touches the outside world. Requires an explicit confirm=true from the UI."""
    act = _editable(db, action_id)
    if not body.confirm:
        raise HTTPException(400, "Explicit confirmation required.")
    if body.recipient is not None:
        act.recipient = body.recipient.strip()
    if act.type == "email":
        if not act.recipient:
            raise HTTPException(400, "Add the HR recipient email before approving.")
        try:
            act.result = send_or_link(act.recipient, act.subject, act.body)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(502, f"Could not send email: {exc}")
    elif act.type == "linkedin":
        act.result = {"mode": "manual", "url": act.target_url, "message": "LinkedIn blocks automation, so open the link and paste the note. Your approval is recorded.", "note": act.body}
    else:  # apply
        act.result = {"mode": "manual", "url": act.target_url, "message": "Open the apply page and submit with your tailored cover letter."}
        app = db.scalar(select(Application).where(Application.job_id == act.job_id))
        if app:
            app.status, app.applied_at = "applied", utcnow()
    act.status = "executed"
    db.commit()
    return act
