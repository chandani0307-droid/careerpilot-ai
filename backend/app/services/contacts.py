"""Optional HR contact lookup. Uses Hunter.io free tier if HUNTER_API_KEY is set; otherwise returns nothing.
We never guess email addresses."""
from __future__ import annotations

import httpx

from ..core.config import settings


def find_hr_emails(domain: str) -> list[dict]:
    if not (settings.hunter_api_key and domain):
        return []
    try:
        r = httpx.get("https://api.hunter.io/v2/domain-search", params={"domain": domain, "api_key": settings.hunter_api_key, "limit": 5, "department": "hr"}, timeout=settings.http_timeout)
        r.raise_for_status()
        return [{"email": e["value"], "name": f"{e.get('first_name') or ''} {e.get('last_name') or ''}".strip(), "position": e.get("position") or ""} for e in r.json().get("data", {}).get("emails", [])]
    except Exception:  # noqa: BLE001
        return []
