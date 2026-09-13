"""
Model-agnostic LLM interface. `enrich.py` and `score.py` depend on this
Protocol, never on a specific SDK — swapping Groq for another provider means
writing one new class here, not touching the pipeline.

Deliberately not a framework: one method, structured in, structured out.
"""

from __future__ import annotations

from typing import Protocol, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMClient(Protocol):
    model_name: str

    def structured(self, prompt: str, schema: type[T], *, system: str | None = None) -> T:
        """Call the model and return an instance of `schema`.

        Implementations should raise on invalid output rather than return a
        best-effort guess — callers decide whether to retry, not this layer.
        """
        ...
