"""
Runtime configuration, read from environment / .env.

Nothing here is validated as "required" at import time — a missing key
only breaks the one component that needs it, so `qualify` and `normalize`
run fine with zero configuration (useful for tests and for running the
pipeline in DRY_RUN before any keys exist).
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- LLM (Groq only) ---
    llm_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_scoring_model: str = "llama-3.3-70b-versatile"

    # --- Airtable ---
    # Defaults point at the real SITUATIONS base / PIPELINE table (same one
    # the frontend reads — see ../../lib/airtable.ts). Override for a
    # different base; airtable_table_name is only used by the write-back
    # sink (AirtableSink), the read side (AirtableSource) always reads
    # PIPELINE by table id.
    airtable_api_key: str = ""
    airtable_base_id: str = "appb9A3NOEb76UQaJ"
    airtable_table_name: str = "Deals"

    # --- Supabase (dashboard read model for scored deals) ---
    # Optional. When set, a scored run also upserts into the `scored_deals`
    # table (see ../../supabase/schema.sql) so the Next.js dashboard can
    # join real Airtable data with real scores without re-running the
    # pipeline on every page load. Never required for the pipeline itself
    # to run — failures here are logged, not fatal.
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # --- Behaviour ---
    dry_run: bool = True
    data_dir: str = "./data"
    snapshot_path: str = "./data/deals.json"


settings = Settings()
