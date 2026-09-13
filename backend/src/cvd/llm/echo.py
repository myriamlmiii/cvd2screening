from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class EchoClient:
    """Deterministic stand-in for tests and offline dev."""

    def __init__(self, model: str = "echo"):
        self.model_name = model

    def structured(self, prompt: str, schema: type[T], *, system: str | None = None) -> T:
        return schema.model_construct()
