"""Offline templates used whenever no LLM is configured (or the LLM call fails)."""
from __future__ import annotations


def _name(p: dict) -> str:
    return (p.get("name") or "").strip() or "Candidate"


def _top(p: dict, n: int = 5) -> list[str]:
    return (p.get("skills") or [])[:n]


def profile_summary(p: dict) -> str:
    skills = ", ".join(_top(p, 6)) or "software development"
    yrs = p.get("experience_years") or 0
    role = (p.get("target_roles") or ["software professional"])[0]
    exp = f"{yrs:g}+ years of experience" if yrs else "early-career"
    return f"{role} with {exp}, working with {skills}. Looking for roles where I can ship reliable features and keep learning."


def tailor(p: dict, job: dict, missing: list[str] | None = None) -> dict:
    shared = [s for s in _top(p, 12) if s.lower() in (job.get("description", "") + " " + job.get("title", "") + " ".join(job.get("tags") or [])).lower()] or _top(p, 4)
    summary = f"{(p.get('target_roles') or ['Engineer'])[0]} with {p.get('experience_years') or 'hands-on'} years' experience in {', '.join(shared[:4])}, applying for {job.get('title')} at {job.get('company')}."
    bullets = [
        f"Lead with your strongest overlap for this role: {', '.join(shared[:4])}.",
        "Move the project that best matches this job's responsibilities to the top of your experience section.",
        "Add one metric per bullet (latency, users, revenue, time saved).",
    ]
    if missing:
        bullets.append(f"If you have honest experience with {', '.join(missing[:3])}, mention it; otherwise name it as something you are learning.")
    letter = (
        f"Dear Hiring Team at {job.get('company')},\n\n"
        f"I am excited to apply for the {job.get('title')} role. With {p.get('experience_years') or 'hands-on'} years of experience and strengths in "
        f"{', '.join(shared[:4])}, I can contribute quickly to your team.\n\n"
        f"In my recent work I have built and shipped features end to end, collaborated closely with product and design, and cared about code quality and measurable outcomes. "
        f"Your focus on {(job.get('tags') or [job.get('title')])[0]} is exactly the kind of problem I enjoy working on.\n\n"
        f"I would welcome the chance to discuss how I can help {job.get('company')}. Thank you for your time and consideration.\n\n"
        f"Sincerely,\n{_name(p)}"
    )
    return {"summary": summary, "bullets": bullets, "cover_letter": letter, "keywords": (shared + (missing or []))[:10]}


def email(p: dict, job: dict) -> dict:
    skills = ", ".join(_top(p, 3))
    return {
        "subject": f"{job.get('title')} – application from {_name(p)}",
        "body": (
            f"Hi there,\n\nI recently applied for the {job.get('title')} position at {job.get('company')} and wanted to reach out directly. "
            f"I have {p.get('experience_years') or 'hands-on'} years of experience with {skills}, which lines up well with the role.\n\n"
            f"I have attached my resume and would be glad to share more about relevant projects. Would you be open to a short conversation?\n\n"
            f"Best regards,\n{_name(p)}\n{p.get('email') or ''} {p.get('phone') or ''}".rstrip()
        ),
    }


def linkedin(p: dict, job: dict) -> str:
    msg = f"Hi! I'm a {(p.get('target_roles') or ['engineer'])[0]} ({', '.join(_top(p, 3))}) and just applied for {job.get('title')} at {job.get('company')}. Would love to connect and learn more about the team."
    return msg[:300]


def interview(p: dict, role: str, company: str, skills: list[str]) -> dict:
    sk = skills or _top(p, 5) or ["your core stack"]
    qs = [
        {"question": f"Walk me through your background and why you want the {role} role at {company}.", "type": "behavioral", "tip": "Keep it to 90 seconds: past → present → why this role."},
        {"question": "Describe a project you are most proud of. What was your specific contribution?", "type": "behavioral", "tip": "Use STAR: Situation, Task, Action, Result with a number."},
        {"question": "Tell me about a time you disagreed with a teammate. How did you resolve it?", "type": "behavioral", "tip": "Show you listened first and focused on the outcome."},
    ]
    for s in sk[:4]:
        qs.append({"question": f"How have you used {s} in production, and what trade-offs did you face?", "type": "technical", "tip": f"Prepare one concrete {s} example with a problem, a decision and a result."})
    qs.append({"question": f"Design a small service for {role.lower()} work: how would you structure data, APIs and failure handling?", "type": "system design", "tip": "Clarify requirements, sketch components, then discuss scaling and failure."})
    return {
        "questions": qs,
        "technical_topics": [f"{s} fundamentals and common pitfalls" for s in sk[:5]] + ["Data structures and algorithms basics", "Testing and debugging approach"],
        "star_stories": ["A project you shipped end to end", "A production incident you handled", "A conflict or tough feedback moment", "Something you learned quickly under pressure"],
        "questions_to_ask": [f"What does success look like in the first 90 days for this {role}?", "How does the team handle code review and releases?", "What are the biggest technical challenges right now?"],
    }


def chat(p: dict | None, text: str, stats: dict) -> str:
    t = text.lower()
    if not p:
        return "Upload your resume first (Resume page) and I can summarise it, find matching jobs and draft applications. Everything works offline with sample data, and gets smarter once a Gemini key is set in .env."
    if any(k in t for k in ("summar", "about me", "my resume", "profile")):
        return f"{profile_summary(p)}\n\nTop skills: {', '.join(_top(p, 8))}. ATS score: {p.get('ats_score', 0)}/100."
    if "skill" in t or "gap" in t:
        return f"Your skills: {', '.join(_top(p, 12))}. Run a job search and check Analytics → Skill gaps to see which in-demand skills you are missing."
    if any(k in t for k in ("job", "find", "search", "role", "opening")):
        return f"Go to Agent and click 'Run agent' — it searches India, abroad and remote boards, scores every job against your skills, and prepares drafts. You currently have {stats.get('jobs', 0)} jobs saved, {stats.get('high', 0)} with a 75+ match."
    if "interview" in t:
        return "Open Interview, pick a job (or type a role) and I'll generate technical, behavioural and system-design questions with answer tips."
    if "cover" in t or "email" in t or "linkedin" in t or "outreach" in t:
        return "Drafts for cover letters, HR emails and LinkedIn notes are created by the Agent. Review them in Outreach — nothing is sent until you approve it."
    if "ats" in t or "improve" in t:
        return "Resume tips: " + " ".join((p.get("suggestions") or ["Quantify achievements and keep 1–2 pages."])[:3])
    return f"I can summarise your resume, explain your match scores, suggest next steps ({stats.get('pending', 0)} approvals waiting) and prep you for interviews. What would you like to do?"
