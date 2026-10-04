from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.tables import Action, AgentRun, Application, Job
from ..services.skills import extract_skills
from ..services.store import profile_data

router = APIRouter(tags=["analytics"])
FUNNEL = ["saved", "drafted", "applied", "interview", "offer"]


@router.get("/analytics/summary")
def summary(db: Session = Depends(get_db)):
    profile = profile_data(db) or {}
    mine = set(profile.get("skills") or [])
    jobs = list(db.scalars(select(Job)))
    apps = list(db.scalars(select(Application)))
    actions = list(db.scalars(select(Action)))

    demand: Counter = Counter()
    for j in jobs:
        for s in set(extract_skills(f"{j.title} {' '.join(j.tags or [])} {j.description[:1500]}")):
            demand[s] += 1
    gaps: Counter = Counter()
    for j in jobs:
        gaps.update(j.missing_skills or [])

    scores = [j.match_score for j in jobs]
    buckets = {"0-39": 0, "40-59": 0, "60-74": 0, "75-100": 0}
    for s in scores:
        buckets["75-100" if s >= 75 else "60-74" if s >= 60 else "40-59" if s >= 40 else "0-39"] += 1
    status_counts = Counter(a.status for a in apps)
    applied_or_beyond = sum(status_counts[s] for s in ("applied", "interview", "offer"))
    return {
        "kpis": {
            "jobs": len(jobs), "avg_match": round(sum(scores) / len(scores)) if scores else 0, "high_matches": sum(1 for s in scores if s >= 75),
            "applications": len(apps), "pending_approvals": sum(1 for a in actions if a.status == "pending"),
            "emails_sent": sum(1 for a in actions if a.type == "email" and a.status == "executed"), "ats_score": profile.get("ats_score", 0),
            "agent_runs": db.query(AgentRun).count(),
            "response_rate": round(100 * (status_counts["interview"] + status_counts["offer"]) / applied_or_beyond) if applied_or_beyond else 0,
        },
        "by_region": dict(Counter(j.region for j in jobs)),
        "score_distribution": buckets,
        "funnel": [{"stage": s, "count": status_counts[s]} for s in FUNNEL],
        "skill_demand": [{"skill": s, "count": c, "have": s in mine} for s, c in demand.most_common(12)],
        "skill_gaps": [{"skill": s, "count": c} for s, c in gaps.most_common(8)],
        "actions_by_status": dict(Counter(a.status for a in actions)),
    }
