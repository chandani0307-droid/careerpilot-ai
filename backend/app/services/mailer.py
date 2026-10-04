"""Sends email only when SMTP is configured; otherwise returns a mailto: link for the user to open themselves."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from ..core.config import settings


def mailto(to: str, subject: str, body: str) -> str:
    return f"mailto:{quote(to)}?subject={quote(subject)}&body={quote(body)}"


def send_or_link(to: str, subject: str, body: str) -> dict:
    if settings.smtp_configured and to:
        msg = EmailMessage()
        msg["From"] = settings.smtp_from or settings.smtp_user
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls()
            s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
        return {"mode": "smtp", "sent": True, "message": f"Email sent to {to}"}
    return {"mode": "mailto", "sent": False, "url": mailto(to, subject, body), "message": "SMTP not configured — opening your email app with the draft."}
