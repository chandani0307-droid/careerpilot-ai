"""Pydantic request/response models."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Region = Literal["all", "india", "abroad", "remote"]
AppStatus = Literal["saved", "drafted", "applied", "interview", "offer", "rejected"]
ActionType = Literal["email", "linkedin", "apply"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProfileData(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    headline: str = ""
    summary: str = ""
    skills: list[str] = []
    experience_years: float = 0
    seniority: str = ""
    target_roles: list[str] = []
    education: list[str] = []
    current_location: str = ""
    preferred_regions: list[str] = []
    preferred_locations: list[str] = []
    strengths: list[str] = []
    gaps: list[str] = []
    suggestions: list[str] = []
    ats_score: int = 0
    ai_enhanced: bool = False


class ProfileOut(ORM):
    filename: str = ""
    updated_at: datetime | None = None
    data: ProfileData
    resume_chars: int = 0


class ProfilePatch(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    headline: str | None = None
    summary: str | None = None
    skills: list[str] | None = None
    target_roles: list[str] | None = None
    experience_years: float | None = None
    preferred_regions: list[str] | None = None
    preferred_locations: list[str] | None = None


class JobOut(ORM):
    id: str
    title: str
    company: str
    location: str
    region: str
    url: str
    apply_url: str
    linkedin_url: str
    hr_email: str
    description: str
    source: str
    tags: list[str]
    salary: str
    posted_at: str
    match_score: int
    match_reasons: list[str]
    missing_skills: list[str]
    ai_note: str
    saved: bool


class JobSearchIn(BaseModel):
    query: str = ""
    region: Region = "all"
    location: str = ""
    limit: int = Field(30, ge=1, le=100)


class JobSearchOut(BaseModel):
    jobs: list[JobOut]
    report: dict
    used_profile: bool


class ApplicationIn(BaseModel):
    job_id: str = ""
    title: str
    company: str = ""
    url: str = ""
    status: AppStatus = "saved"
    notes: str = ""


class ApplicationPatch(BaseModel):
    status: AppStatus | None = None
    notes: str | None = None
    cover_letter: str | None = None


class ApplicationOut(ORM):
    id: int
    job_id: str
    title: str
    company: str
    url: str
    status: str
    match_score: int
    notes: str
    cover_letter: str
    tailored_summary: str
    created_at: datetime
    updated_at: datetime
    applied_at: datetime | None = None


class ActionDraftIn(BaseModel):
    job_id: str
    type: ActionType


class ActionPatch(BaseModel):
    recipient: str | None = None
    subject: str | None = None
    body: str | None = None


class ApproveIn(BaseModel):
    confirm: bool = False
    recipient: str | None = None


class ActionOut(ORM):
    id: int
    type: str
    job_id: str
    title: str
    company: str
    recipient: str
    subject: str
    body: str
    target_url: str
    status: str
    result: dict
    run_id: int | None = None
    created_at: datetime
    updated_at: datetime


class AgentRunIn(BaseModel):
    goal: str = "Find and prepare the best jobs for me"
    query: str = ""
    region: Region = "all"
    location: str = ""
    top_k: int = Field(3, ge=1, le=8)
    min_score: int = Field(35, ge=0, le=100)


class AgentRunOut(ORM):
    id: int
    goal: str
    params: dict
    status: str
    trace: list[dict]
    summary: dict
    created_at: datetime


class ChatMsg(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatIn(BaseModel):
    messages: list[ChatMsg]


class InterviewIn(BaseModel):
    job_id: str = ""
    role: str = ""
    company: str = ""


class TailorIn(BaseModel):
    job_id: str
