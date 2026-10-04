"""AI writing services. Each function tries the LLM first and falls back to offline templates."""
from __future__ import annotations

from . import fallbacks
from .llm import llm
from .resume_parser import analyze_heuristic

SYS = "You are CareerPilot, a precise, honest career coach. Never invent employers, degrees, metrics or skills the candidate does not have. Be concise and professional."


def _profile_brief(p: dict) -> str:
    return (f"Name: {p.get('name')}\nHeadline: {p.get('headline')}\nExperience: {p.get('experience_years')} years\n"
            f"Skills: {', '.join(p.get('skills') or [])}\nTarget roles: {', '.join(p.get('target_roles') or [])}\nSummary: {p.get('summary')}")


def _job_brief(j: dict) -> str:
    return f"Title: {j.get('title')}\nCompany: {j.get('company')}\nLocation: {j.get('location')}\nTags: {', '.join(j.get('tags') or [])}\nDescription: {(j.get('description') or '')[:1800]}"


def analyze_resume(text: str, filename: str = "") -> dict:
    profile = analyze_heuristic(text, filename)
    data = llm.json(SYS, "Analyse this resume. Return JSON with keys: headline (string, max 12 words), summary (string, 2-3 sentences, first person, only facts from the resume), "
                    "strengths (3-5 strings), gaps (2-4 strings), target_roles (2-4 realistic job titles), suggestions (3-6 concrete resume improvements).\n\nRESUME:\n" + text[:7000])
    if data:
        for key in ("headline", "summary"):
            if isinstance(data.get(key), str) and data[key].strip():
                profile[key] = data[key].strip()
        for key in ("strengths", "gaps", "target_roles", "suggestions"):
            val = data.get(key)
            if isinstance(val, list) and val:
                profile[key] = [str(v) for v in val][:8]
        profile["ai_enhanced"] = True
    if not profile["summary"]:
        profile["summary"] = fallbacks.profile_summary(profile)
    if not profile["strengths"]:
        profile["strengths"] = [f"Hands-on with {s}" for s in profile["skills"][:4]] or ["Add more skills to your resume"]
    if not profile["gaps"]:
        profile["gaps"] = ["Run a job search to see which in-demand skills you are missing"]
    return profile


def tailor_for_job(profile: dict, job: dict) -> dict:
    base = fallbacks.tailor(profile, job, job.get("missing_skills"))
    data = llm.json(SYS, "Tailor application material for this candidate and job. Return JSON with keys: summary (2 sentences, tailored professional summary), "
                    "bullets (3-5 suggestions on how to adjust the resume for this job, referencing real skills only), keywords (up to 10 ATS keywords from the job the candidate truly has), "
                    "cover_letter (150-220 words, plain text, no placeholders, signed with the candidate's name).\n\nCANDIDATE:\n" + _profile_brief(profile) + "\n\nJOB:\n" + _job_brief(job))
    if data:
        for key in ("summary", "cover_letter"):
            if isinstance(data.get(key), str) and len(data[key]) > 40:
                base[key] = data[key].strip()
        for key in ("bullets", "keywords"):
            if isinstance(data.get(key), list) and data[key]:
                base[key] = [str(v) for v in data[key]][:10]
        base["ai_enhanced"] = True
    return base


def draft_email(profile: dict, job: dict) -> dict:
    data = llm.json(SYS, "Write a short, polite cold email (90-130 words) from the candidate to a recruiter/HR contact about this job. Return JSON {\"subject\": str, \"body\": str}. "
                    "Plain text, no placeholders, mention 2 relevant strengths, ask for a brief chat, sign with the candidate's name.\n\nCANDIDATE:\n" + _profile_brief(profile) + "\n\nJOB:\n" + _job_brief(job))
    if data and isinstance(data.get("subject"), str) and isinstance(data.get("body"), str) and len(data["body"]) > 40:
        return {"subject": data["subject"].strip(), "body": data["body"].strip()}
    return fallbacks.email(profile, job)


def draft_linkedin(profile: dict, job: dict) -> str:
    text = llm.complete(SYS, "Write a LinkedIn connection note to a recruiter/hiring manager about this job. HARD LIMIT 280 characters. Friendly, specific, no hashtags, no placeholders. Output only the note.\n\nCANDIDATE:\n"
                        + _profile_brief(profile) + "\n\nJOB:\n" + _job_brief(job))
    return (text or fallbacks.linkedin(profile, job)).strip()[:300]


def interview_prep(profile: dict, role: str, company: str, skills: list[str], description: str = "") -> dict:
    base = fallbacks.interview(profile, role, company, skills)
    data = llm.json(SYS, "Create interview preparation. Return JSON with keys: questions (8-10 objects {question, type: behavioral|technical|system design, tip}), "
                    "technical_topics (5-8 strings), star_stories (4 strings describing stories the candidate should prepare), questions_to_ask (3-5 strings).\n\n"
                    f"ROLE: {role} at {company}\nJOB SKILLS: {', '.join(skills)}\nJOB DESCRIPTION: {description[:1500]}\n\nCANDIDATE:\n" + _profile_brief(profile))
    if data and isinstance(data.get("questions"), list) and data["questions"]:
        qs = [q for q in data["questions"] if isinstance(q, dict) and q.get("question")]
        if qs:
            base["questions"] = [{"question": str(q["question"]), "type": str(q.get("type", "technical")), "tip": str(q.get("tip", ""))} for q in qs][:12]
            for key in ("technical_topics", "star_stories", "questions_to_ask"):
                if isinstance(data.get(key), list) and data[key]:
                    base[key] = [str(v) for v in data[key]][:8]
            base["ai_enhanced"] = True
    return base


def assistant_reply(profile: dict | None, history: list[dict], stats: dict) -> str:
    last = history[-1]["content"] if history else ""
    convo = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-8:])
    ctx = _profile_brief(profile) if profile else "No resume uploaded yet."
    text = llm.complete(SYS + " You are the in-app AI Career Assistant. Answer in under 150 words. Offer concrete next steps inside the app (Resume, Jobs, Agent, Applications, Outreach, Interview, Analytics). "
                        "External actions (apply, email, LinkedIn) always need the user's approval in the Agent/Outreach pages.",
                        f"CANDIDATE CONTEXT:\n{ctx}\n\nAPP STATS: {stats}\n\nCONVERSATION:\n{convo}\n\nReply to the last USER message.")
    return text or fallbacks.chat(profile, last, stats)
