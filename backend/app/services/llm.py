"""LLM access through LangChain with graceful degradation.

Providers: gemini (free key from Google AI Studio), ollama (local, free), mock (no AI).
Every method returns None on failure so callers can fall back to templates.
"""
from __future__ import annotations

import json
import logging
import re
import time

from ..core.config import settings

log = logging.getLogger("careerpilot.llm")


class LLM:
    def __init__(self) -> None:
        self.provider = settings.resolved_provider()
        self._model = None
        self.last_error = ""
        self._fails = 0
        self._pause_until = 0.0

    @property
    def available(self) -> bool:
        return self.provider != "mock" and time.time() >= self._pause_until

    def _get_model(self):
        if self._model is None:
            if self.provider == "gemini":
                from langchain_google_genai import ChatGoogleGenerativeAI

                self._model = ChatGoogleGenerativeAI(model=settings.gemini_model, google_api_key=settings.gemini_api_key, temperature=0.4, timeout=45)
            elif self.provider == "ollama":
                from langchain_ollama import ChatOllama

                self._model = ChatOllama(model=settings.ollama_model, base_url=settings.ollama_base_url, temperature=0.4)
        return self._model

    def complete(self, system: str, prompt: str) -> str | None:
        if not self.available:
            return None
        try:
            from langchain_core.messages import HumanMessage, SystemMessage

            out = self._get_model().invoke([SystemMessage(content=system), HumanMessage(content=prompt)])
            content = out.content
            if isinstance(content, list):
                content = "".join(c.get("text", "") if isinstance(c, dict) else str(c) for c in content)
            self._fails = 0
            self.last_error = ""
            return str(content).strip() or None
        except Exception as exc:  # noqa: BLE001 - we intentionally degrade on any provider error
            self.last_error = f"{type(exc).__name__}: {str(exc)[:200]}"
            log.warning("LLM call failed: %s", self.last_error)
            self._fails += 1
            if self._fails >= 3:  # stop hammering a broken/rate-limited provider for a minute
                self._pause_until = time.time() + 60
                self._fails = 0
            return None

    def json(self, system: str, prompt: str) -> dict | None:
        text = self.complete(system + "\nRespond with a single valid JSON object only. No markdown fences, no commentary.", prompt)
        if not text:
            return None
        text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
        try:
            data = json.loads(text)
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", text, re.S)
            if m:
                try:
                    data = json.loads(m.group(0))
                    return data if isinstance(data, dict) else None
                except json.JSONDecodeError:
                    pass
            self.last_error = "Model returned invalid JSON"
            return None


llm = LLM()
