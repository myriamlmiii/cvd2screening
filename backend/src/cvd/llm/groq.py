"""Groq adapter — OpenAI-compatible chat completions, JSON validated with Pydantic."""

from __future__ import annotations

import json
from typing import TypeVar

import httpx
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

T = TypeVar("T", bound=BaseModel)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqClient:
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        if not api_key:
            raise ValueError("GROQ_API_KEY is empty.")
        self._api_key = api_key
        self.model_name = model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=20))
    def structured(self, prompt: str, schema: type[T], *, system: str | None = None) -> T:
        system_text = (system or "You are a screening assistant.").strip()
        system_text += " Reply with JSON only. Do not invent facts. Use the provided schema."
        user = prompt + "\n\nJSON schema:\n" + json.dumps(schema.model_json_schema())
        res = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
            json={
                "model": self.model_name,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_text},
                    {"role": "user", "content": user},
                ],
            },
            timeout=60.0,
        )
        res.raise_for_status()
        data = res.json()
        text = data["choices"][0]["message"]["content"]
        return schema.model_validate_json(text)
