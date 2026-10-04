"""Central configuration. Everything comes from environment variables / .env — never hardcode keys."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")


def _list(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def _bool(value: str, default: bool = False) -> bool:
    if value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    app_name: str = "CareerPilot AI"
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL") or f"sqlite:///{BACKEND_DIR / 'careerpilot.db'}")
    cors_origins: list[str] = field(default_factory=lambda: _list(os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")))

    # LLM (all optional). provider: auto | gemini | ollama | mock
    llm_provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "auto").lower())
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    ollama_base_url: str = field(default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    ollama_model: str = field(default_factory=lambda: os.getenv("OLLAMA_MODEL", "llama3.1"))

    # Jobs
    job_providers: list[str] = field(default_factory=lambda: _list(os.getenv("JOB_PROVIDERS", "remotive,remoteok,arbeitnow,rss,adzuna")))
    job_rss_feeds: list[str] = field(default_factory=lambda: _list(os.getenv("JOB_RSS_FEEDS", "https://weworkremotely.com/categories/remote-programming-jobs.rss")))
    adzuna_app_id: str = field(default_factory=lambda: os.getenv("ADZUNA_APP_ID", ""))
    adzuna_app_key: str = field(default_factory=lambda: os.getenv("ADZUNA_APP_KEY", ""))
    adzuna_countries: list[str] = field(default_factory=lambda: _list(os.getenv("ADZUNA_COUNTRIES", "in,gb,us")))
    mock_fallback: bool = field(default_factory=lambda: _bool(os.getenv("MOCK_JOBS_FALLBACK", "true"), True))
    http_timeout: float = field(default_factory=lambda: float(os.getenv("HTTP_TIMEOUT", "8")))

    # Contacts / email (optional)
    hunter_api_key: str = field(default_factory=lambda: os.getenv("HUNTER_API_KEY", ""))
    smtp_host: str = field(default_factory=lambda: os.getenv("SMTP_HOST", ""))
    smtp_port: int = field(default_factory=lambda: int(os.getenv("SMTP_PORT", "587")))
    smtp_user: str = field(default_factory=lambda: os.getenv("SMTP_USER", ""))
    smtp_password: str = field(default_factory=lambda: os.getenv("SMTP_PASSWORD", ""))
    smtp_from: str = field(default_factory=lambda: os.getenv("SMTP_FROM", ""))

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    def resolved_provider(self) -> str:
        p = self.llm_provider
        if p == "auto":
            return "gemini" if self.gemini_api_key else "mock"
        if p == "gemini" and not self.gemini_api_key:
            return "mock"
        return p if p in {"gemini", "ollama", "mock"} else "mock"


settings = Settings()
