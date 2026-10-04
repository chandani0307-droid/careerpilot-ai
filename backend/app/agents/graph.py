"""LangGraph multi-agent workflow.

    planner ──► scout ──► matcher ──► writer ──► outreach ──► coach ──► gate ──► END
       │          │
       └─(no resume)─► END      └─(no jobs)─► END

Agents never perform external actions. `writer` and `outreach` only create *pending* Action rows;
a human must approve each one in the UI (see routers/tracker.py → approve).
"""
from __future__ import annotations

import operator
import time
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.tables import AgentRun, Job
from ..services import writer
from ..services.jobs.aggregator import search_jobs
from ..services.llm import llm
from ..services.store import ensure_action, ensure_application, profile_data, upsert_jobs


class AgentState(TypedDict, total=False):
    run_id: int
    params: dict
    profile: dict
    queries: list[str]
    job_ids: list[str]
    top_ids: list[str]
    report: dict
    interview: dict
    pending: int
    halt: bool
    trace: Annotated[list[dict], operator.add]


def _step(agent: str, message: str, started: float, **detail: Any) -> list[dict]:
    return [{"agent": agent, "status": "done", "message": message, "ms": int((time.time() - started) * 1000), "detail": detail}]


def build_graph(db: Session):
    def planner(state: AgentState) -> dict:
        t = time.time()
        profile = profile_data(db)
        if not profile:
            return {"halt": True, "trace": [{"agent": "Planner", "status": "blocked", "message": "No resume found. Upload your resume first.", "ms": 0, "detail": {}}]}
        p = state["params"]
        queries = [p["query"]] if p.get("query") else []
        if not queries:
            data = llm.json(writer.SYS, "Suggest 3 short job-board search queries (2-3 words each) for this candidate. JSON: {\"queries\": [..]}\n" + writer._profile_brief(profile))
            if data and isinstance(data.get("queries"), list):
                queries = [str(q) for q in data["queries"]][:3]
        if not queries:
            roles = profile.get("target_roles") or []
            queries = [r.replace(" / ", " ") for r in roles[:2]] + [" ".join((profile.get("skills") or [])[:2])]
            queries = [q for q in queries if q.strip()] or ["software developer"]
        return {"profile": profile, "queries": queries, "trace": _step("Planner", f"Planned {len(queries)} searches: {', '.join(queries)}", t, queries=queries)}

    def scout(state: AgentState) -> dict:
        t = time.time()
        p = state["params"]
        jobs, report = search_jobs(state["queries"], p.get("region", "all"), p.get("location", ""), 40)
        rows = upsert_jobs(db, jobs, state["profile"])
        live = report.get("live_total", 0)
        msg = f"Found {len(rows)} jobs ({live} live" + (f", {report.get('mock', 0)} sample" if report.get("mock") else "") + ")"
        return {"job_ids": [r.id for r in rows], "report": report, "trace": _step("Job Scout", msg, t, report=report)}

    def matcher(state: AgentState) -> dict:
        t = time.time()
        p = state["params"]
        rows = [db.get(Job, i) for i in state["job_ids"]]
        rows = sorted([r for r in rows if r], key=lambda r: r.match_score, reverse=True)
        eligible = [r for r in rows if r.match_score >= p.get("min_score", 35)] or rows
        top = eligible[: p.get("top_k", 3)]
        # optional AI commentary on the top picks
        if top and llm.available:
            data = llm.json(writer.SYS, "For each job give a one-sentence honest note on fit and the biggest gap. JSON: {\"notes\": {\"<job id>\": \"...\"}}\n\nCANDIDATE:\n" + writer._profile_brief(state["profile"])
                            + "\n\nJOBS:\n" + "\n".join(f"id={r.id} | {r.title} @ {r.company} | score={r.match_score} | missing={', '.join(r.missing_skills)}" for r in top))
            notes = (data or {}).get("notes") or {}
            for r in top:
                if isinstance(notes.get(r.id), str):
                    r.ai_note = notes[r.id]
            db.commit()
        best = top[0].match_score if top else 0
        return {"top_ids": [r.id for r in top], "trace": _step("Matcher", f"Scored {len(rows)} jobs; selected top {len(top)} (best {best}%)", t, selected=[f"{r.title} – {r.match_score}%" for r in top])}

    def writer_node(state: AgentState) -> dict:
        t = time.time()
        for jid in state["top_ids"]:
            job = db.get(Job, jid)
            jd = {c.name: getattr(job, c.name) for c in Job.__table__.columns}
            doc = writer.tailor_for_job(state["profile"], jd)
            ensure_application(db, job, "drafted", cover_letter=doc["cover_letter"], tailored_summary=doc["summary"])
            ensure_action(db, "apply", job, state["run_id"], "pending", subject=f"Apply: {job.title}", body=doc["cover_letter"])
        return {"trace": _step("Resume & Cover Letter Writer", f"Drafted tailored cover letters for {len(state['top_ids'])} jobs", t)}

    def outreach(state: AgentState) -> dict:
        t = time.time()
        for jid in state["top_ids"]:
            job = db.get(Job, jid)
            jd = {c.name: getattr(job, c.name) for c in Job.__table__.columns}
            mail = writer.draft_email(state["profile"], jd)
            ensure_action(db, "email", job, state["run_id"], "pending", recipient=job.hr_email, subject=mail["subject"], body=mail["body"])
            ensure_action(db, "linkedin", job, state["run_id"], "pending", target_url=job.linkedin_url, body=writer.draft_linkedin(state["profile"], jd))
        return {"trace": _step("Outreach Agent", f"Drafted HR emails and LinkedIn notes for {len(state['top_ids'])} jobs", t)}

    def coach(state: AgentState) -> dict:
        t = time.time()
        job = db.get(Job, state["top_ids"][0])
        prep = writer.interview_prep(state["profile"], job.title, job.company, job.tags or [], job.description)
        return {"interview": {"job_id": job.id, "role": job.title, "company": job.company, **prep}, "trace": _step("Interview Coach", f"Prepared {len(prep['questions'])} practice questions for {job.title}", t)}

    def gate(state: AgentState) -> dict:
        from ..services.store import quick_stats

        pending = quick_stats(db)["pending"]
        return {"pending": pending, "trace": [{"agent": "Approval Gate", "status": "waiting", "message": f"{pending} actions are waiting for your approval. Nothing has been sent.", "ms": 0, "detail": {}}]}

    g = StateGraph(AgentState)
    for name, fn in [("planner", planner), ("scout", scout), ("matcher", matcher), ("writer", writer_node), ("outreach", outreach), ("coach", coach), ("gate", gate)]:
        g.add_node(name, fn)
    g.set_entry_point("planner")
    g.add_conditional_edges("planner", lambda s: "stop" if s.get("halt") else "go", {"stop": END, "go": "scout"})
    g.add_conditional_edges("scout", lambda s: "go" if s.get("job_ids") else "stop", {"stop": END, "go": "matcher"})
    g.add_conditional_edges("matcher", lambda s: "go" if s.get("top_ids") else "stop", {"stop": END, "go": "writer"})
    g.add_edge("writer", "outreach")
    g.add_edge("outreach", "coach")
    g.add_edge("coach", "gate")
    g.add_edge("gate", END)
    return g.compile()


def run_agent(db: Session, params: dict) -> AgentRun:
    run = AgentRun(goal=params.get("goal", ""), params=params, status="running", trace=[], summary={})
    db.add(run)
    db.commit()
    try:
        final = build_graph(db).invoke({"run_id": run.id, "params": params, "trace": []})
        run.trace = final.get("trace", [])
        blocked = any(s["status"] == "blocked" for s in run.trace)
        run.status = "blocked" if blocked else "waiting_approval" if final.get("pending") else "completed"
        top = [db.get(Job, i) for i in final.get("top_ids", [])]
        run.summary = {
            "queries": final.get("queries", []), "jobs_found": len(final.get("job_ids", [])), "report": final.get("report", {}),
            "top": [{"id": j.id, "title": j.title, "company": j.company, "score": j.match_score, "region": j.region} for j in top if j],
            "interview": final.get("interview"), "pending_actions": final.get("pending", 0), "llm_provider": llm.provider,
        }
    except Exception as exc:  # noqa: BLE001
        run.status = "failed"
        run.trace = (run.trace or []) + [{"agent": "Orchestrator", "status": "failed", "message": f"{type(exc).__name__}: {exc}", "ms": 0, "detail": {}}]
    db.commit()
    return run
