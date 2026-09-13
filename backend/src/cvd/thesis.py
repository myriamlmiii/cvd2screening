"""
The CVD 2.0 investment thesis, as data.

This is the configuration that stage 3 (Qualification) checks against.
Keeping it here, versioned, means a thesis change is a reviewable diff,
not a code change scattered across the pipeline.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class Thesis(BaseModel):
    core_sectors: list[str] = Field(
        default_factory=lambda: ["Fintech", "InsurTech", "Cybertech"]
    )
    # Adjacent B2B software, only for exceptional opportunities.
    opportunistic_sectors: list[str] = Field(
        default_factory=lambda: [
            "DevTools",
            "Enterprise SaaS",
            "B2B SaaS",
            "HRTech",
            "LegalTech",
            "PropTech",
            "AI Infrastructure",
        ]
    )

    # Mandatory AI overlay: a deal must credibly match at least one of these.
    ai_keywords: list[str] = Field(
        default_factory=lambda: [
            "ai-native",
            "ai native",
            "agent",
            "agentic",
            "generative ai",
            "genai",
            "llm",
            "large language model",
            "nlp",
            "natural language",
            "computer vision",
            "machine learning",
            "predictive",
            "ml model",
            "ai infrastructure",
            "model evaluation",
            "ai security",
            "ai governance",
            "vector",
            "embedding",
            "foundation model",
        ]
    )

    # Priority geographies, roughly in order. Matching is substring / city-aware.
    priority_geographies: list[str] = Field(
        default_factory=lambda: [
            "Morocco", "Casablanca", "Rabat", "Marrakech", "Agadir",
            "United Kingdom", "UK", "London", "Manchester",
            "France", "Paris", "Lyon",
            "Germany", "Berlin", "Munich",
            "Netherlands", "Amsterdam",
            "Sweden", "Stockholm",
            "Estonia", "Tallinn",
            "Tunisia", "Egypt", "UAE", "United Arab Emirates", "KSA", "Saudi Arabia",
            "United States", "USA", "San Francisco", "New York", "Los Angeles",
            "Boston", "Seattle", "Miami", "Austin",
        ]
    )

    allowed_rounds: list[str] = Field(
        default_factory=lambda: [
            "pre-seed", "preseed", "pre seed",
            "seed", "seed+", "seed extension", "late seed",
            "pre-series a", "pre series a", "bridge",
            "safe", "convertible note", "convertible", "unpriced",
        ]
    )

    max_cumulative_raised_usd: float = 4_000_000
    max_clients: int = 100
    max_users: int = 100


DEFAULT_THESIS = Thesis()
