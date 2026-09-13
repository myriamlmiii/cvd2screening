# CVD 2.0 pipeline

Collect &rarr; Normalize &rarr; Qualify &rarr; Enrich &rarr; Score &rarr; Write back.
Every stage is a plain Python function over Pydantic models (`src/cvd/models.py`) —
no LangChain/LangGraph/CrewAI, no DAG framework. The pipeline is linear; a
framework would add ceremony without adding value at this scale.

## Why it's sequenced this way

Qualification (stage 3) runs **before** anything touches an LLM, and is
pure rules — no network call, no API cost, fully unit-tested
(`tests/test_qualify.py`). That's deliberate: it's the highest-leverage
piece of the whole system. Cheap, instant, and it's the part a GP will
actually ask "why did this get rejected" about, so every check produces a
human-readable reason, never a bare boolean.

Enrichment and scoring are two **separate** LLM calls, not one. That lets
each prompt be evaluated independently, and lets enrichment (extraction —
easy) run on a cheaper/faster model while scoring (calibrated judgment —
hard) uses a stronger one. See `.env.example` for the two model slots.

## Quickstart (no API keys needed)

```bash
python -m venv .venv
. .venv/Scripts/activate        # Windows; use `source .venv/bin/activate` elsewhere
pip install -e ".[dev]"

python scripts/seed_local.py    # writes data/raw_submissions.json, the same
                                 # 8 companies used in the frontend mock data

python -m cvd.cli --local-file ./data/raw_submissions.json --no-llm
# processed=8 qualified=5 rejected=3 errors=0
```

That run exercises Collect &rarr; Normalize &rarr; Qualify end to end with
zero configuration, writes `data/deals.json` (the dashboard's read
snapshot — see below), and `data/state.json` (idempotency: re-running
without clearing state processes 0 new records).

Run the tests:

```bash
pytest
```

## Turning on the LLM stages

1. Copy `.env.example` to `.env`.
2. Set `GROQ_API_KEY` in `.env` (same key as the Next.js app).
3. Then:

```bash
python -m cvd.cli --local-file ./data/raw_submissions.json
```

Enrichment and scoring will run for every qualified deal. Swapping Groq
for another provider later means writing one new class in `src/cvd/llm/`
that implements the `LLMClient` protocol (`structured(prompt, schema) ->
T`) — nothing in `enrich.py` / `score.py` changes.

## Wiring to real sources

- **Airtable**: fill `AIRTABLE_API_KEY` in `.env` (base defaults to the
  real SITUATIONS base, see `config.py`), then add `--airtable` to the
  CLI:

  ```bash
  python -m cvd.cli --airtable
  ```

  `src/cvd/sources/airtable_source.py` reads the SITUATIONS base's
  PIPELINE table directly by field id — the same field-id map as the
  dashboard's `../lib/airtable.ts`, so both sides stay in sync without
  guessing the base's (French) column labels. `AIRTABLE_TABLE_NAME` is a
  separate setting, only used by the write-back sink (`AirtableSink`).
  Every deal still goes through the real qualification thesis
  (`thesis.py`) — most of the 247 companies aren't AI-native
  Fintech/InsurTech/Cybertech, so most will land in `screening_stage =
  Rejected` with a reason, same as any other submission. That's the
  pipeline working as designed, not a bug.
- **Google Drive**: not implemented yet. The seam is `RawSubmission.deck_local_path`
  — a Drive source needs to download the file and set that field; everything
  after (docparse -> enrich) is already wired to consume it.
- **Decks**: `src/cvd/docparse.py` uses PyMuPDF, which only extracts real
  text layers well (good for Keynote/Pitch.com exports, weak for
  image-heavy or scanned decks). When that starts costing real deals,
  upgrade to `marker` or `docling` for the text layer, and add a
  multimodal fallback (render pages, send to the LLM) for decks that come
  back empty — see the docstring in that file.

## The dashboard's data

`src/cvd/cache.py` writes `data/deals.json` after every run — a local
snapshot, useful for debugging a run, but **the dashboard does not read
this file**.

Instead, when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set,
`src/cvd/supabase_sink.py` upserts every scored record into Supabase's
`scored_deals` table (`../supabase/schema.sql`) after each run, keyed on
`source_record_id` (the Airtable record id). The dashboard's three
Screening views (`../app/(app)/screening/*`) read that table with the
**anon** key and join it onto the real Airtable PIPELINE rows client-side
— see `../lib/supabase.ts` and `../lib/screening.ts`. This is optional:
without Supabase configured, the pipeline still runs and writes back to
Airtable exactly as before; the dashboard just shows "Not scored"
everywhere.

To turn it on:

```bash
# .env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Project Settings -> API -> service_role

python -m cvd.cli --airtable
```

Run `../supabase/schema.sql` in the Supabase SQL editor once, before the
first run.

A Supabase push failure is logged and never fails the run — Airtable
stays the system of record regardless.

## What's deliberately NOT here yet

- **Google Drive ingestion** — the seam exists, the source doesn't.
- **A signals/delta layer** (headcount, traffic, hiring, GitHub velocity
  changes on a watchlist). This is a separate, continuous component from
  deck ingestion and is where "catch deals before other funds" actually
  comes from — budget for it as a real v1.1, not an afterthought.
- **Always-on webhook endpoint.** v1 is designed to run as a scheduled job
  (GitHub Actions, cron, Task Scheduler — `cvd-pipeline` is a plain CLI).
  If the website-submission path needs to react in seconds rather than
  minutes, that's one small always-on endpoint (Railway/Fly.io, ~$5/mo)
  catching an Airtable automation webhook — not a worker fleet.
- **Entity resolution / dedup** across sources. `normalize.py` derives a
  stable id per source record (domain-based where possible); the same
  company arriving from two sources today gets two ids. Fine at v1 volume;
  revisit with `rapidfuzz` + a small embedding index once duplicates
  actually start showing up.

## Layout

```
src/cvd/
  config.py           settings from env (pydantic-settings)
  thesis.py           the investment thesis, as data
  models.py           every Pydantic schema the pipeline passes around
  normalize.py         RawSubmission -> NormalizedDeal
  qualify.py           rules-based stage 3 (no LLM) — the important one
  docparse.py          deck PDF -> text
  enrich.py            stage 4, LLM call #1 (extraction)
  score.py             stage 5, LLM call #2 (calibrated judgment)
  llm/
    base.py             LLMClient protocol
    groq.py             Groq adapter
    echo.py             EchoClient for offline dev
    prompts.py          the two prompt templates
  sources/
    base.py             Source protocol
    manual.py            local JSON source (dev/tests)
    airtable_source.py   real Airtable read
  airtable_sink.py      write-back (upsert on Deal Id)
  supabase_sink.py      optional: push scored deals to Supabase for the dashboard
  cache.py              local JSON snapshot (debugging only, dashboard doesn't read it)
  state.py              local idempotency + last-known-record store
  pipeline.py           orchestrates all of the above
  cli.py                `cvd-pipeline` entry point
scripts/
  seed_local.py         writes the 8 example companies as raw submissions
tests/
  test_qualify.py       the golden cases — extend this before anything else
  test_normalize.py
  test_models.py        composite score / recommendation-band math
```
